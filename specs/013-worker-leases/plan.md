# Implementation Plan: 多实例领取
## Technical Context
Java21/MyBatis/MySQL8.4、共享文件卷、每进程单worker，V14扩展job_runtime租约字段，无新增运行依赖。
## Constitution Check
I～V通过；本轮授权执行架构，串行TDD/独立故障验收，不在原3000强杀。复杂度限制为数据库短事务行锁、一个续租定时器和线程上下文。
## Design
LeaseGuard.claim使用READ_COMMITTED短事务先锁job，再确保runtime行；仅QUEUED且无有效租约可领取，DB CURRENT_TIMESTAMP(6)判断时效，generation加1、owner为进程随机UUID。默认租约15000ms，最小3000ms，周期lease/3续期；续期必须owner/gen/未过期/未终态匹配，不能复活。
worker先recoverExpired(id)，再claim、ThreadLocal Scope绑定代次。PipelineState.start/resume/complete/fail/retry在job锁内检查owner/gen/期限；直接状态测试只兼容generation=0裸fixture。cancel为用户授权独立终止，不需要worker令牌。recoverUnfinished改为逐个只处理过期或legacy无租约RUNNING；扫描包括到期RUNNING和未被租约占用的到期QUEUED。重启不重置其他实例租约。
release只清除匹配代次期限，保留owner/gen用于内核审计，不修改后继。线程失去租约可能继续计算，但提交被拒绝；ResultStore每次发布用随机UUID.png，旧线程只清理自身产物，不能覆盖胜者。012断点同事务受fence保护。
领取、续租、状态提交均先锁job再操作runtime，避免续租与开始执行时反向持锁。排队尚未领取期间的数据库故障不消耗无法持久记账的执行预算；已领取后配置读取错误仍计预算。
领取可用时刻和退避也使用数据库时钟，测试将调用线程Instant.now快进两小时，仍不得抢跑数据库中一小时后的任务。
取消可能嵌套在批次事务中，断点文件清理必须等最外层提交；回滚取消后保留原标记/文件，不能在内层事务返回时提前删除。
提交后终态清理以REQUIRES_NEW独立事务删除登记，避免依赖afterCommit阶段仍绑定的旧连接隐式提交。
## Verification
LeaseTest先空claim行为RED（12并发只应1）；ResultStore同job多次发布名不同先RED。领取实现后测试过期接管、启动保护、过期不续租、旧状态写/断点拒绝与取消，观察状态未fence导致RED，再接线GREEN。完整回归后独立双backend共享卷，任务分布两实例、强杀持租实例后接管、每代次阶段合法，远端CI。
## Complexity Tracking
不使用SKIP LOCKED也可按任务行锁原子CAS，避免锁等待事务扩大；本地队列可能重复排入同ID，但只有有效租约能执行/提交。不保证物理计算恰好一次或线性扩容。

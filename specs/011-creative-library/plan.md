# Implementation Plan
## Summary / Technical Context
沿用Next16/React19/TS与Java21/Spring Boot/MyBatis/MySQL、单worker。四个故事依次实现，不新增外部服务。迁移V8文件审计、V9批次、V10标签、V11账号/会话、V12标签精确比较；已执行迁移不回写。
## Constitution Check
约章1.1.0为用户授权本地账号/安全清理明确边界；Java掌握业务/事务，保持TDD与容器执行、身份隔离和单智能体串行。设计前后通过，无额外复杂度例外。
## Design
- 文件：只识别UUID图片/项目.part，24h冷却；所有登记asset、成功result、活动结果保护；快照SHA256，POST确认重扫快照，不跟随符号链接。隔离到.quarantine/{auditId}，事务失败补偿移动；7天后清理先持久DELETING再删文件再PURGED，失败可重复完成，审计不可抹去。
- 批次：batch(owner,key)唯一+内容摘要，owner锁后创建；外层READ_COMMITTED事务复用单项受理，修改调度为TransactionSynchronization.afterCommit，整批校验/配额失败零调度。GET只汇总子任务；逐项终态保持。
- 作品：job_tag关联，标签NFKC/trim/小写去重排序；bulk先排序锁住全部本人job，事务更新；ZIP最多20项/64MiB原图总量，先全归属/状态校验，UUID文件名避免路径注入。
- 账号：用户名唯一绑定demo_user；identity_session从旧token_hash回填，UserMapper查会话/过期/撤销，多设备保持owner不变。密码PBKDF2WithHmacSHA256 600000次、随机16字节salt；恢复码32随机字节、仅SHA256落库，一次重置后轮换并撤销全部旧会话。匿名会话365天、登录30天。认证失败5次/15分钟持久限流。
- 迁移：登录显式mergeGuest；锁源/目标user并用全局受理锁，源有活动任务409，已绑定源账号409，job_request或batch key碰撞409，全部事务回滚；更新asset/job/batch/receipt owner并撤销源全部会话。本地草稿不跨设备迁移，不承诺合并活跃任务。
- UI沿用现有组件/风格，新增/batches和/account；批次复用UploadSlots/JobTracker/JobCards；History选择已加载作品最多50、批量操作/标签和ZIP；敏感恢复码只在组件内存显示，保存后用户继续，不写存储。
## Structure
backend/src/main/java/com/materialstudio/{storage,batch,identity,job}；frontend/src/features/{batches,identity,jobs}；新页面/batches、/account；V8～V12迁移；scripts/verify-011.mjs；docs/011-validation.md。
## Verification
各故事真实RED→最小GREEN→相关回归后提交；最终全量前后端、独立空卷/迁移/故障/桌面375px、公开仓库CI。文件清理/认证/迁移只用独立生成的测试数据，原3000数据卷不做清理验收。

远端检查发现HistoryApiTest的只读断言与真实后台扫描并发：裸QUEUED fixture缺执行配置，被worker改为PIPELINE_FAILED。查询测试替换JobDispatcher，保持完整HTTP/MySQL路径并断言查询不调度；后台执行/扫描行为仍由独立执行器测试覆盖，不放宽数据不变断言。

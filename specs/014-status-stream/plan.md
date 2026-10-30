# Implementation Plan: SSE快照与回退
## Technical Context
Spring MVC SseEmitter、Next同源流代理、React JobTracker；无新增依赖/SQL迁移。每后台从共享MySQL读取，可任意实例处理订阅。
## Constitution Check
I～V通过；只读状态通道、Cookie归属、请求/执行错误分离、终态/身份隔离保持。单智能体串行TDD，不部署消息代理。用户授权第10项第三独立增量。
## Backend Design
GET /api/jobs/stream?ids=UUID,UUID 最多50唯一小写规范UUID；先SessionService.require，再JobMapper.ownedMany一次查询全归属，不足全404。SseEmitter初次立即jobs快照，之后每1000ms比较JobView列表，只变化才发送；每10s heartbeat事件；周期重新校验捕获Cookie会话，不可用发expired后完成。最新快照而非历史事件重放，不依赖Last-Event-ID。
JobStreamService两个定时线程，最多每进程64连接/每owner2；超限429 STREAM_LIMITED，不影响原GET。默认55s寿命，emitter超时再加5s；全部终态立即关闭。完成/错误/超时/发送失败/关闭均原子幂等回收map及future，处理先回收后future赋值竞争。测试属性interval50ms/duration3000ms/global3/user2，心跳min(10s,duration/3)。单进程计数，不声称跨进程全局限额。
ApiErrors明确application/json，防Accept:text/event-stream影响错误序列化。代理已透传upstream.body及request.signal，无缓冲；仅补x-accel-buffering透传与明确stream GET白名单，不暴露actuator。
## Frontend Design
JobTracker.reconcile合并无查询错误的活动任务至一个EventSource；运行时无EventSource则原轮询。集合变化关闭旧源并新建，校验每帧items全为预订ID且完整/无重复、符合isJob，继续seed的version/terminal保护。回调捕获epoch和source身份，旧源完全忽略。
stop/expire清source/watchdog及原timer/request；jobs或heartbeat刷新20s watchdog，error/unavailable/无效帧/静默触发关闭源并立即逐项GET补查，随后使用现有1s不重叠轮询。expired清空私有状态。失败后此生命周期保持轮询，用户恢复查询或重开页面可重新尝试SSE；不让EventSource原生无界重连。每项查询错误仍独立暂停，业务状态不改FAILED。
默认有能力即SSE，不需新增用户设置；JobTracker单个轮询schedule在有source时禁用。API请求不重发POST。服务端只减少HTTP请求，仍周期查MySQL；发送线程与worker/lease续租线程隔离，不承诺推送生产SLA。
## Verification
JobStreamApiTest先404 RED：初次/版本/终态、认证/非法/越权、限额和关闭回收、撤销expired。Java HTTP InputStream读取SSE帧，测试寿命限定以免挂起。frontend stream.test.ts FakeEventSource测试两任务一源、旧版本/旧源忽略、终态清理、身份失效、断线补查独立错误、无效帧和20s watchdog；proxy测试验证数据逐块不缓存和Abort信号/头，先RED再GREEN。
最终全量容器、独立014真实Next代理数据流/撤销/断连与普通查询并存、浏览器桌面375px实际制作跟踪；保留卷升级原3000仅健康核对，临时项目down保留卷，最终远端CI。
交付兼容复查覆盖完成已提交但确认丢失：worker只清理未登记结果，数据库已指向的PNG必须保留；用完成真实提交后抛瞬时异常模拟确认丢失，不将终态改写或重做。
## Complexity Tracking
使用现有Servlet异步，无WebFlux/广播系统。慢客户端可能耗发送线程，连接数/寿命/watchdog限制影响并可回退；不把这称作高并发生产推送总线。

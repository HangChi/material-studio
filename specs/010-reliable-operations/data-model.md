# Data Model
- admission_lock: id=1的唯一行，仅事务串行受理；不含身份或计数缓存。
- 未完成=QUEUED/RUNNING；全局上限100、本人上限20；每访客滚动60秒新任务上限10，配置值均为正整数。
- 状态与事件沿用008，调度暂不可用不变更QUEUED；重试上限不变。
- 监控：状态计数、取消单列；失败率=非取消FAILED/(SUCCEEDED+非取消FAILED)，无样本为0。
- 排队耗时：创建到首次ASSET_CHECK/STARTED；阶段耗时：同任务相邻执行事件STARTED→COMPLETED（允许管理属性引起version跳号）且stage相同的已完成样本，毫秒。中断/失败的未完成阶段不纳入均值。
- retries=所有job_runtime中max(attempt_count-1,0)之和，含重启执行；scanFailures与lastScanSuccess属于本进程，重启清零。

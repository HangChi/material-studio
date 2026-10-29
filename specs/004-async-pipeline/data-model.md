# 004数据模型

沿用job/asset/job_asset，新增两表（V3），已有003终态保持不变。

- job_execution：job_id主键/FK；fail_stage可空且只能ASSET_CHECK/GENERATE/FINALIZE；check_ms/generate_ms/finalize_ms非空整数，范围0～10000，默认2000。
- job_event：job_id FK + version复合主键；stage可空枚举；kind为STARTED/COMPLETED/FAILED/INTERRUPTED；created_at非空；message非空最长500。按version升序返回，不含owner/磁盘路径。
- job.version初始0，每次进入、完成、失败或中断加1；同事务插入对应version事件。
- 正常状态：QUEUED/null→RUNNING/ASSET_CHECK→RUNNING/GENERATE→RUNNING/FINALIZE→SUCCEEDED/FINALIZE；每阶段各一个STARTED和COMPLETED事件，成功恰6条事件/version6。
- 任一阶段异常：FAILED/失败阶段/error/finished_at，不得进入后续阶段；完成前无resultUrl。
- 队列拒绝：沿用003 FAILED/null/QUEUE_REJECTED/version1，无阶段事件（未执行）。
- 重新启动/关闭：所有非终态→FAILED/原stage/PROCESS_INTERRUPTED并添加INTERRUPTED；终态不变。不自动续跑。
- 结果磁盘路径仅后端可见，UUID.png最长80；成功需文件完整存在后才能写result_path。失败清理临时/结果文件；强杀可留孤儿，不自动清理。

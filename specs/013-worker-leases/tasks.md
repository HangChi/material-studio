# Tasks: 多实例租约
## Setup
- [x] T001 specs/013-worker-leases规格、设计、契约与16项质量检查通过，承接012的已通过CI。
## US1 / 唯一领取
独立标准：12并发1领取成功；同job发布不同路径。
- [x] T002 [US1] backend/src/test/java/com/materialstudio/job/LeaseTest.java与ResultStoreIsolationTest.java先观察claim缺失与结果覆盖RED，最小编译stub不记完成。
- [x] T003 [US1] backend/src/main/java/com/materialstudio/job/LeaseGuard.java、ExecutionMapper.java、ResultStore.java及V14实现lease_owner36位/代次>=0/默认15000ms最小3000ms/唯一发布，定向GREEN。
## US2 / 过期接管与写隔离
独立标准：存活不重置，过期不复活，旧代次开始/完成/重试/失败无效。
- [x] T004 [US2] backend/src/test/java/com/materialstudio/job/LeaseTest.java先RED覆盖旧代次、启动恢复保护和取消，不放宽原状态断言。
- [x] T005 [US2] backend/src/main/java/com/materialstudio/job/{PipelineState,PipelineWorker,BackgroundJobDispatcher,ExecutionMapper}.java接入fence/续租/过期扫描，compose.yaml增加配置，GREEN及旧回归。
## Delivery
- [x] T006 scripts/verify-013.mjs与docs/013-validation.md完成独立双backend共享卷、唯一执行/强杀接管与全量检查。
- [x] T007 README.md、docs/roadmap.md、docs/async-workflow.md、docs/work-log.md同步真实结果，提交推送并核对远端CI。

T001→US1→US2→交付；7任务、每故事2项。严格串行，无委派或并行代理；各GREEN增量提交，后续014单独立项。

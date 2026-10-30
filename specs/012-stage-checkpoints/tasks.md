# Tasks: 阶段断点续跑
## Setup
- [x] T001 完成specs/012-stage-checkpoints规格/计划/契约/质量检查与约章范围同步。
## US1 / MVP
独立验收：整理暂时失败后的第二次执行不重复合成。
- [ ] T002 [US1] backend/src/test/java/com/materialstudio/job/CheckpointTest.java添加合成复用行为，观察调用两次的RED。
- [ ] T003 [US1] backend/src/main/java/com/materialstudio/job/{CheckpointMapper,CheckpointStore,PipelineState,PipelineWorker}.java及V13实现输入64字符摘要、两阶段标记、原子PNG与RESUMED，完成GREEN。
## US2
独立验收：丢失/损坏/输入变化重算，取消及事务失败不复用。
- [ ] T004 [US2] backend/src/test/java/com/materialstudio/job/CheckpointTest.java先RED覆盖三类失效、事务原子与取消。
- [ ] T005 [US2] backend/src/main/java/com/materialstudio/job/CheckpointStore.java完成回退/终态清理/路径保护并GREEN，旧恢复/阶段测试回归。
## Delivery
- [ ] T006 scripts/verify-012.mjs与docs/012-validation.md记录完整容器检查、独立卷SIGKILL/原编号恢复和未重复合成证据。
- [ ] T007 README.md、docs/roadmap.md、docs/async-workflow.md、docs/work-log.md同步，提交/推送并验证远端CI。

依赖T001→US1→US2→交付；共7任务，US1两项、US2两项。严格串行，无并行委派。每个可审阅GREEN增量提交，不提交RED。012后分别立项013租约/执行代次与014 SSE，不能以规划替代实现。

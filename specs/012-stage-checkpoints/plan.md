# Implementation Plan: 阶段断点
## Technical Context
沿用Java21/Spring Boot3.5/MyBatis/MySQL8.4与文件卷，无依赖变动；前端展示既有执行事件。V13新增job_checkpoint(job,stage)最多两行。
## Constitution Check
I规格追踪、II先RED、III后台执行、IV归属及终态、V容器/简单交付均通过。用户第10项明确授权恢复升级；单智能体串行，原卷不做故障验收。
## Design
CheckpointStore计算render-v1、模板、配方JSON、排序assetID及原图SHA256的SHA256；检查素材可用。文件只在/data/.checkpoints，随机UUID.png原子发布，拒绝符号链接；数据库存GENERATE产物SHA256。ASSET_CHECK不含产物。
PipelineState.complete重载在同一事务登记checkpoint和完成事件；worker执行前选最新有效断点，GENERATE加载并校验PNG，失效则回退ASSET_CHECK；输入变化全部重做。PipelineState.resume锁任务，领取执行预算，写RESUMED事件；下一阶段接受RESUMED前驱。普通首次流程保持。
成功/终态后仅清理该任务登记产物与行；未登记文件留待后续维护盘点，不擅自删除不认识文件。重启保留中间产物。取消/事务拒绝清理本次未登记产物。后续租约增量需将清理和发布纳入执行代次。
同一完成事务替换旧断点后，afterCommit清理旧产物；文件维护增加.checkpoints目录和checkpoint-*.part识别，保护job_checkpoint登记路径。沿用24h/隔离7天及快照确认规则，原卷不执行清理验收。
## Structure
backend/job/CheckpointMapper.java、CheckpointStore.java、PipelineState.java、PipelineWorker.java、V13迁移；CheckpointTest.java；scripts/verify-012.mjs；docs/012-validation.md。
## Verification
先Spy合成器观察整理失败后的重复调用RED，再覆盖丢失/损坏/源变化、完成事务失败不登记、取消清理。容器GREEN及旧回归后提交。真实独立卷在GENERATE已完成、FINALIZE开始后SIGKILL，恢复应仅一次GENERATE STARTED及RESUMED事件；不故障注入原3000。
## Complexity Tracking
增加持久标记和PNG避免重复合成；不引入工作流引擎、Redis或消息队列。无生产容量数据，不宣称吞吐改善，以计算调用次数验收。

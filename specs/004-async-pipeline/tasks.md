# Tasks: 004异步流水线

单智能体串行；无[P]任务。所有测试在Docker内运行并记录真实RED/GREEN。

## Phase 1 · Setup

- [x] T001 细化 specs/004-async-pipeline/spec.md、plan.md、research.md 与 contracts/http-api.md，通过约章检查。
- [x] T002 在 specs/004-async-pipeline/data-model.md、quickstart.md、tasks.md 定义状态/事件事务与验证入口。

## Phase 2 · Foundation / US1准备

- [x] T003 在 backend/src/test/java/com/materialstudio/job/PipelineApiTest.java 编写无查询执行、六阶段事件、私有结果、顺序和写盘失败测试，观察RED。
- [x] T004 在 backend/src/main/resources/db/migration/V3__pipeline.sql 定义job_execution和job_event；“fail_stage可空且只能ASSET_CHECK/GENERATE/FINALIZE”，“耗时非空整数0～10000，默认2000”；事件“message非空最长500”，版本复合主键。

## Phase 3 · US1 独立后台制作

独立验证：无查询执行完成，六事件顺序/终态版本稳定；失败停止；私有PNG可读取。

- [x] T005 [US1] 在 backend/src/main/java/com/materialstudio/job/PipelineState.java、EventMapper.java 实现行锁、状态和事件同事务，终态禁止回退。
- [x] T006 [US1] 在 backend/src/main/java/com/materialstudio/job/PipelineWorker.java、ResultStore.java 执行三阶段与原子结果落盘；写盘成功才保存SUCCEEDED，失败清理。
- [x] T007 [US1] 在 backend/src/main/java/com/materialstudio/job/BackgroundJobDispatcher.java 接入单线程有界队列16和AbortPolicy；替换003占位处理器，受理不等待。
- [x] T008 [US1] 在 backend/src/main/java/com/materialstudio/job/JobController.java 增加归属校验的events/result GET，已有查询只读；更新 DefaultDispatcherTest.java 验证真实处理器。

## Phase 4 · US2 可重复失败与耗时

独立验证：三个失败阶段均中断，两个任务各自配置生效；非法配置无任务写入。

- [x] T009 [US2] 在 backend/src/test/java/com/materialstudio/job/PipelineApiTest.java 增加三阶段失败、0/10000边界、默认2000、非法值与任务隔离测试，观察RED。
- [x] T010 [US2] 在 backend/src/main/java/com/materialstudio/job/Simulation.java、JobSubmissionService.java 实现任务级参数验证与同受理事务存储，范围0～10000，默认2000；application.yml拒绝非整数。

## Phase 5 · Reliability

- [x] T011 在 backend/src/test/java/com/materialstudio/job/PipelineLifecycleTest.java 验证队列满、工作线程非请求线程、重启中断/终态不变与重复执行，观察RED。
- [x] T012 在 backend/src/main/java/com/materialstudio/job/BackgroundJobDispatcher.java、PipelineState.java 完成启动/关停中断与拒绝门禁，通过可靠性测试。

## Phase 6 · 页面与交付

- [x] T013 在 frontend/src/lib/submission-proxy.test.ts、frontend/src/features/jobs/submission.test.tsx 增加events/result白名单、中文阶段/私有图片/查询错误保留测试，观察RED。
- [x] T014 在 frontend/src/lib/api-proxy.ts、frontend/src/features/jobs/SubmissionForm.tsx 实现相应展示，通过前端测试；本期不轮询。
- [x] T015 执行 compose.yaml 的完整前后端测试/构建，更新 docs/work-log.md RED/GREEN与异常证据。
- [x] T016 在 scripts/verify-004.mjs 完成真实接口成功/失败/多任务与重启验证，浏览器核对结果与小屏。
- [x] T017 更新 README.md、docs/roadmap.md 与 specs/004-async-pipeline/quickstart.md 的完成范围/限制/模拟方法，完成需求追踪与提交。

## Dependencies and strategy

T001→T002→T003→T004～T008（MVP）→T009/T010→T011/T012→T013/T014→T015～T017。
测试先于对应行为实现；同文件顺序处理。US2依赖US1；无并行智能体。所有完成项须以行为证据勾选。

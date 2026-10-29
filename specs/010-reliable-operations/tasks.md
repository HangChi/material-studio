# Tasks: 制作可靠性与交付验证
串行；沿用仓库TDD，不使用子智能体。

## Setup
- [x] T001 编写specs/010-reliable-operations/spec.md及checklists/requirements.md，规格7/7通过。
- [x] T002 完成specs/010-reliable-operations/plan.md、research.md、data-model.md、contracts/http-api.md与quickstart.md。

## US1 · 验证基线
- [x] T003 [US1] 独立空卷启动并运行scripts/verify-008.mjs，记录docs/010-validation.md。
- [x] T004 [US1] 审查历史公开文件、创建公开仓库，运行.github/workflows/ci.yml并记录真实结果。
- [ ] T005 [US1] 浏览器真实双标签/高对比验证，记录docs/010-validation.md。

## US2 · 身份确认
- [x] T006 [US2] frontend/src/features/identity/session.test.tsx新增取消/确认/重复操作测试并观察RED。
- [x] T007 [US2] frontend/src/features/identity/SessionGate.tsx实现原生确认并验证GREEN，更新其他切换测试。

## US3 · 模板一致
- [x] T008 [US3] frontend/src/features/jobs/template-filter.test.tsx覆盖新增模板/请求失败恢复/卸载清理并观察RED。
- [x] T009 [US3] frontend/src/features/jobs/History.tsx实现动态模板选项与错误重试，验证GREEN。

## US4 · 持久受理
- [x] T010 [US4] backend/src/test/java/com/materialstudio/job/{AdmissionPolicyTest,JobSubmissionTest,PipelineLifecycleTest,PersistedBacklogTest}.java验证队列满仍等待、六项完成一次、全局100/本人20未完成及60秒10项（测试覆盖小值）、幂等回放/并发/回滚，观察RED。
- [x] T011 [US4] backend/src/main/resources/db/migration/V7__admission_lock.sql、job/AdmissionPolicy.java与JobSubmissionService.java实现正整数配置/数据库事务限额，BackgroundJobDispatcher.java保留持久等待，验证GREEN。
- [x] T012 [US4] compose.yaml、.env.example与scripts验证入口同步配额与新受理语义。

## US5 · 内部监控
- [x] T013 [US5] backend/src/test/java/com/materialstudio/job/OperationsTest.java覆盖统计样本/取消/重试/扫描错误及frontend/src/lib/api-proxy.test.ts隔离，观察RED。
- [x] T014 [US5] backend/src/main/java/com/materialstudio/job/{OperationsMapper,OperationsEndpoint}.java和QueueScanMonitor.java/BackgroundJobDispatcher.java实现内部只读统计，仅Java容器网络可达，验证GREEN。

## Delivery
- [ ] T015 scripts/verify-010.mjs、docs/010-validation.md补充真实排队/配额/监控验收；容器全量前后端回归与生产重建。
- [ ] T016 README.md、docs/roadmap.md、docs/acceptance.md、docs/async-workflow.md与docs/work-log.md同步，提交推送并确认最新远端CI。

依赖：T001→T002→T003/T004基线→T006/T007→T008/T009→T010～012→T013/T014→T005/T015/T016最终验收。CI等待期间仅处理同一执行者的独立工作，所有源码/TDD串行。US2是最小用户可见增量；本次授权包含全部五项，不以US2完成结束。

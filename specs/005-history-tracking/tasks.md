# Tasks: 005个人历史与多任务跟踪

单智能体串行，不使用[P]委派；容器TDD，每个行为观察真实RED再实现。

## Phase 1 · Setup

- [x] T001 细化 specs/005-history-tracking/spec.md、plan.md、research.md，完成约章前后检查。
- [x] T002 完成 specs/005-history-tracking/data-model.md、contracts/http-api.md、quickstart.md、tasks.md 的边界与依赖。

## Phase 2 · US1 本人历史

独立验证：分页覆盖所有本人记录/同时间稳定次序，空态/身份隔离/非法输入；刷新恢复活动集合。

- [x] T003 [US1] 在 backend/src/test/java/com/materialstudio/job/HistoryApiTest.java 编写分页、插入稳定性、active归属与只读测试，观察RED。
- [x] T004 [US1] 在 backend/src/main/java/com/materialstudio/job/HistoryService.java、JobMapper.java、JobController.java 实现“limit整数1～50、默认20”，“cursor可空本人UUID（36字符）”；不新增schema。

## Phase 3 · US2 可靠多任务跟踪

独立验证：三任务独立/乱序、503只暂停查询、恢复/终态/卸载/换身份清理与两周期无多余请求。

- [x] T005 [US2] 在 frontend/src/features/jobs/tracker.test.ts 编写fake timer与延迟响应测试，观察RED。
- [x] T006 [US2] 在 frontend/src/features/jobs/JobTracker.ts、useJobTracker.ts 实现每任务一个timer/controller，1秒非重叠查询，“version非负安全整数”，“status限QUEUED/RUNNING/SUCCEEDED/FAILED”；终态不回退、旧请求无效。
- [ ] T007 [US2] 在 frontend/src/features/identity/session.test.tsx 编写切换中立即隐藏/请求清理/失败恢复用例，观察RED。
- [ ] T008 [US2] 在 frontend/src/features/identity/SessionGate.tsx 实现身份生命周期，切换先卸载旧视图，失败不回显旧数据。

## Phase 4 · US1/US2 页面整合

- [ ] T009 [US1] 在 frontend/src/features/jobs/history.test.tsx 编写历史空态/恢复/分页错误/成功预览/active旧页测试，观察RED。
- [ ] T010 [US1] 在 frontend/src/features/jobs/History.tsx、JobCards.tsx 与 frontend/src/app/history/page.tsx 实现记录页、去重分页、逐卡查询恢复；layout.tsx加入导航，globals.css实现小屏单列。
- [ ] T011 [US2] 在 frontend/src/features/jobs/submission.test.tsx 增加受理后自动跟踪与独立多任务集成断言，观察RED。
- [ ] T012 [US2] 在 frontend/src/features/jobs/SubmissionForm.tsx 复用SessionGate/JobTracker/JobCards，保留003未知提交核对门禁。

## Phase 5 · 完整交付

- [ ] T013 执行 compose.yaml 全量前端lint/typecheck/test/build与后端verify；审查 .github/workflows/ci.yml 保留push/PR关键检查，记录 docs/work-log.md。
- [ ] T014 在 scripts/verify-005.mjs 运行真实历史分页/活动/多任务/私有结果与身份切换验收；浏览器核对自动更新、刷新、空态和375px。
- [ ] T015 在 docs/acceptance.md 完成R01～14源码/测试/运行证据，更新 README.md、docs/roadmap.md、specs/005-history-tracking/quickstart.md，按commit完整交付。

## Dependencies / strategy

T001→T002→US1后端T003/T004→US2核心T005～T008→页面T009～T012→T013～T015。US1页面依赖US2跟踪核心；所有测试先于对应实现。无并行智能体。
最小可验收增量为后端分页，其次核心生命周期，再页面闭环；每个GREEN逻辑增量及时提交。

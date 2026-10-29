# Tasks: 制作工作台拓展

输入：spec.md/plan.md/data-model.md/contracts/http-api.md。全部串行、TDD；每个故事可独立验收。

## 基线
- [x] T001 完成specs/007-creation-workbench/规格/计划/契约并通过checklists/requirements.md（6/6）。

## US1 安全提交
独立测试：并发相同操作一次调度，冲突409；浏览器丢响应、刷新可安全重试。
- [x] T002 [US1] 在backend/src/test/java/com/materialstudio/job/CreationApiTest.java新增真实HTTP并发/冲突/身份/无效key测试并观察RED。
- [x] T003 [US1] 实现backend/src/main/resources/db/migration/V4__creation.sql及job/CreationMapper.java、JobSubmissionService.java、JobController.java；key为1～80位[A-Za-z0-9_-]，唯一(owner,key)，事务内关联，验证GREEN。
- [x] T004 [US1] 在frontend/src/features/jobs/submission.test.tsx、src/lib/submission-proxy.test.ts测试丢响应同key重试、刷新恢复、代理透传，观察RED。
- [x] T005 [US1] 更新frontend/src/features/jobs/SubmissionForm.tsx及src/lib/api-proxy.ts，实现不可变请求与按本人存储恢复，验证GREEN。

## US2 下载与重新制作
独立测试：原记录不变，新编号关联并保留参数，下载本人PNG。
- [ ] T006 [US2] 在backend/src/test/java/com/materialstudio/job/CreationApiTest.java测试重新制作/模拟失败重试/缺素材/权限/下载，观察RED。
- [ ] T007 [US2] 实现backend/src/main/java/com/materialstudio/job/JobController.java、JobSubmissionService.java配方与recreate/download契约，验证GREEN。
- [ ] T008 [US2] 在frontend/src/features/jobs/actions.test.tsx测试下载错误、重复操作及新任务跟踪，观察RED。
- [ ] T009 [US2] 实现frontend/src/features/jobs/JobActions.tsx、DownloadResult.tsx接入JobCards/History/SubmissionForm，验证GREEN。

## US3 事件详情
独立测试：详情展开更新、失败恢复，任务不变，关闭取消请求。
- [ ] T010 [US3] 在frontend/src/features/jobs/events.test.tsx新增生命周期测试并观察RED。
- [ ] T011 [US3] 实现frontend/src/features/jobs/JobEvents.tsx及JobCards.tsx集成，验证GREEN。

## US4 真实明信片
独立测试：输出像素/尺寸证明上传、裁剪、标题/配色/比例生效。
- [ ] T012 [US4] 在backend/src/test/java/com/materialstudio/job/CreationApiTest.java与PostcardRendererTest.java测试真实结果/非法参数/中文字体并观察RED。
- [ ] T013 [US4] 实现backend/src/main/java/com/materialstudio/job/PostcardParameters.java、PostcardRenderer.java、PipelineWorker.java、ResultStore.java；title最多40Unicode码点无控制字符，crops恰2项，x/y有限0～1、zoom有限1～3，验证GREEN。
- [ ] T014 [US4] 在frontend/src/features/jobs/postcard.test.tsx新增参数、预览、隔离测试并观察RED。
- [ ] T015 [US4] 实现frontend/src/features/jobs/PostcardEditor.tsx与SubmissionForm.tsx，沿用src/app/globals.css设计，验证GREEN。

## 交付
- [ ] T016 更新README.md、docs/roadmap.md、docs/acceptance.md与docs/work-log.md，完整容器回归、浏览器验收并记录实际结果。

## Dependencies & Strategy
T001 → US1 → US2 → US3 → US4 → T016。各故事先后端行为测试/实现，再前端行为测试/实现；先验证独立增量再做全量。无并行任务，禁止子智能体。所有用户选择均在本轮范围，无仅做US1即结束。

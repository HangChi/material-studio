# Tasks: 持续创作与可靠任务

全部串行；每项含目标文件路径，先观察业务RED再实现GREEN；全部七项必须交付。

- [x] T001 规格/计划/契约并通过checklists/requirements.md
- [x] T002 [US1] 编辑来源真实HTTP测试RED、JobSubmissionService/Controller实现GREEN
- [x] T003 [US1] SubmissionForm来源恢复/编辑入口测试RED与实现GREEN
- [x] T004 [US2] 原图像素测试RED、TemplateRenderer/Worker全模板合成GREEN
- [x] T005 [US3] 素材分页/权限测试RED、AssetMapper/Controller实现GREEN
- [x] T006 [US3] AssetPicker/UploadSlots复用素材测试RED与实现GREEN
- [x] T007 [US4] draft-storage/SubmissionForm恢复隔离测试RED与实现GREEN
- [x] T008 [US5] 历史筛选/管理测试RED、LibraryMapper/Service/JobController实现GREEN
- [x] T009 [US5] History/WorkControls全历史筛选、管理/恢复与过期响应测试RED/GREEN
- [x] T010 [US6] 取消/终态竞争测试RED、PipelineState/Controller取消/队列快照实现GREEN
- [x] T011 [US6] JobActions/JobCards取消与排队文案测试RED/GREEN
- [ ] T012 [US7] 恢复/有限重试/耗尽测试RED、ExecutionMapper/Worker/Dispatcher实现GREEN
- [ ] T013 [US7] JobCards执行次数/下次重试提示及跟踪测试RED/GREEN
- [ ] T014 完整容器回归与scripts/verify-008.mjs实际链路/重启验证
- [ ] T015 更新README.md、docs/roadmap.md、acceptance.md、work-log.md与浏览器证据

依赖：T001→US1→US2→US3→US4→US5→US6→US7→全量验收。无并行任务。

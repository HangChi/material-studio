# Tasks: 持续创作与身份恢复
全程串行；约章1.1.0、规格质量6/6通过。
- [x] T001 同步AGENTS.md、约章1.1.0与specs/011-creative-library规格/计划/数据/契约/验收指南。
- [x] T002 [US1] backend storage/StorageLifecycleTest.java先RED，验证登记/活动/近期/链接保护、只读盘点/过期快照/隔离7天到期审计。
- [x] T003 [US1] backend storage实现、V8迁移，容器GREEN后提交；不触碰原卷。
- [ ] T004 [US2] backend batch/BatchApiTest.java先RED，覆盖批次原子受理/提交后调度/幂等/配额/归属/分页/取消。
- [ ] T005 [US2] backend batch、V9迁移及JobSubmissionService afterCommit实现GREEN。
- [ ] T006 [US2] frontend batches测试先RED，新增/batches、独立上传/提交标识/恢复和JobTracker跟踪，导航及代理同步。
- [ ] T007 [US3] backend job/OrganizationTest.java先RED，标签10项/20码点、bulk50项归属原子、ZIP20项/64MiB及标签筛选。
- [ ] T008 [US3] backend组织接口/V10迁移及frontend选择已加载作品/批量操作/标签/ZIP，前后端行为测试GREEN后提交。
- [ ] T009 [US4] backend identity/AccountApiTest.java先RED，注册绑定/跨设备/退出/恢复码轮换/旧会话失效/失败限流/迁移冲突与活动源保护。
- [ ] T010 [US4] backend账号/会话、V11迁移、密码12～128/用户名3～32/失败5次15分钟/恢复码一次性，实现GREEN。
- [ ] T011 [US4] frontend账号测试先RED，/account、一次性恢复码内存显示/保存后继续、显式迁移/退出/跨标签清理，容器GREEN。
- [ ] T012 scripts/verify-011.mjs与docs/011-validation.md真实独立空卷/迁移/失败/隐私验收、桌面375px截图和全量检查。
- [ ] T013 README.md、docs/roadmap.md、acceptance.md、async-workflow.md及work-log.md同步，提交推送并确认最终远端CI。

依赖T001→US1→US2→US3→US4→交付。所有行为先观察真正缺失导致的RED，不将编译/依赖故障充作RED；各GREEN可审阅增量提交。不存在并行委派。此轮四项均为用户授权范围。

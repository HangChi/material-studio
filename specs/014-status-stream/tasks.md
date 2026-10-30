# Tasks: SSE快照与回退
## Setup
- [x] T001 specs/014-status-stream规格/设计/契约与16项质量检查，承接013本地与真实双实例验收。
## US1 / 单连接只读快照
独立标准：初始/版本/终态流、越权/身份拒绝、连接限额与回收。
- [x] T002 [US1] backend/src/test/java/com/materialstudio/job/JobStreamApiTest.java先RED验证SSE帧、归属、只读、限额和撤销/断连回收，最小编译stub不记完成。
- [x] T003 [US1] backend/src/main/java/com/materialstudio/job/{JobStreamService,JobStreamController,JobMapper}.java与common/ApiErrors.java实现最多50项/64连接/每owner2、心跳10s/寿命55s，GREEN。
## US2 / 可靠客户端降级
独立标准：两任务一源、旧源/版本隔离、断线/无效帧/20s静默回退GET，退出零残留。
- [x] T004 [US2] frontend/src/features/jobs/stream.test.ts与lib/api-proxy.test.ts先RED覆盖聚合/隔离/清理/回退和透传头/Abort。
- [x] T005 [US2] frontend/src/features/jobs/JobTracker.ts及lib/api-proxy.ts实现EventSource生命周期/看门狗/独立轮询回退，前端GREEN并完整检查。
## Delivery
- [x] T006 scripts/verify-014.mjs与docs/014-validation.md完成真实代理/断开/撤销/终态、浏览器桌面375px及全量检查；原3000保留卷更新，临时项目down保留卷。
- [x] T007 README.md、docs/roadmap.md、docs/async-workflow.md、docs/acceptance.md、docs/work-log.md与001当前入口同步第10项实际状态/限制，推送并确认最终远端CI。

共7任务，US1/US2各2项；T001→US1→US2→交付。全程串行，无并行代理；TDD先真实业务RED再最小GREEN，当前规格hooks文件不存在。

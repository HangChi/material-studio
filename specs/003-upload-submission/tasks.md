# Tasks: 素材上传与任务受理

**Input**: 本期spec/plan/research/data-model/contracts；依赖002完成。
**Tests**: 强制逐行为RED→GREEN→REFACTOR，真实MySQL/容器验证，禁止子智能体。

## Phase 1: Setup

- [x] T001 在 backend/src/test/java/com/materialstudio/identity/SessionApiTest.java 与 backend/src/test/java/com/materialstudio/ApiTestSupport.java 编写创建/复用/撤销/不存明文token测试并观察RED。

## Phase 2: Foundational

- [x] T002 在 backend/src/main/resources/db/migration/V2__submission.sql 和 backend/src/main/java/com/materialstudio/identity/ 实现身份与表结构，在 backend/src/main/java/com/materialstudio/common/ 实现安全错误响应；完成T001 GREEN。
- [x] T003 在 frontend/src/lib/submission-proxy.test.ts 编写Cookie/多Set-Cookie/Location/multipart流/Origin/方法路由测试，观察RED。
- [x] T004 在 frontend/src/lib/api-proxy.ts、frontend/src/app/api/[...path]/route.ts 扩展个人接口和写入流代理，完成T003 GREEN且002代理测试仍通过。

## Phase 3: US1 准备可用素材 (P1)

**Goal**: 真实图片保存服务端，各槽预览/替换/移除/失败恢复。
**Independent Test**: 本人读回原字节，越权404；坏图/MIME/大小/像素拒绝；旧上传不填回。

- [x] T005 [US1] 在 backend/src/test/java/com/materialstudio/asset/AssetApiTest.java 编写完整读回/越权/零字节/5MiB边界/超限/伪MIME/坏图/像素上限测试，观察RED。
- [x] T006 [US1] 在 backend/src/main/java/com/materialstudio/asset/ 实现随机文件名落盘/失败清理/MyBatis登记及私有读取；落实mimeType ∈ {image/jpeg,image/png}、0<sizeBytes<=5242880、像素<=20000000，完成T005 GREEN。
- [x] T007 [US1] 在 frontend/src/features/assets/upload.test.tsx 编写选择预览/替换/移除/上传失败重试/过时响应/卸载释放/前端校验测试，观察RED。
- [x] T008 [US1] 在 frontend/src/features/assets/UploadSlots.tsx 实现每槽独立状态、图片解码与像素校验、abort/requestId/objectURL生命周期，完成T007 GREEN。

## Phase 4: US2 以当前身份受理任务 (P2)

**Goal**: 保存有序任务后投递，不等待worker；可核对不确定提交。
**Independent Test**: 从另一连接证明dispatch前已提交；阻塞worker不阻塞202；错误输入不落任务，两个身份隔离。

- [x] T009 [US2] 在 backend/src/test/java/com/materialstudio/job/JobSubmissionTest.java 编写事务提交/回滚、精确数量/重复/归属/物理文件检查、排队拒绝/未知worker终态、查询归属测试，观察RED。
- [x] T010 [US2] 在 backend/src/main/java/com/materialstudio/job/ 实现TransactionTemplate受理/有序关联/dispatcher契约及默认拒绝、单任务与最近50条读取，完成T009 GREEN；不得等待后台完成或留下永久QUEUED。
- [x] T011 [US2] 在 frontend/src/features/jobs/submission.test.tsx 编写身份初始化/素材未齐禁用/防双击/202后任务状态和继续制作/请求错误测试，观察RED。
- [x] T012 [US2] 在 frontend/src/features/jobs/SubmissionForm.tsx 实现身份ready门禁、提交同步锁、任务快照及4xx反馈，完成T011 GREEN。
- [x] T013 [US2] 在 frontend/src/features/templates/TemplateDetail.tsx 接入表单，并更新 frontend/src/features/templates/detail.test.tsx 验证详情与素材要求仍正常且出现制作入口。
- [x] T014 [US2] 在 frontend/src/features/jobs/submission.test.tsx 增加网络/5xx未知结果、核对失败不解锁、成功核对后人工确认、无自动重提测试，观察RED。
- [x] T015 [US2] 在 frontend/src/features/jobs/SubmissionForm.tsx 完成核对和未知结果门禁，完成T014 GREEN；不实现005自动轮询/完整历史。

## Phase 5: Polish & Delivery

- [x] T016 在 compose.yaml、backend/src/main/resources/application.yml、.env.example、frontend/src/app/globals.css 增加文件卷/上传限制/严格JSON/Secure配置及375px上传反馈。
- [x] T017 通过容器完整前端检查/Java verify、docker compose up --build -d与实际浏览器上传/替换/提交/核对/身份隔离，记录 docs/work-log.md 的真实证据。
- [ ] T018 更新 README.md、docs/roadmap.md、specs/003-upload-submission/quickstart.md 说明当前默认worker限制、接口/配置/投入与状态，提交验收增量。

## Dependencies & Execution Order

T001→T002→T003/T004→US1→US2→T016～T018。schema与配置可随首个需要的测试最小增量落地，task只在全部约束完成后勾选。
T009/T010按校验/事务边界/拒绝三个小循环；T011/T012与T014/T015分开验证，不能先写实现再补RED。
事务测试使用真实Compose MySQL与受控dispatcher，非H2；不声称mock worker是真实流水线。

## Parallel Opportunities

未标[P]；所有工作串行，由当前单智能体完成。
US1/US2可通过服务端夹具与组件测试分别验证，最终集成仍需真实HTTP与图片文件。

## Implementation Strategy

先身份→上传→受理，再UI对应小循环；提交每个通过检查的逻辑增量，不提交未通过的RED状态。
003全部完成后再规划004，不实现真实生成/轮询或提前把完整项目标记完成。

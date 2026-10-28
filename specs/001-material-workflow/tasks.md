# Tasks: 素材制作与异步任务闭环

**Input**: 本目录 spec.md、plan.md、research.md、data-model.md、contracts/http-api.md、test-plan.md。

**Tests**: 用户明确要求 TDD；业务任务必须先执行对应测试并记录真实 RED，再最小实现至 GREEN，再重构。

**Organization**: 按故事组织，所有任务由当前单智能体串行执行。只勾选实际完成的任务。

## Phase 1: Setup

- [x] T001 建立独立仓库、Spec Kit 与约章，在 AGENTS.md、.specify/memory/constitution.md 固定 SDD/TDD 和禁用子智能体约束。
- [ ] T002 创建 frontend/package.json、frontend/package-lock.json、frontend/tsconfig.json、frontend/eslint.config.mjs、frontend/vitest.config.ts，核验并锁定 Next 16/React 19/TS 5 的实际兼容 patch 版本，定义 lint/typecheck/test/build 脚本。
- [ ] T003 创建 backend/pom.xml 与 backend/src/main/java/com/materialstudio/MaterialStudioApplication.java，锁定 Boot 3.5、Starter 3.0 兼容 patch、Java21、MySQL 驱动、Flyway mysql、JUnit/Mockito/Testcontainers，verify 不跳过测试。
- [ ] T004 创建 frontend/Dockerfile、backend/Dockerfile 的构建/测试阶段及 .dockerignore，准备容器内单例测试入口，在 docs/work-log.md 记录版本解析和基础构建结果；先有可运行测试环境再做业务 TDD。

## Phase 2: Foundational

必须先完成基础容器测试入口；每个下列业务行为先 RED 再实现。

- [ ] T005 在 backend/src/test/java/com/materialstudio/common/SchemaConstraintTest.java 编写 MySQL 容器约束测试，验证所有权外键、有序素材唯一性、终态字段约束及事务回滚，观察 RED。
- [ ] T006 在 backend/src/main/resources/db/migration/V1__schema.sql 与 backend/src/main/resources/application.yml 实现数据模型和配置；约束原文见下，完成 T005 GREEN 后重构。
- [ ] T007 在 backend/src/test/java/com/materialstudio/identity/SessionApiTest.java 与 frontend/src/lib/api-proxy.test.ts 编写 cookie 初始化/切换、401、Set-Cookie 透传、multipart/图片/错误码透传、禁止缓存测试并观察 RED。
- [ ] T008 在 backend/src/main/java/com/materialstudio/identity/SessionService.java、backend/src/main/java/com/materialstudio/identity/SessionController.java、frontend/src/app/api/[...path]/route.ts 实现匿名身份和同源流代理，tokenHash 非空且唯一，不存明文 token，完成 T007 GREEN。

T006 必须落实的字段约束（引自 data-model.md）：

> 模板 requiredImageCount ∈ {1,2,3}；acceptedMimeTypes 为 image/jpeg、image/png；maxFileSizeBytes=5242880。
>
> 素材 ownerId 必须等于当前用户；mimeType ∈ {image/jpeg,image/png}；0 < sizeBytes <= 5242880。
>
> status ∈ {QUEUED,RUNNING,SUCCEEDED,FAILED}；stage ∈ {ASSET_CHECK,GENERATE,FINALIZE} 或 null；version 为非负整数且更新时递增。
>
> SUCCEEDED 必须有 resultPath 与 finishedAt 且无错误；FAILED 必须有 errorCode、errorMessage、finishedAt 且无结果。
>
> QUEUED/RUNNING 的 resultPath、finishedAt 为空；QUEUED 的 stage 为空；RUNNING 的 stage 非空。
>
> 每个任务每阶段最多一条事件；事件 status ∈ {STARTED,SUCCEEDED,FAILED}；sequence 依次为 1、2、3。

应用层校验与 SQL CHECK/UNIQUE/FK 分别承担适合自身的约束，不能声称 SQL 已完成文件或归属校验。

## Phase 3: US1 浏览模板 (P1)

**Goal**: 分类、卡片和详情可独立浏览，作为最小浏览 MVP。

**Independent Test**: 两分类三模板、不同上传数量、详情不存在/列表空态/失败重试。

- [ ] T009 [US1] 在 backend/src/test/java/com/materialstudio/template/TemplateApiTest.java 编写 B01 分类/详情/404/空态契约测试并观察 RED。
- [ ] T010 [US1] 在 backend/src/main/resources/db/migration/V2__templates.sql、backend/src/main/resources/demo/ 写入两类三模板与自制 JPEG/PNG；落实“模板 requiredImageCount ∈ {1,2,3}；acceptedMimeTypes 为 image/jpeg、image/png；maxFileSizeBytes=5242880。”
- [ ] T011 [US1] 在 backend/src/main/java/com/materialstudio/template/TemplateMapper.java、backend/src/main/java/com/materialstudio/template/TemplateController.java 实现分类/模板/详情及白名单 demo 图片接口，完成 B01 GREEN。
- [ ] T012 [US1] 在 frontend/src/features/templates/templates.test.tsx 编写 F01 筛选、详情、加载/错误/空态/404 测试，观察 RED。
- [ ] T013 [US1] 在 frontend/src/app/page.tsx、frontend/src/app/templates/[id]/page.tsx、frontend/src/features/templates/TemplateCatalog.tsx 实现列表与详情，完成 F01 GREEN，并在 docs/work-log.md 记录浏览切片验收。

## Phase 4: US2 上传与受理 (P1)

**Goal**: 合法素材服务端落盘，提交立即返回独立任务。

**Independent Test**: 使用预置模板上传与受理；worker 用可控替身阻塞，证明不等待结果。

- [ ] T014 [US2] 在 backend/src/test/java/com/materialstudio/asset/AssetApiTest.java 编写 B02 大小/类型/实际内容/归属边界测试并观察 RED。
- [ ] T015 [US2] 在 backend/src/main/java/com/materialstudio/asset/AssetService.java、backend/src/main/java/com/materialstudio/asset/AssetController.java 实现写盘后登记和受保护读取，落实“素材 ownerId 必须等于当前用户；mimeType ∈ {image/jpeg,image/png}；0 < sizeBytes <= 5242880。”完成 B02 GREEN。
- [ ] T016 [US2] 在 backend/src/test/java/com/materialstudio/job/JobSubmissionTest.java 编写 B03 参数错误不插入、事务提交后调度、202 不等待 worker、入队拒绝有 FAILED 记录及 profile 限制测试，观察 RED。
- [ ] T017 [US2] 在 backend/src/main/java/com/materialstudio/job/JobSubmissionService.java、backend/src/main/java/com/materialstudio/job/JobMapper.java、backend/src/main/java/com/materialstudio/job/JobController.java 实现受理，落实“assetIds 不重复，数量等于模板 requiredImageCount，所有素材属于当前用户且文件存在。”及“failAt ∈ {ASSET_CHECK,GENERATE,FINALIZE} 或 null；每阶段 delayMs 为 0～10000 的整数，默认各 2000。”完成 B03 GREEN。
- [ ] T018 [US2] 在 frontend/src/features/assets/upload.test.tsx 编写 F02 槽位校验、上传失败、替换/移除迟到响应、object URL 释放测试并观察 RED。
- [ ] T019 [US2] 在 frontend/src/features/assets/UploadSlots.tsx、frontend/src/features/assets/useUploadSlots.ts 实现各槽位状态、预览与请求取消，完成 F02 GREEN。
- [ ] T020 [US2] 在 frontend/src/features/jobs/submission.test.tsx 编写 F07 防重复提交、受理后显示任务/可继续制作、响应丢失不自动重提测试，观察 RED。
- [ ] T021 [US2] 在 frontend/src/features/jobs/SubmissionForm.tsx 集成详情素材和受理反馈，完成 F07 GREEN，在 docs/work-log.md 记录上传/受理切片。

## Phase 5: US3 后台流水线 (P1)

**Goal**: 三阶段独立执行、事件持久化、失败中断且结果可预览。

**Independent Test**: 不启动页面、不发状态查询，使用任务夹具验证成功及三个指定失败。

- [ ] T022 [US3] 在 backend/src/test/java/com/materialstudio/job/JobPipelineTest.java 编写 B04/B05 顺序、任务级参数隔离、逐阶段失败中断、素材文件失效测试，使用注入 Sleeper/latch 观察 RED。
- [ ] T023 [US3] 在 backend/src/main/java/com/materialstudio/job/JobDispatcher.java、backend/src/main/java/com/materialstudio/job/JobPipeline.java 实现有界单线程队列及三阶段执行，延迟在事务外；顶层错误保存当前失败阶段，完成 B04/B05 GREEN。
- [ ] T024 [US3] 在 backend/src/test/java/com/materialstudio/job/JobLifecycleTest.java 编写 B06 入队拒绝、结果整理写盘失败、查询只读、终态不可回退测试并观察 RED。
- [ ] T025 [US3] 在 backend/src/main/java/com/materialstudio/job/JobQueryService.java、backend/src/main/java/com/materialstudio/job/JobResultService.java 实现状态/事件/结果接口，安全复制自制图片，完成 B06 GREEN。
- [ ] T026 [US3] 在 backend/src/test/java/com/materialstudio/job/JobPersistenceTest.java 编写 B08 真实 MySQL 状态/事件原子更新、重启中断对账测试，观察 RED。
- [ ] T027 [US3] 在 backend/src/main/java/com/materialstudio/job/JobMapper.java、backend/src/main/java/com/materialstudio/job/StageEventMapper.java 实现短事务持久化，落实数据模型 version、终态字段及阶段事件约束，完成 B08 原子性测试 GREEN。
- [ ] T028 [US3] 在 backend/src/main/java/com/materialstudio/job/InterruptedJobReconciler.java 实现启动标记遗留任务 FAILED/EXECUTION_INTERRUPTED，不自动续跑，完成 B08 中断测试 GREEN。
- [ ] T029 [US3] 按 quickstart.md 在容器验证成功、三个失败、无查询仍完成及10次受理耗时，在 docs/work-log.md 记录实际证据与限制。

## Phase 6: US4 个人历史及多任务 (P1)

**Goal**: 刷新恢复、多人归属、请求异常和生命周期清理可靠。

**Independent Test**: 预置两个身份及三任务，模拟响应乱序与查询失败，无需依赖上传页面。

- [ ] T030 [US4] 在 backend/src/test/java/com/materialstudio/identity/PersonalHistoryTest.java 编写 B07 本人历史游标分页、跨身份素材/任务/事件/结果404 测试；在 backend/src/test/java/com/materialstudio/job/JobPersistenceTest.java 补真实分页断言，观察 RED。
- [ ] T031 [US4] 在 backend/src/main/java/com/materialstudio/job/PersonalHistoryService.java、backend/src/main/java/com/materialstudio/job/JobController.java 实现归属检查和 createdAt/id 倒序游标分页，完成 B07/分页 GREEN。
- [ ] T032 [US4] 在 frontend/src/features/jobs/tracking.test.tsx 编写 F03 多任务乱序/version/终态不回退与 F04 查询异常独立和恢复测试，观察 RED。
- [ ] T033 [US4] 在 frontend/src/features/jobs/useJobTracking.ts 实现 identityEpoch/jobId 隔离、单任务单在途及 queryError，完成 F03/F04 GREEN。
- [ ] T034 [US4] 在 frontend/src/features/jobs/tracking.test.tsx 增加 F05 终态停查、全部结束停查、卸载/切换 abort、迟到旧身份响应测试，观察 RED。
- [ ] T035 [US4] 在 frontend/src/features/jobs/useJobTracking.ts 增加清理/epoch 防护与恢复查询入口，完成 F05 GREEN。
- [ ] T036 [US4] 在 frontend/src/features/jobs/history.test.tsx 编写 F06 刷新恢复、空态/失败/分页/结果资源错误不改任务状态测试，观察 RED。
- [ ] T037 [US4] 在 frontend/src/app/history/page.tsx、frontend/src/features/jobs/JobHistory.tsx、frontend/src/features/jobs/IdentitySwitcher.tsx 集成历史/任务卡片/结果预览/身份切换，完成 F06 GREEN。
- [ ] T038 [US4] 按 quickstart.md 验证三任务互不串扰、查询故障恢复、刷新、身份切换和无任务停查，在 docs/work-log.md 记录人工与测试结果。

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T039 创建 compose.yaml 与 .env.example，提供前端/后端/MySQL、健康检查、文件/数据库卷和 test profile，解决 Testcontainers daemon 可达性，验证 docker compose up --build。
- [ ] T040 在 .github/workflows/ci.yml 配置 push/pull_request 容器内 lint/typecheck/test/build 与 mvn verify，保留失败日志，不默认跳过集成测试。
- [ ] T041 在 frontend/src/app/globals.css 及各页面补齐 375px 布局、语义标签、键盘焦点和加载/空态/请求错误，按 spec.md FR-010 人工验证并记录 docs/work-log.md。
- [ ] T042 按 test-plan.md 执行容器完整检查与 quickstart.md 干净环境验收，检查本地图片资源、卷持久化和普通重启，记录 docs/work-log.md，失败必须修复或如实标注。
- [ ] T043 更新 README.md、quickstart.md、traceability.md，补实际版本/命令/配置/接口/演示、完成程度/投入/AI 工作流、素材来源、部署回滚及重启限制。
- [ ] T044 核对无凭据/缓存/未提交改动，在 docs/delivery.md 记录验收 commit 和验证证据，提供本地源码目录或无依赖源码包；若创建远端需用已配置且授权的仓库。

## Dependencies & Execution Order

T001 → T002/T003 → T004 → foundation → US1 → US2 → US3 → US4 → polish。
源码测试执行环境须先在 T004 就绪，最终 Compose 在 T039 汇总应用与测试服务。
US2 的 dispatcher 先用受控替身验证受理接口，US3 替换为实际流水线；不得把 US2 单独声称为完整制作闭环。
US3 与 US4 可用夹具独立验收后台和历史行为，但集成需要 US1/US2 实体与接口。
T023 先以注入的持久化端口/测试替身验证流水线；T025 提供最小可运行查询/结果读取，T027 补齐真实阶段原子事务。
T026/T027/T028 按原子持久化与启动中断两个小 RED/GREEN 循环执行。
每故事结束运行受影响测试并提交；所有任务完成前不标记整题完成。

## Parallel Opportunities

按用户要求，本项目禁止子智能体并行，所有任务串行执行，因此未标 [P]。
结构上 US1 的后端/前端测试、US2 的上传/表单测试、US3 的纯执行/持久化测试、US4 的归属/轮询测试可相互独立，
这里只用于界定测试边界，不启动并行执行者。

## Implementation Strategy

本轮 T001 已完成，其余保持待办。下轮从 T002 开始。
最小可演示切片为 US1 模板浏览；完整业务 MVP 必须包含 US1～US4，不能以模板页面替代题目闭环。
每个行为按测试先行循环、按故事增量提交；验收前兑现 Compose、CI 与完整 README。

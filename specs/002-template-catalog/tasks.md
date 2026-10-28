# Tasks: 模板浏览与详情

**Input**: spec.md、plan.md、research.md、data-model.md、contracts/http-api.md。
**Tests**: 强制TDD，逐行为记录RED/GREEN，不使用子智能体。

## Phase 1: Setup

- [x] T001 在 backend/pom.xml、backend/src/main/java/com/materialstudio/MaterialStudioApplication.java 建立Java21/Boot3.5/Starter3.0依赖与启动入口，固定版本。
- [x] T002 在 frontend/package.json、frontend/package-lock.json、frontend/tsconfig.json、frontend/vitest.config.ts、frontend/eslint.config.mjs 建立Next16/React19/TS测试与检查环境，固定版本。
- [x] T003 在 compose.yaml、backend/Dockerfile、frontend/Dockerfile、.env.example 配置应用/测试容器与真实MySQL，验证测试框架可执行；不以环境错误充当RED。

## Phase 2: Foundational

- [x] T004 在 frontend/src/lib/api-proxy.test.ts 编写模板GET代理的状态码、PNG类型/字节、上游故障、非法路径/方法行为测试并观察RED。
- [x] T005 在 frontend/src/lib/api-proxy.ts、frontend/src/app/api/[...path]/route.ts 实现受限只读代理，完成T004 GREEN并重构。

## Phase 3: US1 按分类发现模板 (P1)

**Goal**: 服务端数据支持两类三模板浏览与筛选。
**Independent Test**: 真实MySQL接口返回所有/指定/未知分类；UI切换及旧响应隔离。

- [x] T006 [US1] 在 backend/src/test/java/com/materialstudio/template/TemplateApiTest.java 编写分类/列表/筛选/未知分类/封面内容测试，实际请求未实现端点观察RED。
- [x] T007 [US1] 在 backend/src/main/resources/db/migration/V1__templates.sql、backend/src/main/resources/demo/ 添加两类三模板及自制PNG；约束requiredImageCount ∈ {1,2,3}；acceptedMimeTypes为image/jpeg、image/png；maxFileSizeBytes=5242880。
- [x] T008 [US1] 在 backend/src/main/java/com/materialstudio/template/TemplateMapper.java、backend/src/main/java/com/materialstudio/template/TemplateController.java 实现MyBatis列表/分类/白名单封面，完成T006 GREEN。
- [x] T009 [US1] 在 frontend/src/features/templates/catalog.test.tsx 编写加载/分类/空态/失败重试/快速切换旧响应测试并观察RED。
- [x] T010 [US1] 在 frontend/src/features/templates/TemplateCatalog.tsx、frontend/src/app/page.tsx 实现列表和请求清理，完成T009 GREEN。

## Phase 4: US2 查看要求与恢复浏览错误 (P2)

**Goal**: 可直接打开详情并正确表达加载/不存在/失败。
**Independent Test**: 三模板要求1/2/3张，未知模板404，异常后重试。

- [x] T011 [US2] 在 backend/src/test/java/com/materialstudio/template/TemplateApiTest.java 增加详情字段/1～3张要求/不存在404/非法封面测试并观察RED。
- [x] T012 [US2] 在 backend/src/main/java/com/materialstudio/template/TemplateController.java、backend/src/main/java/com/materialstudio/template/TemplateMapper.java 实现详情与统一安全错误，完成T011 GREEN。
- [x] T013 [US2] 在 frontend/src/features/templates/detail.test.tsx 编写详情约束、404、失败恢复测试并观察RED。
- [x] T014 [US2] 在 frontend/src/features/templates/TemplateDetail.tsx、frontend/src/app/templates/[id]/page.tsx 实现详情，完成T013 GREEN。

## Phase 5: Polish & Cross-Cutting

- [ ] T015 在 frontend/src/app/layout.tsx、frontend/src/app/globals.css 落实样张架视觉、375px、语义控件、跳转主内容和可见焦点，记录实际验证。
- [ ] T016 在 .github/workflows/ci.yml 配置push/PR复用容器检查，执行完整前端检查与Java verify、Compose构建/启动/HTTP验收，在 docs/work-log.md 记录证据。
- [ ] T017 更新 README.md、docs/roadmap.md、specs/002-template-catalog/quickstart.md 的已完成范围、真实版本/命令/测试与限制，提交验收增量。

## Dependencies & Execution Order

T001/T002→T003→T004/T005→US1→US2→T015～T017。逐行为RED/GREEN，不一口气先写全部失败测试。
后端测试使用独立test-mysql；前端用可控fetch Promise，不以真实网络波动验证乱序。
首个MVP为US1分类列表；002全部完成后再规划003，不继续执行001原任务。

## Parallel Opportunities

未标[P]，按用户要求全部串行。US1前后端测试可分别验证；US2前后端详情亦可分别验证，仍由当前执行者依次执行。

## Implementation Strategy

先建立能运行的测试环境，再接口RED/GREEN，再界面RED/GREEN，最后全量检查与交付。
本切片只有模板只读功能；完整制作闭环仍需003～005，不声称本期完成全题。

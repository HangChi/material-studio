# 素材工坊 · Material Studio

独立运行的图片模板与素材制作项目，需求见[原始题目](docs/requirements-source.md)。
**当前完成002与003：模板浏览、匿名身份、私有图片上传、任务受理和手动记录核对。真正的后台制作与自动历史跟踪仍待004/005。**

## 迭代与开发入口

项目在独立目录 `xiaoying/material-studio/`，全程单智能体，使用SDD + TDD并按增量Git提交。
[001](specs/001-material-workflow/spec.md)保留为总体基线，[迭代图](docs/roadmap.md)为当前执行入口。

| Feature | 范围 | 状态 |
| --- | --- | --- |
| [002](specs/002-template-catalog/spec.md) | 模板浏览、详情、当前切片工程交付 | 已实现并完成本地容器/浏览器验收 |
| [003](specs/003-upload-submission/spec.md) | 身份、上传与受理 | 已完成本地验收；18/18任务 |
| [004](specs/004-async-pipeline/spec.md) | 三阶段异步执行与模拟控制 | 规格已建，待plan/tasks/implement |
| [005](specs/005-history-tracking/spec.md) | 历史、多任务跟踪、完整交付 | 规格已建，待plan/tasks/implement |

实施前读取 [AGENTS.md](AGENTS.md)、[约章](.specify/memory/constitution.md)和当前feature的spec/plan/contracts/tasks。
Spec Kit CLI0.16.4已初始化，仓库内保存模板、脚本及Codex skills。克隆后显式选择当前feature：

```sh
SPECIFY_FEATURE_DIRECTORY=specs/003-upload-submission .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```

每个feature独立走 specify → plan → tasks → implement；每个业务行为记录RED → GREEN → REFACTOR。
当前入口为[003任务](specs/003-upload-submission/tasks.md)，下一步为004的plan/tasks。每期完成后更新本机feature指针，不继续执行001原始大任务清单。

## 技术版本与结构

| 层 | 当前固定版本 |
| --- | --- |
| 前端 | Next.js16.4.3 App Router、React19.3.1、TypeScript5.9.3、npm11.6.2 |
| 运行时 | Node22（镜像digest固定）、Java21、Maven3.9.9 |
| 后端 | Spring Boot3.5.16、MyBatis Spring Boot Starter3.0.5 |
| 数据 | MySQL8.4（镜像digest固定）、Flyway（由Boot管理） |
| 测试 | Vitest4.1.12、Testing Library；JUnit5与真实MySQL测试库 |

前端精确版本与解析依赖由package-lock固定；Java版本由pom/Boot BOM固定。
ESLint9保持与Next配置中插件的peer范围兼容，避免强制覆盖为ESLint10；升级时须一并验证插件。
兼容性来源见[研究记录](specs/002-template-catalog/research.md)，镜像digest见Compose/Dockerfile。

```text
backend/                 Java、MyBatis、Flyway、图片及JUnit测试
frontend/                Next页面、同源API代理、组件与代理测试
compose.yaml             应用与隔离测试服务
.github/workflows/ci.yml  push/PR容器检查
specs/                   总体基线与独立feature
docs/                   原题、迭代图、真实工作与测试记录
```

## 启动与配置

宿主只需Docker Engine与Compose v2，应用安装/构建/测试均在容器中执行。

```sh
cp .env.example .env
docker compose up --build -d
```

访问 [http://localhost:3000](http://localhost:3000)。端口冲突可在.env改WEB_PORT。
前端→Java：容器内 `JAVA_API_BASE_URL=http://backend:8080`；Java→数据库：`jdbc:mysql://mysql:3306/material_studio`。
Java/MySQL不向宿主开放端口，浏览器通过Next的同源 `/api/*` 读取Java数据。
.env示例只含本地演示值；可配置MYSQL_DATABASE、MYSQL_USER、MYSQL_PASSWORD、MYSQL_ROOT_PASSWORD、WEB_PORT、COOKIE_SECURE、APP_ORIGIN。
Java素材默认STORAGE_ROOT=/data，Compose的asset-data命名卷持久保存；COOKIE_SECURE=true用于HTTPS，HTTP演示默认false。
反向代理提供HTTPS时设置APP_ORIGIN为公开源（如https://studio.example.com），同时设置COOKIE_SECURE=true。
修改数据库用户名/密码不会重设已初始化的MySQL卷，须同步数据库配置或仅在本地演示时重置卷。

Flyway自动执行V1模板种子和V2身份/素材/任务迁移；V2兼容已有002数据，无需清空数据库。
封面是项目自制PNG，位于 `backend/src/main/resources/demo/`，Java白名单接口提供；无需外部图片网络。
可在容器中重新生成：

```sh
docker compose --profile test run --rm backend-test java -Djava.awt.headless=true tools/CreateDemoImages.java
```

普通停止保留数据库卷：`docker compose --profile test down`。
只有确实要删除本项目演示数据时使用 `docker compose --profile test down -v`。

## 测试、构建与CI

```sh
docker compose --profile test run --rm frontend-test
docker compose --profile test run --rm backend-test
```

前端入口从锁文件npm ci，再执行eslint、tsc、41个Vitest测试、next build。
后端入口mvn verify，执行22个真实HTTP/真实MySQL集成测试并打包；数据库使用独立test-mysql，避免污染演示数据。
单测循环可覆盖命令，例如 `frontend-test npm test -- src/features/templates/catalog.test.tsx` 或
`backend-test mvn -B -Dtest=TemplateApiTest test`；首次需要先运行默认入口安装依赖。
GitHub Actions在push/PR执行上述两条容器入口；远端流水线尚未运行，本地验证结果见[工作日志](docs/work-log.md)。
镜像构建使用-DskipTests，独立检查入口必须先通过；不能把镜像构建等同于测试通过。

## 当前接口与演示

[完整002契约](specs/002-template-catalog/contracts/http-api.md)：

| 接口 | 响应 |
| --- | --- |
| GET /api/template-categories | {items:[{id,name}]} |
| GET /api/templates?categoryId=creative | {items:[Template]}；未知分类为空数组 |
| GET /api/templates/{id} | Template；不存在404结构化错误 |
| GET /api/demo/{filename} | 白名单本地PNG；未知404 |

Template含id、title、categoryId、coverUrl、description、requiredImageCount、acceptedMimeTypes、maxFileSizeBytes。
模板依次需要1/2/3张图片，仅JPEG/PNG，每张最多5242880字节和2000万像素。
详情自动建立匿名访客身份，图片槽位可选择、预览、替换、移除和上传失败重试。浏览器与Java校验后，完整文件落盘再返回素材ID。
素材未齐、上传中、身份未准备好或提交中，提交按钮不可用；连续点击不重复POST。

003接口（[完整契约](specs/003-upload-submission/contracts/http-api.md)）：

| 接口 | 行为 |
| --- | --- |
| POST/GET/DELETE /api/session | 创建/读取/撤销匿名cookie身份；返回user.id，绝不返回token/hash |
| POST /api/assets | multipart单file，201素材id/url/mimeType/sizeBytes/createdAt |
| GET /api/assets/{id}/content | 仅本人读取图片，其他身份404 |
| POST /api/jobs | {templateId,assetIds}，保存任务和有序关联后调度；202返回持久任务和Location |
| GET /api/jobs/{id} | 本人单条任务快照，查询不驱动执行 |
| GET /api/jobs | 本人最近50条倒序，用于手动核对，不自动轮询 |

Cookie为HttpOnly/SameSite=Lax，数据库仅保存SHA-256哈希，客户端不得提交ownerId；删除身份撤销token但保留资源。
同一浏览器刷新保留身份，另一个浏览器/无痕窗口为新身份；清除cookie或撤销后无账号找回入口。

**003尚未接通004处理器**：受理事务先写QUEUED，再明确保存FAILED/PROCESSOR_NOT_AVAILABLE和“制作服务暂不可用，任务未开始处理”。
这是受理记录与调度边界的交付，不能作为制作成功演示。不得用前端计时器假装执行。
页面区分提交请求失败与已受理任务失败。网络、5xx或无效受理响应进入“结果尚未确认”，禁用重复提交；
点击“查看已受理任务”核对成功后，再明确“已核对，继续准备”，不会自动重发POST。
核对失败保留既有快照和提交限制。上传移除仅移除当前选择，不删除后台文件，避免影响已受理任务。

当前切片的真实代理/上传/受理验收脚本（会创建演示素材与失败任务并撤销测试身份）：

```sh
docker compose exec -T frontend node --input-type=module < scripts/verify-003.mjs
```


浏览两个分类、打开三个模板查看不同图片数量；快速切分类检查结果，直接访问不存在ID检查提示。
请求失败提供“重新加载”，分类切换与页面离开清理请求，旧响应不会覆盖当前结果。
已实测桌面与375px列表/详情、键盘进入详情和3px焦点、未知模板提示、停启Java服务后的错误/重试恢复；
空数据与乱序由组件测试覆盖。完整证据见工作日志。

## 后续业务方案与边界

003已由Java提供身份、素材、任务及手动核对。004将增加三阶段执行、任务级失败/耗时控制与成功结果；
005将增加完整个人历史、刷新后自动跟踪、轮询和身份切换清理。
尚不能演示制作成功、指定阶段失败或自动多任务更新。不实现真实AI、支付、复杂后台、自动重试、受理幂等和重启续跑。
孤儿文件清理不在当前范围，演示重置数据卷时统一清理；服务崩溃中断的持久QUEUED任务由004补中断对账。
当前未满足全题R-01～R-14，仅交付002/003切片；关键流水线和多任务测试必须随004/005补上。
后端运行镜像暂复用固定Maven/Java镜像以简化演示，体积可在后续优化。

## 部署、回滚、投入与来源

部署固定源码commit并运行Compose，等待健康检查后验证列表/详情与图片。发布前备份数据库卷。
回滚到上一验收commit重建；未来涉及schema变更时须同时恢复匹配备份，不能假定旧应用兼容新表。
当前无需公网部署。验收commit及运行证据由最终提交记录和工作日志确认。
实际投入按工具可核对时段记录在[docs/work-log.md](docs/work-log.md)，不虚构精确人工工时。

使用Codex辅助：原题→总体基线→独立feature规格→计划/契约/任务→测试先失败→最小实现→重构/完整检查→提交。
例如受理测试先得到404，再用独立数据库连接证明dispatch前任务已提交；注入关联写入失败时验证任务回滚且无dispatch；未知提交结果测试先失败，再实现核对门禁。
环境错误单独记录，不能算业务RED；未运行的远端CI不声称通过。全程未使用子智能体。

Spec Kit模板、脚本、skills来自[github/spec-kit](https://github.com/github/spec-kit)，本地CLI0.16.4生成。
UI参考frontend-design/ui-ux-pro-max技能并按图片样张用途调整；业务实现与几何PNG为本项目生成，未复用第三方业务代码或远程图片。

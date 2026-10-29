# 素材工坊 · Material Studio

独立运行的图片模板与素材制作项目，需求见[原始题目](docs/requirements-source.md)。
**002～006已完成本地验收：模板浏览、私有上传、三阶段后台制作、模拟控制、个人历史分页、多任务自动跟踪与结果预览。**
原题逐项实现、测试和运行证据见[验收对照](docs/acceptance.md)；尚未执行远端CI、真实TLS或公网部署。

## 迭代与开发入口

项目在独立目录 `xiaoying/material-studio/`，全程单智能体，使用SDD + TDD并按增量Git提交。
[001归档总览](specs/001-material-workflow/README.md)保留总体需求、旧任务迁移关系与复查待修项，[迭代图](docs/roadmap.md)为当前执行入口。

| Feature | 范围 | 状态 |
| --- | --- | --- |
| [002](specs/002-template-catalog/spec.md) | 模板浏览、详情、当前切片工程交付 | 已实现并完成本地容器/浏览器验收 |
| [003](specs/003-upload-submission/spec.md) | 身份、上传与受理 | 已完成本地验收；18/18任务 |
| [004](specs/004-async-pipeline/spec.md) | 三阶段异步执行与模拟控制 | 已完成本地验收；17/17任务 |
| [005](specs/005-history-tracking/spec.md) | 历史、多任务跟踪、完整交付 | 已完成本地验收；15/15任务 |
| [006](specs/006-mvp-hardening/spec.md) | 刷新分页、图片恢复、十次时延验收 | 已完成本地验收；9/9任务 |

实施前读取 [AGENTS.md](AGENTS.md)、[约章](.specify/memory/constitution.md)和当前feature的spec/plan/contracts/tasks。
Spec Kit CLI0.16.4已初始化，仓库内保存模板、脚本及Codex skills。克隆后显式选择当前feature：

```sh
SPECIFY_FEATURE_DIRECTORY=specs/006-mvp-hardening .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```

每个feature独立走 specify → plan → tasks → implement；每个业务行为记录RED → GREEN → REFACTOR。
当前交付入口为[006任务](specs/006-mvp-hardening/tasks.md)及[验收对照](docs/acceptance.md)。001原始大任务清单保留溯源，不作为当前执行清单。

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

Flyway自动执行V1模板种子、V2身份/素材/任务和V3执行配置/事件迁移；兼容已有002/003数据，无需清空数据库。
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

前端入口从锁文件npm ci，再执行eslint、tsc、70个Vitest测试、next build。
后端入口mvn verify，执行38个真实HTTP/真实MySQL集成测试并打包；数据库使用独立test-mysql，避免污染演示数据。
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
| POST /api/jobs | {templateId,assetIds,simulation?}，保存任务/关联/配置后调度；202返回快照和Location |
| GET /api/jobs/{id} | 本人单条任务快照，查询不驱动执行 |
| GET /api/jobs?limit=20&cursor={id} | 本人历史分页，items/nextCursor；limit为1～50，默认20 |
| GET /api/jobs/active | 本人全部QUEUED/RUNNING，恢复首屏之外活动任务 |

Cookie为HttpOnly/SameSite=Lax，数据库仅保存SHA-256哈希，客户端不得提交ownerId；删除身份撤销token但保留资源。
同一浏览器刷新保留身份，另一个浏览器/无痕窗口为新身份；清除cookie或撤销后无账号找回入口。

004已接通真实Java后台；003时期的PROCESSOR_NOT_AVAILABLE历史记录仍保留，不改写为新结果。
页面区分提交请求失败与已受理任务失败。网络、5xx或无效受理响应进入“结果尚未确认”，禁用重复提交；
点击“查看已受理任务”核对成功后，再明确“已核对，继续准备”，不会自动重发POST。
核对失败保留既有快照和提交限制。上传移除仅移除当前选择，不删除后台文件，避免影响已受理任务。

真实代理/上传/受理及流水线验收脚本（创建本地演示数据并撤销测试身份；文件和记录保留）：

```sh
docker compose exec -T frontend node --input-type=module < scripts/verify-003.mjs
docker compose exec -T frontend node --input-type=module < scripts/verify-004.mjs
docker compose exec -T frontend node --input-type=module < scripts/verify-005.mjs
```


浏览两个分类、打开三个模板查看不同图片数量；快速切分类检查结果，直接访问不存在ID检查提示。
请求失败提供“重新加载”，分类切换与页面离开清理请求，旧响应不会覆盖当前结果。
已实测桌面与375px列表/详情、键盘进入详情和3px焦点、未知模板提示、停启Java服务后的错误/重试恢复；
空数据与乱序由组件测试覆盖。完整证据见工作日志。

## 004后台执行与模拟演示

[004契约](specs/004-async-pipeline/contracts/http-api.md)补充GET /api/jobs/{id}/events（按version升序的阶段事件）和GET /api/jobs/{id}/result（本人PNG，其他身份404）。
任务快照含id/templateId/templateTitle/status/stage/version/createdAt/updatedAt/finishedAt/resultUrl/errorCode/errorMessage；resultUrl只在成功后有值。

Java使用单工作线程与容量16的有界FIFO队列；提交先事务提交再调度，不等待制作完成。当1个任务运行且16个等待时，新增任务仍返回202和持久FAILED/QUEUE_REJECTED，绝不转到请求线程制作。
后台按素材检查ASSET_CHECK→模拟生成GENERATE→结果整理FINALIZE执行，每一步开始和完成都独立写事件并递增任务版本。
状态为QUEUED→RUNNING→SUCCEEDED/FAILED；任一步失败中断后续阶段。正常成功恰6个事件/version6，图片先原子落盘，再提交成功状态。
延迟/文件IO不持有数据库行锁；阶段状态与事件处于同一短事务；GET只读且终态不会回退。
模拟产物是模板对应自制PNG的独立私有副本，不对上传图片做真实AI或图像合成。

页面按模板数量上传并提交，初次展示瞬时受理快照，可能等待、处理中或已结束。受理后自动跟踪各任务，可继续准备下一项；离开页面后Java继续制作，进入“制作记录”恢复历史并继续跟踪。刷新保留访客身份。

默认每阶段2000ms，不随机失败。通过同源API POST /api/jobs传可选simulation演示失败/耗时（先按003接口取得当前身份和assetId，可用保留cookie的HTTP客户端）：

```json
{
  "templateId": "demo-portrait",
  "assetIds": ["<本人已上传素材ID>"],
  "simulation": {
    "failStage": "GENERATE",
    "stageDurationsMs": {"ASSET_CHECK": 500, "GENERATE": 3000, "FINALIZE": 1000}
  }
}
```

省略simulation或failStage为null演示成功；failStage分别设ASSET_CHECK/GENERATE/FINALIZE可重复演示三种失败。耗时允许部分覆盖，每值必须是0～10000整数；省略阶段默认2000，null值/越界422，未知字段/阶段/字符串/小数/数字枚举400，无任务写入。
连续提交不同配置验证隔离：一项指定失败、一项成功，单线程依次执行，阶段记录与结果各自保存。快速验证将三个耗时均设0，慢速观察可设10000。

服务启动将上次遗留QUEUED/RUNNING标FAILED/PROCESS_INTERRUPTED并保存INTERRUPTED事件，保留原阶段；关停也执行中断对账，不自动续跑。成功/失败终态与成功文件保留。
真实强杀恢复验证入口如下，仅用于本项目本地演示，保留卷；脚本把临时核对身份存在前端容器/tmp，不打印token：

```sh
docker compose exec -T -e VERIFY_MODE=restart-prepare frontend node --input-type=module < scripts/verify-004.mjs
docker compose kill -s SIGKILL backend
docker compose up -d --wait backend
docker compose exec -T -e VERIFY_MODE=restart-check frontend node --input-type=module < scripts/verify-004.mjs
```

仅支持单后端进程，不允许多副本共用队列/启动对账逻辑。进程被强杀可能留下未登记结果/临时文件；孤儿文件自动清理不在范围，演示重置卷时统一清理。
数据库不可写时可能无法保存最新失败，恢复服务重启后对账；没有自动重试、受理幂等、断点续跑、真实AI、支付或复杂模板后台。
原题业务闭环已按002～005完成，具体实现与运行证据见验收对照；上述可选扩展不在当前范围。
后端运行镜像暂复用固定Maven/Java镜像以简化演示，体积可在后续优化。

## 005个人记录与自动跟踪

打开 [制作记录](http://localhost:3000/history)，自动建立或复用当前匿名身份，恢复创建时间、状态、当前阶段、失败原因及成功图片。空记录提供模板入口，“加载更多”读取下一页；分页失败保留已加载记录和游标。
历史按created_at/id倒序，游标为末条本人任务UUID；同时间排序稳定，新插入不移动旧页。非法/他人游标400，不泄漏他人记录；无效limit400。接口详情见[005契约](specs/005-history-tracking/contracts/http-api.md)。

详情页和历史页分别维护当前身份/任务的跟踪器，每个未终结任务在前一次查询完成后1秒再查，绝不重叠；收到终态停止，无活动任务不继续请求。离开页面abort请求并清理计时器。
查询失败只暂停对应任务，保留最后快照并显示“恢复查询”；点击后继续读取服务端状态，不自动重发制作。旧请求、旧身份、低版本和相同版本不覆盖较新快照，终态不会回退。
历史首页同时读取active集合，即使某未完成任务在后续页也继续跟踪；记录按ID去重。浏览器时间比较保留服务端微秒精度。

演示：连续提交不同配置的任务，进入记录页查看各自结果；刷新可恢复未完成任务。浏览器临时离线只会出现查询暂停，恢复在线后点击“恢复查询”读取真实结果；后台服务无需停止。
记录页“切换为新访客”先卸载旧视图、撤销cookie，再建立新身份，旧任务后台继续；原身份没有找回入口。其他浏览器/无痕窗口天然隔离。
同源标签页共享cookie，成功切换后用不含token/身份的localStorage标记通知其他页清理并重新建立身份；禁用本地存储时其他标签需手动刷新。401也会清掉当前私有快照并停止查询。

本地验收已覆盖真实24条记录跨四页、三任务成功/失败隔离、旧身份撤销、新身份空记录；浏览器验证自动更新、离线暂停后恢复、历史刷新和375px布局。乱序/旧版本/跨标签清理及精确两周期无多余请求由可控组件/跟踪器测试证明，不混称浏览器故障注入。

## 006 MVP验收收尾

历史成功刷新使用最新首页游标，保留已展示快照并按ID去重；原末页刷新后新增超过一页的记录仍能继续加载，刷新失败保留原游标。
成功结果图片加载失败时单独提示并提供“重新加载图片”，保持任务成功；重试只重新读取同源私有图片，不重新提交制作。真实404后恢复文件已在浏览器验证。
本地10次API受理为10.460～25.796ms，每次制作均不少于6秒；另10次浏览器点击到确认新编号可见为273.088～498.503ms，全部小于2秒。逐次数据、方法和边界见[测量记录](docs/admission-measurements.md)。

```sh
docker compose exec -T frontend node --input-type=module < scripts/measure-admission.mjs
```

## 部署、回滚、投入与来源

部署固定源码commit并运行Compose，等待健康检查后验证列表/详情、一次成功任务及私有结果。发布前备份数据库和素材卷。
回滚到上一验收commit重建；V3等schema变更须同时恢复匹配备份，不能假定旧应用兼容新表。
当前无需公网部署。完整源码在本地独立Git目录 `xiaoying/material-studio/`，包含前后端、锁文件、SQL种子、CI及全部Spec Kit产物；验收commit由最终提交记录和工作日志确认。未创建远端仓库或向外发送源码。
实际投入按工具可核对时段记录在[docs/work-log.md](docs/work-log.md)，不虚构精确人工工时。

使用Codex辅助：原题→总体基线→独立feature规格→计划/契约/任务→测试先失败→最小实现→重构/完整检查→提交。
例如受理测试先得到404，再用独立数据库连接证明dispatch前已提交；005先用三任务503/迟到Promise/假时钟观察RED，再实现独立请求生命周期；微秒排序回归先失败，再修正浏览器时间精度丢失。
环境错误单独记录，不能算业务RED；未运行的远端CI不声称通过。全程未使用子智能体。

Spec Kit模板、脚本、skills来自[github/spec-kit](https://github.com/github/spec-kit)，本地CLI0.16.4生成。
UI参考frontend-design/ui-ux-pro-max技能并按图片样张用途调整；业务实现与几何PNG为本项目生成，未复用第三方业务代码或远程图片。

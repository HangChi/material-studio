# 素材工坊 · Material Studio

独立运行的图片模板与素材制作项目，需求见[原始题目](docs/requirements-source.md)。
**002～019已完成本地验收：完整制作闭环、三模板真实合成、素材复用、编辑与草稿、作品管理、可靠受理/监控、批次/标签/ZIP和本地账号恢复；第10项另完成阶段断点、多实例租约/执行代次、SSE及轮询回退。账号页已统一优化，审查发现的取消并发、列表乱序、空草稿及查询问题已修复。**
原题逐项实现、测试和运行证据见[验收对照](docs/acceptance.md)；012～015远端CI均已通过；本轮本地结果见[019验收记录](docs/019-validation.md)，尚未推送远端。真实TLS与公网部署未执行。
当前检查基线为134项前端测试及构建通过，Java沿用016的97项全量基线；批量工作台与验证边界见[019验收记录](docs/019-validation.md)。Java执行与前端状态组织见[异步流程与执行架构](docs/async-workflow.md)。

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
| [007](specs/007-creation-workbench/spec.md) | 幂等、重试/再次制作、事件详情、参数化真实明信片与下载 | 已完成本地验收；16/16任务 |
| [008](specs/008-creative-workflow/spec.md) | 编辑、全模板合成、素材库、草稿、历史管理、取消/排队、恢复/重试 | 已完成本地验收；15/15任务 |
| [009](specs/009-studio-identity/spec.md) | 全模块界面、品牌、导航、响应式排版与视觉精修 | 已完成本地验收；20/20任务 |
| [010](specs/010-reliable-operations/spec.md) | 交付验证、身份确认、动态模板、持久排队/配额、内部监控 | 已完成本地及远端CI验收；16/16任务，见[记录](docs/010-validation.md) |
| [011](specs/011-creative-library/spec.md) | 文件生命周期、批次、标签/批量管理/ZIP、本地账号/恢复与迁移 | 本地及远端CI通过；13/13任务，见[记录](docs/011-validation.md) |
| [012](specs/012-stage-checkpoints/spec.md) | 第10项第一增量：阶段断点续跑与安全回退/清理 | 本地及远端CI通过，7/7任务，见[记录](docs/012-validation.md) |
| [013](specs/013-worker-leases/spec.md) | 第10项第二增量：数据库租约、执行代次与过期接管 | 本地及远端CI通过，7/7任务，见[记录](docs/013-validation.md) |
| [014](specs/014-status-stream/spec.md) | 第10项第三增量：SSE快照、鉴权/连接回收、可靠查询回退 | 本地、真实代理/浏览器及远端CI通过，7/7任务，见[记录](docs/014-validation.md) |
| [015](specs/015-account-interface/spec.md) | 账号页视觉、表单交互与安全操作分区 | 本地、浏览器及远端CI通过，6/6任务；交付状态见[记录](docs/015-validation.md) |
| [016](specs/016-review-hardening/spec.md) | 并发取消、批次乱序、空草稿、批量读取与索引 | 本地容器检查通过，6/6任务，见[记录](docs/016-validation.md) |
| [017](specs/017-history-interface/spec.md) | 紧凑筛选与按选择展开批量管理 | 完整前端/浏览器1280与375px通过，5/5任务，见[记录](docs/017-validation.md) |
| [018](specs/018-guest-experience/spec.md) | 移除游客切换、账号入口/退出与过期提示 | 完整前端/真实游客界面通过，4/4任务，见[记录](docs/018-validation.md) |
| [019](specs/019-batch-workbench/spec.md) | 批量工作台、素材准备概览与紧凑上传 | 完整前端/桌面375px通过，4/4任务，见[记录](docs/019-validation.md) |

实施前读取 [AGENTS.md](AGENTS.md)、[约章](.specify/memory/constitution.md)和当前feature的spec/plan/contracts/tasks。
Spec Kit CLI0.16.4已初始化，仓库内保存模板、脚本及Codex skills。克隆后显式选择当前feature：

```sh
SPECIFY_FEATURE_DIRECTORY=specs/019-batch-workbench .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```

每个feature独立走 specify → plan → tasks → implement；每个业务行为记录RED → GREEN → REFACTOR。
当前交付入口为[019任务](specs/019-batch-workbench/tasks.md)及[验收对照](docs/acceptance.md)；现行业务接口以[016兼容说明](specs/016-review-hardening/contracts/http-api.md)、[014契约](specs/014-status-stream/contracts/http-api.md)、[011契约](specs/011-creative-library/contracts/http-api.md)、[010契约](specs/010-reliable-operations/contracts/http-api.md)及其引用的前序契约为准。001原始大任务清单保留溯源，不作为当前执行清单。

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
.env示例只含本地演示值；可配置MYSQL_DATABASE、MYSQL_USER、MYSQL_PASSWORD、MYSQL_ROOT_PASSWORD、WEB_PORT、COOKIE_SECURE、APP_ORIGIN，以及010的队列/配额项（见文末）。
Java素材默认STORAGE_ROOT=/data，Compose的asset-data命名卷持久保存；COOKIE_SECURE=true用于HTTPS，HTTP演示默认false。
反向代理提供HTTPS时设置APP_ORIGIN为公开源（如https://studio.example.com），同时设置COOKIE_SECURE=true。
修改数据库用户名/密码不会重设已初始化的MySQL卷，须同步数据库配置或仅在本地演示时重置卷。

Flyway自动执行V1模板种子、V2身份/素材/任务、V3执行配置/事件、V4配方/幂等、V5作品属性、V6执行恢复、V7受理锁、V8隔离审计、V9批次、V10标签、V11账号/多会话、V12标签精确排序规则、V13阶段断点及V14执行租约；兼容既有数据和旧Cookie，无需清空数据库。
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

前端入口从锁文件npm ci，再执行eslint、tsc、120个Vitest测试、next build。
后端入口mvn verify，执行95个Java测试（HTTP/MySQL集成及可控故障用例）并打包；数据库使用独立test-mysql，避免污染演示数据。
单测循环可覆盖命令，例如 `frontend-test npm test -- src/features/templates/catalog.test.tsx` 或
`backend-test mvn -B -Dtest=TemplateApiTest test`；首次需要先运行默认入口安装依赖。
GitHub Actions在push/PR执行上述两条容器入口；公开仓库[首次远端流水线](https://github.com/HangChi/material-studio/actions/runs/40901483518)已通过，历史远端结果见[015验收记录](docs/015-validation.md)，当前本地验证见[017验收记录](docs/017-validation.md)；017尚未推送远端。
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
| POST/GET/DELETE /api/session | 创建/读取/撤销当前cookie会话；返回user.id和可空username，绝不返回token/hash |
| POST /api/assets | multipart单file，201素材id/url/mimeType/sizeBytes/createdAt |
| GET /api/assets/{id}/content | 仅本人读取图片，其他身份404 |
| POST /api/jobs | {templateId,assetIds,simulation?}，保存任务/关联/配置后调度；202返回快照和Location |
| GET /api/jobs/{id} | 本人单条任务快照，查询不驱动执行 |
| GET /api/jobs?limit=20&cursor={id} | 本人历史分页，items/nextCursor；limit为1～50，默认20 |
| GET /api/jobs/active | 本人全部QUEUED/RUNNING，恢复首屏之外活动任务 |
| GET /api/jobs/stream?ids=UUID,UUID | 本人1～50项SSE最新快照/心跳/失效通知；初次全归属校验，终态/期限关闭，故障回退GET |

Cookie为HttpOnly/SameSite=Lax，数据库仅保存SHA-256哈希，客户端不得提交ownerId；删除身份撤销token但保留资源。
同一浏览器刷新保留身份，另一个浏览器/无痕窗口为新身份；清除cookie或撤销后无账号找回入口。

004已接通真实Java后台；003时期的PROCESSOR_NOT_AVAILABLE历史记录仍保留，不改写为新结果。
页面区分提交请求失败与已受理任务失败。网络、5xx或无效受理响应进入“结果尚未确认”，禁用重复提交；
007起可点击“安全重试本次提交”复用原Idempotency-Key及完整请求找回原任务；sessionStorage按本人/模板保存未确认请求，刷新可恢复。也保留“查看已受理任务”与“已核对，继续准备”的人工路径。
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

Java使用单工作线程与容量16的有界FIFO队列；提交先事务提交再调度，不等待制作完成。010起内存队列满或即时调度暂不可用时，已受理任务返回202并保持持久QUEUED，由250ms扫描补入执行，绝不转到请求线程制作。受理事务另检查全局/本人待办配额与提交速率，超限返回429且不创建任务；幂等回放优先于配额。
后台按素材检查ASSET_CHECK→图片合成GENERATE→结果整理FINALIZE执行，每一步开始和完成都独立写事件并递增任务版本。
状态为QUEUED→RUNNING→SUCCEEDED/FAILED；任一步失败中断后续阶段。无重试且未修改管理属性的成功任务恰6个事件/version6，图片先原子落盘，再提交成功状态。
延迟/文件IO不持有数据库行锁；阶段状态与事件处于同一短事务；GET只读且终态不会回退。
008起日光肖像、旅行明信片、周末拼贴均使用本人上传原图做真实Java2D合成，不调用AI；旧历史结果保持原样。

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

008最初从第一阶段重做；012起优先从摘要一致的已完成阶段恢复，缺失/损坏回退。013只接管已过期租约或旧版无租约RUNNING，不重置其他实例的有效执行；原QUEUED保留，最多三次执行，终态不重做，关停不把等待任务改失败。
真实强杀恢复验证入口如下，仅用于本项目本地演示，保留卷；脚本把临时核对身份存在前端容器/tmp，不打印token：

```sh
docker compose exec -T -e VERIFY_MODE=restart-prepare frontend node --input-type=module < scripts/verify-008.mjs
docker compose kill -s SIGKILL backend
docker compose up -d --wait backend
docker compose exec -T -e VERIFY_MODE=restart-check frontend node --input-type=module < scripts/verify-008.mjs
```

仅支持单后端进程，不允许多副本共用队列/启动对账逻辑。进程被强杀可能留下未登记结果/临时文件；孤儿文件自动清理不在范围，演示重置卷时统一清理。
数据库完全不可写时无法持久保存新状态；恢复后由扫描/租约到期接管。012/013已补阶段断点和多实例安全提交，仍无真实AI、支付或复杂模板后台。第10项真实故障验收使用独立项目，见文末；不要在原数据卷直接运行写fixture/强杀脚本。
原题业务闭环已按002～005完成，具体实现与运行证据见验收对照；后续用户授权扩展以007/008规格为准。
后端运行镜像暂复用固定Maven/Java镜像以简化演示，体积可在后续优化。

## 005个人记录与自动跟踪

打开 [制作记录](http://localhost:3000/history)，自动建立或复用当前身份（访客或账号），恢复创建时间、状态、当前阶段、失败原因及成功图片。空记录提供模板入口，“加载更多”读取下一页；分页失败保留已加载记录和游标。
历史按created_at/id倒序，游标为末条本人任务UUID；同时间排序稳定，新插入不移动旧页。非法/他人游标400，不泄漏他人记录；无效limit400。接口详情见[005契约](specs/005-history-tracking/contracts/http-api.md)。

详情、历史和批次页各自维护身份/任务跟踪器。014有EventSource能力时，一个源合并最多50项活动任务；变化快照按version合并，终态关闭。断线/无效帧/20秒静默立即GET补查，随后每项在上次查询完成1秒后再查，不重叠；无推送能力时直接原轮询。离开或换身份清理源、watchdog、请求及计时器。
查询失败只暂停对应任务，保留最后快照并显示“恢复查询”；点击后继续读取服务端状态，不自动重发制作。旧请求、旧身份、低版本和相同版本不覆盖较新快照，终态不会回退。
历史首页同时读取active集合，即使某未完成任务在后续页也继续跟踪；记录按ID去重。浏览器时间比较保留服务端微秒精度。

演示：连续提交不同配置的任务，进入记录页查看各自结果；刷新可恢复未完成任务。浏览器临时离线只会出现查询暂停，恢复在线后点击“恢复查询”读取真实结果；后台服务无需停止。
018起正常页面移除“切换访客”与游客编号，自动维持当前Cookie对应的身份。游客可直接制作，注册绑定当前身份保留作品；登录既有账号的迁移仍需在账号页显式选择。登录用户可管理账号或退出登录，退出只撤销当前会话，不删除作品。其他浏览器/无痕窗口天然隔离。
同源标签页共享cookie，账号登录/退出成功后用不含token/身份的localStorage标记通知其他页清理并重新读取身份；禁用本地存储时其他标签需手动刷新。401清掉当前私有快照、停止查询并提供重新登录入口。游客Cookie丢失后不能保证找回原记录，重建游客不会恢复旧身份。

本地验收已覆盖真实24条记录跨四页、三任务成功/失败隔离、旧身份撤销、新身份空记录；浏览器验证自动更新、离线暂停后恢复、历史刷新和375px布局。乱序/旧版本/跨标签清理及精确两周期无多余请求由可控组件/跟踪器测试证明，不混称浏览器故障注入。

## 006 MVP验收收尾

历史成功刷新使用最新首页游标，保留已展示快照并按ID去重；原末页刷新后新增超过一页的记录仍能继续加载，刷新失败保留原游标。
成功结果图片加载失败时单独提示并提供“重新加载图片”，保持任务成功；重试只重新读取同源私有图片，不重新提交制作。真实404后恢复文件已在浏览器验证。
本地10次API受理为10.460～25.796ms，每次制作均不少于6秒；另10次浏览器点击到确认新编号可见为273.088～498.503ms，全部小于2秒。逐次数据、方法和边界见[测量记录](docs/admission-measurements.md)。

```sh
docker compose exec -T frontend node --input-type=module < scripts/measure-admission.mjs
```


## 007 制作工作台拓展

本迭代包含用户选定的全部范围：提交幂等、失败重试、执行详情、PNG下载、再次制作，以及真实明信片合成与模板参数化。[规格](specs/007-creation-workbench/spec.md)、[接口契约](specs/007-creation-workbench/contracts/http-api.md)、[任务与验证状态](specs/007-creation-workbench/tasks.md)。

**使用方式**：打开旅行明信片，上传两张图片，在“作品设置”中输入最多40字单行标题、选择奶油纸/海蓝信笺，以及横版1200×800/方版1000×1000。每张图片可分别调整横向/纵向位置（0～100%）和放大（1～3倍），也可重置。构图预览实时更新；提交后由Java后台GENERATE阶段渲染，FINALIZE阶段原子发布私有PNG。预览字体由浏览器提供，下载作品由容器中的文泉驿正黑渲染中文。

成功卡片提供“下载 PNG”和“再次制作”；失败卡片提供“重试失败任务”。重新制作从第一步开始，复用原素材顺序和配方、保留模拟耗时、清除模拟failStage，新任务关联原任务；原记录/结果不变。已失效素材会提示重新上传。历史旧任务无配方时，明信片采用默认参数。点击“查看执行详情”查看阶段事件；活动任务版本变化时更新已展开详情，收起/离开停止查询。

| 新增/扩展接口 | 行为 |
| --- | --- |
| POST /api/jobs，Idempotency-Key头 | 可选key兼容旧客户端；相同本人key+规范化内容返回同任务最新快照；内容冲突409，非法key400 |
| POST /api/jobs/{id}/recreate | 必需key；仅本人终态任务；202新任务，可安全重试同操作 |
| GET /api/jobs/{id}/recipe | 本人素材ID顺序、配方参数和sourceJobId |
| GET /api/jobs/{id}/download | 本人成功PNG附件；缺失/非成功404 |
| GET /api/jobs/{id}/events | 已有阶段事件API，新增前端时间线 |

可选parameters仅用于demo-postcard，省略时采用默认标题“旅途来信”、奶油/横版/居中不放大。提供时必须包含title/palette/format/crops；crops恰2项，每项x/y为0～1、zoom为1～3的有限数字。前后端采用cover×zoom及剩余空间位置的相同裁剪规则。详细示例见契约。

幂等操作以(owner_id,request_key)为数据库唯一键，在同一短事务保存任务/配方/操作/素材关联，并序列化同身份受理；文件渲染不持有该锁。重复操作不重新调度，008起已受理任务中断会在三次执行上限内恢复，终态任务不再重新执行。

前端在未确认提交时锁定输入，允许重试同一载荷。浏览器禁止sessionStorage时，当前页面仍可安全重试，但刷新不能恢复该标识；页面会提示保留当前页。未绑定匿名身份丢失仍无找回入口，可在丢失前绑定账号。未确认操作中的素材ID/参数仅存当前浏览器会话，不含cookie令牌。

实际运行链路验证（生成合成/失败/重试演示任务，完成后撤销脚本身份，保留文件与记录）：

```sh
docker compose exec -T frontend node --input-type=module < scripts/verify-007.mjs
```

本地测试为44项Java与78项前端测试，配套lint/typecheck/build通过；浏览器验证双图上传/参数编辑/真实结果/下载/再次制作和375px布局。截图：[真实结果与执行详情](docs/007-result.jpg)、[桌面编辑器](docs/007-editor-desktop.jpg)、[小屏编辑器](docs/007-editor-mobile.jpg)。

字体来源：Ubuntu官方软件包fonts-wqy-zenhei（文泉驿正黑）；安装在backend Dockerfile的tools基础层，测试与运行共用字体环境。首次构建需访问Ubuntu软件源；未增加应用服务或真实AI依赖。


## 008 持续创作与可靠任务

本轮七项全部实现，详见[规格](specs/008-creative-workflow/spec.md)、[契约](specs/008-creative-workflow/contracts/http-api.md)与[任务](specs/008-creative-workflow/tasks.md)。

| 功能 | 操作与行为 |
| --- | --- |
| 编辑后再次制作 | 在历史卡片点击“编辑此作品”，恢复本人原素材顺序、标题、裁剪、配色和比例；修改后提交关联的新任务，原记录保留 |
| 全模板真实合成 | 肖像1000×1200、明信片1200×800或1000×1000、拼贴1200×900；输出实际使用上传图片，拼贴保持三图顺序 |
| 素材库 | 每个上传位点击“从素材库选择”，分页预览/复用本人已上传图片；其他位置已使用的素材不可重复选择 |
| 自动草稿 | 当前浏览器localStorage按本人/模板/编辑来源保存素材ID和参数；刷新恢复，可清空；上传中的本地File不保存，存储错误明确提示 |
| 历史管理 | 按名称或模板名、模板、状态、起止日期、收藏、隐藏筛选；展开“管理作品”重命名、收藏、隐藏，隐藏列表可恢复 |
| 取消/排队 | 等待任务显示前方任务约数；等待/运行任务可取消，重复取消安全，阶段边界停止；数据库FAILED/JOB_CANCELLED在界面显示“已取消” |
| 恢复/有限重试 | 008当时同一编号从第一阶段重做；012已增加有效断点续跑，013增加租约接管，仍最多三次执行及默认1秒/2秒退避 |

指定模拟失败、素材失效、用户取消不会自动重试。执行次数包含初次与恢复，不是额外重试三次。未完成任务持久保存在MySQL，每250ms补入每实例单工作线程的有界队列；超过内存容量也继续补入。013支持共享数据库/文件卷的多个后台，代次校验拒绝旧线程提交。绘图/文件操作可能继续当前不可分割步骤，但取消先提交时不能再提交成功。

GET /api/assets新增本人分页；POST /api/jobs新增可选sourceJobId；GET /api/jobs新增全历史筛选；PATCH /api/jobs/{id}/library管理显示名/收藏/隐藏；POST /api/jobs/{id}/cancel取消。任务快照补充displayName/favorite/hidden/queueAhead/attempt/nextAttemptAt。完整字段边界见契约。

```sh
# 实际Next→Java→MySQL/素材卷链路，生成并保留演示记录，结束撤销脚本身份
docker compose exec -T frontend node --input-type=module < scripts/verify-008.mjs
# 创建专用慢任务后真实强杀恢复；同编号成功、排队任务保留
docker compose exec -T -e VERIFY_MODE=restart-prepare frontend node --input-type=module < scripts/verify-008.mjs
docker compose kill -s SIGKILL backend
docker compose up -d --wait backend
docker compose exec -T -e VERIFY_MODE=restart-check frontend node --input-type=module < scripts/verify-008.mjs
```

本地最终53项Java测试/打包、87项前端测试/lint/typecheck/生产构建通过。53项含容量1下恢复六项持久积压且各执行一次、临时IO恢复/耗尽、领取前数据库错误上限。实际强杀后原编号在第2次执行成功，等待项第1次成功。浏览器验证素材复用、编辑、刷新草稿、作品管理/搜索/隐藏恢复、取消和375px两页无横向溢出。

本轮默认前端测试入口的全新npm ci遇到官方源下载长时间等待而中止，最终通过锁文件一致的Docker依赖层构建检查镜像，挂载当前src在容器内执行同样的lint/typecheck/test/build；生产镜像构建通过。首次Maven下载TLS中断后复用已验证容器依赖缓存；Dockerfile使用BuildKit缓存，未关闭TLS或修改依赖版本。详情见工作日志，不将网络失败记作业务测试失败。

截图：[桌面历史工作台](docs/008-history-desktop.jpg)、[桌面编辑与草稿](docs/008-editor-desktop.jpg)、[375px历史页](docs/008-history-mobile.jpg)、[375px编辑页](docs/008-editor-mobile.jpg)。

## 部署、回滚、投入与来源

部署固定源码commit并运行Compose，等待健康检查后验证列表/详情、一次成功任务及私有结果。发布前备份数据库和素材卷。
回滚到上一验收commit重建；V3等schema变更须同时恢复匹配备份，不能假定旧应用兼容新表。
当前无需公网部署。完整源码在本地独立Git目录 `xiaoying/material-studio/`，包含前后端、锁文件、SQL种子、CI及全部Spec Kit产物；009基线为 `af006c8`，010监控实现提交为 `36641f4`；最新交付及远端CI见[014验收](docs/014-validation.md)。交付时用 `git rev-parse HEAD` 确认包含本文档的完整提交号。源码已按用户授权推送至公开仓库 [HangChi/material-studio](https://github.com/HangChi/material-studio)。
实际投入按工具可核对时段记录在[docs/work-log.md](docs/work-log.md)，不虚构精确人工工时。

使用Codex辅助：原题→总体基线→独立feature规格→计划/契约/任务→测试先失败→最小实现→重构/完整检查→提交。
例如受理测试先得到404，再用独立数据库连接证明dispatch前已提交；005先用三任务503/迟到Promise/假时钟观察RED，再实现独立请求生命周期；微秒排序回归先失败，再修正浏览器时间精度丢失。
环境错误单独记录，不能算业务RED；未运行的远端CI不声称通过。全程未使用子智能体。

Spec Kit模板、脚本、skills来自[github/spec-kit](https://github.com/github/spec-kit)，本地CLI0.16.4生成。
UI参考frontend-design/ui-ux-pro-max技能并按图片样张用途调整；业务实现与几何PNG为本项目生成，未复用第三方业务代码或远程图片。

## 009 · 工坊 UI 与品牌

已完成全部既有模块的视觉优化：模板库/详情、素材上传/复用、明信片编辑、草稿提交、身份、历史筛选、任务/结果、作品管理及执行详情。使用工坊青与纸白、中文衬线标题和统一线性图标；原创叠片裁切框 Logo（`frontend/public/studio-logo.svg`）及站点图标，无新增依赖。导航只强调当前栏目。

容器内 lint/typecheck、90项前端测试和生产构建通过，生产前端已在本地3000重建运行。浏览器检查1280px与375px的三个主要页面，均无页面横向溢出；素材复用、实时构图、草稿提示及事件详情操作通过。本轮没有后端变更，未重跑Java或远端CI。

截图：[模板库](docs/009-catalog-desktop.png)、[制作台](docs/009-editor-desktop.png)、[制作记录](docs/009-history-desktop.png)、[手机模板库](docs/009-catalog-mobile.png)、[手机制作台](docs/009-editor-mobile.png)、[手机记录](docs/009-history-mobile.png)。规格与证据见[009](specs/009-studio-identity/spec.md)和[工作日志](docs/work-log.md)。

009截图反馈已进一步精修上传区：单图改为选图预览与说明双栏，多图统一卡片；本地选择/更换图片入口收进预览区，草稿、任务核对、提交收束到同一操作带。容器90项测试、lint、typecheck与生产构建再次通过，本地已更新；375px单/双/三图模板均无横向溢出。[优化后的上传区](docs/009-upload-refined-desktop.png)、[手机](docs/009-upload-refined-mobile.png)、[多图](docs/009-upload-multiple-desktop.png)。

制作记录卡进一步改为紧凑作品行：左侧缩略预览，右侧集中状态/时间/阶段和主要操作，管理及执行详情归入底部展开区。改名、收藏/隐藏表单统一排版，下载强调为主操作。容器90项测试、lint/typecheck与生产构建通过；1280px与375px实际展开检查无页面横向溢出，本地3000已更新。[桌面记录卡](docs/009-record-refined-desktop.png)、[手机记录卡](docs/009-record-refined-mobile.png)。

明信片编辑区已重排为左预览右设置，标题与字数同行，裁剪改为短标签/滑轨/数值行，重置收进图片标题栏。预览显示当前纸张、尺寸和比例，手机先预览后设置。容器90项测试与lint/typecheck/生产构建通过；实际验证裁剪键盘更新、纸张/方版切换及375px无横向溢出。[桌面工作台](docs/009-postcard-refined-desktop.png)、[手机工作台](docs/009-postcard-refined-mobile.png)。

根据视觉反馈进一步收敛：首页直接展示模板，去掉装饰插图、重复英文/口号，采用较克制的系统字体与控件分组。编辑/记录所有下拉框箭头统一向内14px，文字右侧留38px，手机编辑下拉单列排列。容器90项测试、lint/typecheck/生产构建通过；浏览器确认编辑与筛选的选择功能和375px无横向溢出。本地3000已更新。[首页](docs/009-quiet-catalog-desktop.png)、[编辑及箭头](docs/009-quiet-editor-desktop.png)、[手机编辑](docs/009-quiet-editor-mobile.png)。

页脚已去掉重复Logo及首页链接，以轻量文字呈现并与主内容边界对齐；1280px/375px实际检查通过。容器lint/typecheck/生产构建通过，本地已重建。[页脚预览](docs/009-footer-final.png)。所有本地UI更改均已纳入Git提交。


## 010 · 可靠受理与内部监控

本轮实现执行顺序1～5：独立空卷启动/公开仓库CI/真实双标签/高对比模式验证；切换访客前确认；历史模板筛选从Java加载；内存队列满仍持久排队；事务配额及内部监控。最终95项前端、59项Java和各自构建通过，运行证据见[010验收](docs/010-validation.md)。

默认配置：STUDIO_QUEUE_CAPACITY=16内存等待槽位，STUDIO_MAX_PENDING=100全局未完成上限，STUDIO_MAX_PENDING_PER_USER=20本人未完成上限，STUDIO_SUBMISSIONS_PER_MINUTE=10本人滚动60秒新增任务上限；均为正整数，在.env调整后重建backend容器。超额429返回ADMISSION_LIMIT或RATE_LIMITED，Retry-After为60秒；拒绝不产生业务记录，相同key内容回放不占新额度。取消释放未完成额度，但不抹去最近一分钟的创建次数。verify-005创建24项记录需尊重退避，默认约增加两分钟等待。

监控只在Java容器网络提供，浏览器API代理返回404，无用户/任务/文件标识：

```sh
docker compose exec -T backend curl -fsS http://localhost:8080/actuator/studio
```

返回状态计数、取消单列、非取消终态失败率、首次排队及已完成阶段耗时样本/总毫秒/平均毫秒、额外执行次数，以及本进程扫描失败和最近成功时间。统计按现有记录全量聚合，非持久时序监控平台；扫描指标重启清零，业务/耗时指标保留。阶段样本允许管理属性造成version跳号，不纳入未完成/失败阶段。数据库完全不可用时监控也可能返回错误，不能把查询失败当作零任务。

完整压力链路使用独立项目名和小限额，勿对原数据卷重置；命令见[010 quickstart](specs/010-reliable-operations/quickstart.md)。浏览器验收使用127.0.0.1，与原localhost Cookie区分；仅换端口不能隔离身份。

## 011 · 执行顺序6～9

6. **文件生命周期**：内部`/actuator/storage`只读盘点24小时以上的未登记孤儿；快照加显式确认后隔离，保留7天再确认清理，审计保留。保护所有登记素材，避免破坏本机草稿。Next不代理维护入口，无自动定时删除。
7. **批量制作**：[批量制作](http://localhost:3000/batches)一次创建1～10项，每项独立模板/素材，明信片用默认配方。整批事务受理，任一校验/配额失败全部回滚；提交后逐项跟踪，可取消未完成项。同一提交标识安全回放，刷新/跨页恢复服务端批次。
8. **作品组织**：标签最多10个，每个20码点；选择已加载作品最多50项，批量收藏、取消收藏、隐藏、恢复或覆盖标签。ZIP最多20项成功PNG、原图合计64MiB。任一越权整批拒绝，隐藏可恢复。
9. **账号与恢复**：[账号](http://localhost:3000/account)绑定3～32位用户名与12～128字符密码，保留当前访客数据；跨设备登录、退出仅撤销本会话。恢复码只显示当次，需自行保存，可凭密码重新生成。用恢复码重置密码会轮换码并撤销全部旧会话。迁移访客资料需勾选并确认，活动任务/提交标识冲突会拒绝；两个账号不可合并。

接口与状态码见[011契约](specs/011-creative-library/contracts/http-api.md)。本机未提交草稿不自动跨设备同步；未绑定访客丢失Cookie不可恢复；密码和恢复码均丢失时不提供绕过找回。011当时为单实例全任务重试；012～014已扩展断点、租约和SSE，邮件或外部身份服务仍不提供。

本地112项前端/78项Java及构建通过；真实V7→V12升级保留旧Cookie、成功作品与幂等回执。混合批次、ZIP、迁移、恢复、文件隔离和到期审计在独立卷验证；到期仅回拨测试审计时间模拟7天。桌面和375px三个页面无横向溢出。截图、命令和CI见[011验收](docs/011-validation.md)。

## 第10项 · 执行架构升级

三项分别立项、TDD和验收：[012阶段断点](docs/012-validation.md)在真实SIGKILL后同编号成功、合成仅一次；[013租约](docs/013-validation.md)在双后台强杀一个后由另一个接管，DB时钟防节点快钟抢跑，代次fence和独立文件名防旧线程覆盖；[014推送](docs/014-validation.md)验证真实Next代理首帧、分块、终态EOF、断开不取消与撤销失效，前端自动回退原查询。

默认仍单后台，每实例一个worker/16等待槽；需要扩为两个且已共享MySQL/素材卷时：

```sh
STUDIO_LEASE_MS=15000 docker compose up --build -d --wait --scale backend=2
```

租约最小3000ms，每lease/3续期，过期不能复活；恢复/重试仍共享三次预算。阶段内部不做百分比断点，失效线程可能继续计算但无提交权，不承诺恰好一次计算或线性提速。

SSE每跟踪器一个源、最多50项；每后台64连接/每owner2、10秒心跳、55秒寿命，20秒静默触发补查/轮询。服务器仍周期读MySQL，无MQ/Redis或生产广播总线；不提供跨地域文件复制、生产负载均衡或吞吐SLA。终态已登记结果在提交确认丢失时仍受保护，异常不能删除成功PNG。

当前120项前端/95项Java与各自构建通过，桌面1280px/小屏375px制作与执行事件验收通过。原3000在本地私有备份后保留卷升级，未在原卷故障注入或写fixture；最新CI、具体日志和边界见[014验收](docs/014-validation.md)。历史各节的数字是当时阶段记录。

015账号UI已完成桌面/375px和CI验收，详见[015验收](docs/015-validation.md)。按用户要求，交付后本项目所有服务与测试容器已关闭，数据卷保留；需要再次使用时，在本目录执行 `docker compose up --build -d`。

## 017 · 制作记录工具区

筛选区重排为常用条件与按需展开的日期/标签，批量管理根据选择展开，避免禁用按钮堆叠。现有本地前端已重建，可访问[制作记录](http://localhost:3000/history)。130项前端测试、lint/typecheck/构建通过；桌面和375px真实界面、已知验证边界及截图见[017验收](docs/017-validation.md)。当前服务保持运行。

## 018 · 游客与账号体验

游客维持当前浏览器身份，不再提供切换入口或显示游客编号。登录用户可管理账号及退出登录，会话过期有明确登录指引。131项前端测试及完整检查通过，原游客作品和登录入口已在真实浏览器核对，项目保留运行。详见[018验收](docs/018-validation.md)。

## 019 · 批量制作工作台

[批量制作](http://localhost:3000/batches)已重排为紧凑制作清单和准备概览，单/多图模板、已就绪项数与图片数一目了然，手机纵向操作。134项前端及完整检查通过，真实素材库复用、1280/375px多项布局已核对；截图和边界见[019验收](docs/019-validation.md)。项目保持运行。

## 020 · 全站界面减法

五类页面及导航已统一简化：删减宣传文案、装饰插画与重复图标，减少嵌套边框，账号改为单列表单。三条内置模板说明通过V16改为具体用途，用户数据和业务规则保持不变。本轮实际完成两轮前端完整检查、Java全量回归、前后端重建及桌面/375px逐页验收；当前134项前端、97项Java和构建均通过，服务继续运行。[验收与截图](docs/020-validation.md)记录了命令和边界；未执行真实账号凭据操作、远端推送或新CI。

## 021 · 右上角登录

全站登录入口已独立放在右上角，已有账号显示用户名；主导航只保留三个制作入口。账号页去除重复标题，集中登录、注册和恢复表单。实际完成入口行为RED/GREEN、139项前端和完整构建、生产重建及1280/375px真实界面检查，服务继续运行。[021验收与截图](docs/021-validation.md)记录了命令和未执行的真实凭据操作边界；本轮无后端变化。

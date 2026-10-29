# 工作与验证记录

## 2026-10-29 · 前置工作

- 范围：独立项目初始化、SDD 设计和 TDD 开发准备，不实现业务。
- 投入：工具时间可核对的初始化/设计/检查时段为 01:02:35～01:11:22（Asia/Shanghai），8分47秒；此前阅读需求、技能及环境探测未独立计时，不虚报精确总时长。
- 已读取原始 README R-01～R-14；没有提供 UI-01～UI-03 附件，按允许自行设计处理。
- 实际执行 `specify init ...`，安装 CLI 0.16.4 自带模板、脚本与 Codex skills；初始化独立 Git main 分支。
- 本轮不运行应用，因此没有业务测试 RED/GREEN 记录；后续每个行为增量必须追加真实证据。
- 环境探测：Docker CLI 29.9.2 存在；当前受限会话访问 Docker socket 返回 permission denied。
  此结果不能证明 Docker 服务未运行，也不能算容器验收失败；容器运行能力尚未验证。
- 取舍：本轮先消除需求与接口歧义，不创建占位业务实现、不提交虚假的 CI 通过记录。

### 本轮检查结果

- `resolve-template.sh constitution-template/spec-template`：成功解析官方本地模板。
- `setup-plan.sh --json`、`setup-tasks.sh --json`：成功，当前 feature 目录正确。
- `check-prerequisites.sh --json --require-tasks --include-tasks`：通过，识别 research/data-model/contracts/quickstart/tasks。
- 逐文件 `bash -n`：Spec Kit Bash 脚本语法通过。
- 文档静态检查：44 个任务编号连续，均有路径；故事任务为 5/8/8/9；仅 T001 已完成。
- 规格质量检查 16/16；文档内本地链接均存在，无遗留参数占位符；`git diff --check` 通过。
- 原题副本与上级 README 字节相同，SHA-256 为 `fe3f409467377b0480f4c886639f85d1469e4123c773c17a16269ea79b71d74c`。
- 没有 extensions.yml，constitution/specify/plan/tasks 的前后扩展钩子均不存在，无钩子待执行。
- 分阶段提交：初始化与约章 → 需求规格 → 技术设计与测试计划 → 任务拆分和前置验证。
- 业务测试、应用构建、CI、容器启动、界面验收：未执行，留待实现阶段。下一任务 T002。

## 2026-10-29 · 逐feature开发：002模板浏览

- 起始工具时刻：01:15:33（Asia/Shanghai）。用户授权将001保留为总体基线，并从002独立规格进入实现。
- 已创建002～005规格、迭代图；只展开002计划与17项任务，003～005未实现。
- Docker29.9.2可访问（通过工具授权后确认），应用操作全部在容器内。
- 环境修复：基础镜像npm10.9.9首次install报edgesOut空值；固定npm11.6.2后成功生成锁文件。
  这属于环境错误，不计RED。Maven仅使用官方Central镜像以避免无关snapshot仓库探测。
- 后端RED：`docker compose --profile test run --rm backend-test mvn -B -Dtest=TemplateApiTest test`，
  01:25:07：3个用例均断言预期200而实际404，Spring/真实MySQL正常，符合未实现接口的预期失败。
- 后端GREEN：同一命令，01:26:34：3/3通过；Flyway建立两类三模板，Java/MyBatis读取，本地PNG字节断言通过。
- 代理RED：`docker compose --profile test run --rm frontend-test npm test -- src/lib/api-proxy.test.ts`，
  01:26:51：8个断言因未实现返回501失败，覆盖透传/故障/白名单/方法限制。

- 代理GREEN：同一命令，01:27:19：8/8通过。
- 列表RED：`frontend-test npm test -- src/features/templates/catalog.test.tsx`，01:27:21：加载/列表/空态/失败反馈缺失；
  清理用例因尚无fetch还出现一次测试前置访问错误，随后补显式调用断言，不能将该TypeError单独作为有效RED证据。
- 列表GREEN/详情RED：01:28:26，列表5/5通过（包括忽略abort的迟到响应和卸载abort）；详情3个目标UI断言因缺少内容失败。
- 后端详情RED：01:27:51，新增详情200和错误code断言失败（404/无code）；其余4项通过。
- 后端详情GREEN：`backend-test mvn -B verify`，01:29:10：6/6通过且打包成功，无跳过。
- 前端GREEN：`frontend-test sh -c 'npm run lint && npm run typecheck && npm test && npm run build'`，
  01:29:43起：lint/typecheck通过、16/16测试通过、Next生产构建通过。
- 明确取舍：002使用Compose独立真实MySQL库进行集成测试，无需Testcontainers；003事务设计阶段重新评估。

### 干净安装、容器与浏览器验收

- 首次镜像构建npm ci发现旧锁文件缺失@emnapi可选依赖，不将已有node_modules下通过视为干净安装成功。
  修复：在匿名空依赖卷中重新生成锁文件，并将ESLint固定9.39.5满足Next插件peer范围，不使用--force/--legacy-peer-deps绕过。
- `docker compose --profile test run --rm frontend-test`，01:33：干净npm ci、lint、tsc、16/16测试、生产build全部通过。
- `docker compose config --quiet`通过；`docker compose up --build -d`在新建mysql-data卷成功初始化并启动三服务。
- 运行中的frontend容器执行HTTP断言，Next→Java→MySQL分类/全部模板/筛选/空结果/三个详情/404错误码/PNG/非法路径/POST405全部通过。
- 浏览器桌面1280px：三张封面naturalWidth>0，文档宽等于视口；社交分类仅1卡；Tab到卡片，焦点outline=3px，Enter可进入详情。
- 浏览器375×812：列表创意分类2卡，详情3张/JPEG、PNG/5MiB文案正确；列表和详情scrollWidth=375，图片正常，无横向溢出。
- 浏览器未知模板显示“模板不存在”；临时仅停止本项目backend，页面显示查询错误与“重新加载”；
  恢复backend并等healthy，点击重试恢复3模板。停止期间未修改数据库，最终三应用服务均running/healthy。
- 截图本地临时产物：/tmp/material-studio-desktop.jpg、/tmp/material-studio-mobile.jpg；测试数据库可随测试profile重建。
- GitHub Actions push/PR配置已写入，复用上述容器入口；未创建远端或触发远端CI，不声称远端通过。
- Flyway在MySQL8.4上初始化/查询实际通过，但打印其最高测试数据库版本为8.1的兼容提示；后续升级评估，当前没有迁移失败。
- 16项规格质量检查、17项任务格式/依赖、文档本地链接、原题副本一致性和git diff --check通过。
- 可核对本轮时段：01:15:33～01:37:40（22分07秒，不含最后交付整理）；未使用子智能体。
- 002完成，003～005仅规格基线。下一步先为003生成计划/契约/任务，再执行身份/上传/受理TDD。

## 2026-10-29 · 003素材上传与任务受理

- 01:40:03工具时刻开始；分支003-upload-submission，保持单智能体，复用002容器测试环境。
- 规格细化：默认worker未接通时明确失败，最近50条手动核对用于不确定提交；004/005能力不提前宣传。
- Session RED：01:45:46，3个测试因缺少端点返回404失败；Session GREEN：01:48:11，同一测试入口3/3通过。
- 修复一次实现错误：V2外键排序规则与V1模板表不一致；统一utf8mb4_unicode_ci后只重建tmpfs测试库，演示库未改。
  该迁移错误不计行为RED。存储token哈希、cookie属性、复用和撤销均由真实HTTP/MySQL断言。
- Proxy RED：01:46:21，新契约8项中7项失败（现有只读405/404）；GREEN：01:47:38，新8项+原8项共16/16通过。
  覆盖Cookie、多Set-Cookie、原multipart流、Location、Origin限制、路由/方法边界；002非法路由用例由jobs改为admin，因为jobs本期已允许。

- Asset RED：01:49:15，5个上传/私有读取用例因缺少业务失败；GREEN：01:50:17，身份3+素材5共8/8通过。
- 用户“继续”后恢复执行；中间跨时段不计开发工时。后续工具日志UTC 02:30起，对应上海10:30起。
- Upload UI RED：10:30:44，6个用例缺少图片输入与行为；GREEN：10:40:30，6/6通过（含替换/移除迟到响应、解码/类型/大小/像素、预览释放与abort）。
- Job RED前修复测试基础设施：MySQL8.4开启binlog时普通用户无法创建故障注入触发器；仅tmpfs test-mysql加--skip-log-bin，生产mysql不改。
  重建测试库后10:31:22受理7/7均为行为断言失败、无环境错误；默认处理器契约10:41:11也观察到RED。

- Backend GREEN：10:42:09，完整mvn verify共22/22通过且打包成功；包括跨连接已提交可见、阻塞worker仍202、有序关联、触发器故障回滚和无dispatch、终态查询只读、默认处理器明确拒绝。
- Form RED：10:43:11，5个受理表单场景因缺少身份/素材/提交控件失败。

- Form GREEN：10:44:10，5/5通过；Unknown/detail integration RED：10:44:40，新增4个未知结果用例和详情接入断言失败，旧7个通过。
- Frontend GREEN：10:46:26，lint/typecheck、39/39测试及Next生产构建通过；覆盖网络丢失/5xx/无效202、核对失败保持禁用、核对成功后显式继续且无自动POST。
- 真实业务边界保持：默认worker返回持久FAILED/PROCESSOR_NOT_AVAILABLE，不假装三阶段成功；004仍待实现。

### 003运行与浏览器验收

- 首次Docker重建因Maven Central连接超时失败；官方仓库curl确认200后重试成功。没有把网络错误当RED，也没有更换依赖来源或跳过验证。
- 初次真实Origin写入验收发现Next内部0.0.0.0监听地址导致合法请求403；补2个容器Host/公开HTTPS Origin回归测试，先RED（2失败/8通过），再修复为入站Host/协议或显式APP_ORIGIN，继续拒绝跨站写入。
- 最终完整前端检查通过：lint、typecheck、41/41测试、Next生产构建。APP_ORIGIN只在服务端使用，不信任任意X-Forwarded-Host。
- `docker compose up --build -d`成功；既有002演示数据库自动应用V2，asset-data命名卷挂载/data。
- `docker compose exec -T frontend node --input-type=module < scripts/verify-003.mjs`通过：真实Origin/Cookie、multipart、图片原字节读回、陌生身份404、错误参数不受理、202持久失败、单条/最近记录核对及拒绝ownerId字段。
- 内置浏览器自动化接口当前不可用；原生Chrome首次导航审核为保护既有页面而拦截，改为独立空白验收窗口后完成，未操作或提交其他页面。
- Chrome真实验收：上传项目自制portrait/postcard PNG并预览；移除第二槽后提交禁用；重新上传解锁；202后清空槽位并显示持久任务32667803-c547-4780-a820-f6d74b84fac6与FAILED/处理器不可用原因。
- 刷新后不自动轮询；手动查看已受理记录可恢复同一任务编号，证明cookie/数据库记录保留。
- Chrome DevTools临时设375×812，触屏滚动确认单列表单、按钮和长任务ID/错误原因正常换行，无视觉横向溢出；随后退出响应式模式并关闭DevTools。
- /tmp/material-studio-003.png为桌面回执截图，/tmp/material-studio-003-mobile.png为375px证据，/tmp/material-studio-003-upload.png为双槽上传证据（临时产物未提交）。
- 未知结果的网络/5xx/无效202及核对失败门禁由组件测试验证；未伪称浏览器丢包注入。HTTPS配置有单测，未做真实TLS部署。远端CI未运行。
- 可核对时段：01:40:03～01:50:17（10分14秒），10:30:03～11:22:10（52分07秒），合计62分21秒观测窗口，含下载/验证与整理，不等同纯人工时；两段之间等待用户继续不计入。

- 最终同步README、路线图、spec状态和quickstart；003共18/18任务完成。交付前再次确认frontend/backend/mysql均healthy，保留运行供预览。

## 2026-10-29 · 004异步流水线

- 本轮启动004（首个显式时钟11:29:22，前置读取不计入可核对时段）；独立004-async-pipeline分支，speckit-plan→tasks→implement，单智能体串行。
- 规格质量清单16/16已勾选、无未决项；约章设计前后均通过；无extensions.yml钩子。
- 计划/研究/数据模型/契约/quickstart已生成，17任务（US1四项、US2两项及基础/可靠性/交付）；先完成后端MVP再失败控制、可靠性及界面。
- 公开方案采用有界单线程队列与按任务保存模拟配置，不升级依赖，不实现005轮询。

- Pipeline API RED：11:31:30，两用例分别因003占位FAILED及simulation未知400失败。11:32:02扩展为7用例全部行为失败，0环境错误。
- Pipeline GREEN：11:32:58，7/7通过；完整Java回归11:33:32，29/29与mvn verify打包通过。
- 新增V3阶段事件/执行配置，行锁下状态与事件同事务；无HTTP查询仍完成，六事件顺序、三个指定阶段失败、终态10次稳定、私有PNG、写盘失败和按序独立配置均已验证。
- 测试与构建未升级依赖；003默认不可用测试按新真实后台契约更新，既有受理事务/隔离测试仍通过。启动/关停中断可靠性尚待后续测试实现。

- Lifecycle RED：11:34:20，队列容量1/FIFO/后台线程测试通过，启动与关停两个用例因仍为QUEUED失败，0环境错误。
- Lifecycle GREEN：11:35:07完整Java32/32及打包通过；启动/关停标PROCESS_INTERRUPTED并持久事件，终态不改、重复初始化不再加版本；队列满202持久QUEUE_REJECTED，绝不CallerRuns。
- 前端RED：events/result白名单两项、阶段/结果与查询异常保留两项失败，原19项仍通过；GREEN：完整45/45、lint、typecheck与Next生产构建均通过。成功图片使用原生同源请求（Next Image unoptimized），保留cookie归属校验。

- 补充一致性回归（不伪称新的RED）：事件INSERT触发器故障导致状态版本一并回滚、非法/重复阶段转换无效、终态重复worker执行不增加事件、受理后丢失素材仅ASSET_CHECK失败。完整35/35在11:36:28通过。
- 契约审查发现Jackson默认允许数字枚举；补failStage=0用例于11:37:07真实RED（应400实202），开启fail-on-numbers-for-enums后11:37:35完整35/35与打包GREEN。
- 初次docker compose up --build -d成功，既有演示库V2自动迁移V3；真实verify-004通过无查询执行、六事件、三个指定失败、10次终态稳定、私有PNG与身份隔离。

- 最终版本重建成功后再次运行verify-004及verify-003通过。SIGKILL实际杀停Java进程，重启ApplicationRunner将一项运行中与一项排队任务标PROCESS_INTERRUPTED/INTERRUPTED；此前成功快照与私有PNG原样保留。
- Chrome真实上传两张自制PNG并提交任务66803067-2013-43c8-afaa-55510e45fc86；从受理快照离开详情，回到详情手动核对，显示SUCCEEDED/结果整理与私有PNG。未伪称计时精确地在特定阶段关闭页面，无查询执行由后台测试和运行脚本独立证明。
- 375×812浏览器验收编号换行、图片缩放、单列控件均正常；退出设备模拟并关闭DevTools。桌面截图/tmp/material-studio-004.png，小屏/tmp/material-studio-004-mobile.png（临时产物未入库）。
- 17/17任务完成，FR001～006分别由顺序事件/事务版本、参数边界、三阶段失败/磁盘故障、有界队列/后台线程、私有结果/真实强杀恢复覆盖。前端保留手动快照和查询异常区别；自动多任务跟踪留005。
- 文档整理一次宿主Python stdin编码错误未修改文件，改用apply_patch后完成；不计业务RED。未新增依赖/升级版本，无远端CI或TLS运行声明；全程未使用子智能体。

- 可核对观测窗口11:29:22～11:42:23（13分01秒，含规划、下载、验证与整理，不等同纯人工时）；前置读取和后续交付整理未计入。最终任务/文档本地链接/原题副本一致性及git diff --check通过。

## 2026-10-29 · 005个人历史与多任务跟踪

- 首个工具时钟11:43:49；分支005-history-tracking，单智能体，按speckit-plan→tasks→implement。
- 生成plan/research/data-model/contracts/quickstart/tasks；15项任务，US1四项、US2六项，其余基础/验收；MVP为Java分页，全部串行实施。
- 规格质量清单16/16通过，无未决项，无extensions.yml钩子；约章设计前后均通过。保持依赖版本，不新增表/库。
- 设计：keyset分页+本人active集合；1秒逐任务非重叠查询，失败独立暂停/手动恢复；SessionGate卸载隔离身份，终态/旧版本不覆盖。
- 视觉沿用既有蓝白素材工坊；使用frontend-design与ui-ux-pro-max指导记录台账、作品预览、语义状态和375px单列。

- History RED：11:47:43，3项因旧50条无游标、active路径404及非法分页未拒绝失败；GREEN：11:48:44完整Java38/38及打包通过。覆盖55条同时间跨页、新插入不重不漏、本人旧页活动记录、归属/非法参数与GET只读。
- Tracker RED：8/8因空跟踪器缺失行为失败，未用缺失模块/类型错误代替RED；GREEN：8/8通过，三任务隔离、503暂停/重试、终态两周期无请求、旧请求/版本/身份和401清理已验证。

- SessionGate RED：11:49:42，3项因身份建立/切换/abort缺失失败；GREEN：11:50:13，3/3通过。切换动作立即卸载个人视图，DELETE完成前无新身份；失败只显示重试，迟到初始化不回显。

- 页面整合RED：历史5项及详情自动跟踪1项缺失失败，旧11项仍通过；GREEN：完整前端62/62、lint/typecheck/生产构建通过。身份建立前改为不挂载私有上传控件，更新相应旧断言，其余提交/未知结果门禁不变。
- 复查补同源标签身份变更：先更新契约/任务，再补storage事件用例，1失败/3通过的真实RED；实现后完整63/63及lint/typecheck/生产构建通过，无lint警告。标记不存token，只在成功切换后通知；浏览器禁用存储时须手动刷新其他标签。
- 历史页恢复首页与active集合，逐卡显示请求错误与恢复；分页失败保留卡片/游标；终态图片私有且按同源cookie读取。

- 真实Compose重建成功，verify-005通过24条真实记录跨四页、三个活动任务与成功/指定失败、结果归属、撤销旧身份401/新身份空记录；verify-004及verify-003也通过。
- Chrome详情受理954a0857-9757-4975-88ec-5b9da4aa319c后无需手动核对自动成功。第二任务dcc51bac-76a7-402d-9799-cc8636d72b48受理后临时设DevTools Offline，保留RUNNING/结果整理并显示查询暂停；恢复No throttling后点击恢复查询得到SUCCEEDED/私有PNG，没有把查询异常误报制作失败。
- /history刷新恢复同一访客四条记录和三张成功图片；375×812确认长编号换行、结果图片缩放、控件与卡片单列。网络/设备模式与DevTools均已还原。
- 临时截图/tmp/material-studio-005.png、/tmp/material-studio-005-mobile.png、/tmp/material-studio-005-query-error.png未提交。分页空态/切换/跨标签UI边界由组件证明，真实新身份空记录与隔离由运行脚本证明，不虚称全部浏览器操作已执行。
- 最终排序复查发现Date.parse丢弃同毫秒内微秒；日志上海12:02:09新增排序用例真实RED（1失败/8通过），保留小数秒比较后完整64/64、lint/typecheck/build通过。服务端排序保持原SQL不变。
- 一次文档脚本stdin编码错误未修改文件，改用apply_patch完成；不计业务RED。

- 补充无痕窗口真实验收：新访客显示“还没有制作记录/去挑选模板”，点击切换后访客编号改变且仍为空；原常规窗口记录不受影响。随后截图/关窗工具超时，空态截图未保存，不虚称已清理临时窗口。继续时Chrome前台为其他任务页面，未再操作。
- 可核对观测片段11:43:49～12:03:35（19分46秒，含规划、开发、下载与验证，不含之后整理），15:32:52恢复收尾；等待用户继续的间隔不计入人工投入。
- 继续后确认frontend/backend/mysql均healthy，最终源码对应9670a5c；文档/任务15/15、规格质量16/16、本地链接、原题副本及git diff --check通过；远端CI/TLS/公网发布未执行。

## 2026-10-29 · 001归档文档维护

- 用户要求修改001相关文件；按speckit-specify规格维护检查处理既有总体基线，不新建feature、不改变005本机执行指针，全程未使用子智能体。
- 新增001归档总览，统一十份原文档的总体基线/初始方案定位，补002～005实施入口、实际版本/模型/契约差异及当前启动指南。
- T001保留实际完成标记；T002～T044保留编号与原描述，改为迁移归档条目，移除已退役的待办复选框，不批量勾选、不声称旧路线原样执行。
- traceability改为当前实施映射与原SC证据边界。保留历史刷新游标缺陷、图片资源错误反馈缺口；明确SC-002十次小于2秒尚无完整测量记录。不会因整理文档将其标为通过。
- 本次仅改文档，不修产品代码、不重新运行或补称应用测试；以本地链接、需求/SC文本及旧任务描述保留检查、质量清单标记保留和git diff --check验证。
- 文档检查通过：原故事/FR/SC正文未变；44条原任务描述保留，43条迁移归档；16项质量检查标记未变；107处本地链接有效，原题副本及005执行指针未变，无扩展钩子；git diff --check通过。

## 2026-10-29 · 006 MVP验收收尾

- 首个工具时钟16:37:03；独立006-mvp-hardening分支，使用speckit-specify/plan/tasks/implement，禁止子智能体。
- 规格质量16/16通过，约章设计前后PASS，无extensions.yml钩子；9项任务，三个故事依次处理刷新游标、图片资源恢复与10次受理测量。
- 无新依赖/数据库/接口，API与浏览器可见编号测量分别记录，不混淆两种计时。

- 006行为RED：日志17:51:23新增用例4失败/7通过，分别为两种刷新游标和两种图片恢复行为；失败保留游标与非成功无预览场景通过。
- 第一轮完整回归发现Next Image添加onError后将src属性规范化为绝对URL；改为断言解析后的同源URL，不放宽到任意来源。onLoad在框架解码后异步回调，测试等待实际完成，不把这些适配误当新的业务RED。
- GREEN：日志18:15:24完整70/70、lint/typecheck和Next构建通过。无后端或依赖变更。
- 一次Docker检查自动审批超时，未执行任何命令；按提示重试一次后完成。原生浏览器连接超时，内置浏览器成功恢复，可继续真实编号可见性测量。

- 完整前端命令：`docker compose --profile test run --rm frontend-test sh -c 'npm run lint && npm run typecheck && npm test && npm run build'`，70/70、无lint警告、类型检查及生产构建通过；Java `mvn -B verify`完整38/38、无跳过、打包成功。日志分别为/tmp/studio-006-front-green.log和/tmp/studio-006-backend-green.log。
- Compose已执行`docker compose up --build -d`重建前端。`scripts/measure-admission.mjs`通过真实Next→Java→MySQL测量10项，HTTP202，10.460～25.796ms，平均17.024ms；每项后台成功总耗时6047～6078ms，六事件及各阶段>=2000ms均核对通过。
- 内置浏览器通过文件选择器逐次上传项目自制PNG、真实点击10次提交。计时从点击前至新增编号DOM可见并读取唯一ID，含驱动开销，273.088～498.503ms，平均414.022ms，10/10严格小于2000ms；没有以API计时冒充页面可见性。最后历史显示10条且10条均成功。
- 图片故障验收只临时改名本次测试任务ea585c6b-56f3-4c81-acca-4f447e930c3f的结果文件；首次页面跳转仍见旧图，随后重新加载实际发出404并显示明确错误，任务仍成功。恢复文件后点击“重新加载图片”，同源result?previewAttempt=1读取成功，complete=true/naturalWidth=960，无制作POST或状态改写。截图/tmp/material-studio-006-image-error.png、/tmp/material-studio-006-image-recovered.png；文件已恢复。
- 恢复文件的一次自动审批超时未执行命令，按允许重试一次后成功；没有等待用户或遗留改名文件。浏览器当前页面保留本次10条验收结果。
- 真实接口verify-003通过；立即串行接verify-004时，003留下的默认6秒任务使004固定1秒等待后仍QUEUED，首次未通过，不计业务RED。后台空闲后独立重跑verify-004与verify-005全部通过；包括六事件、三个指定失败、私有结果、24条跨四页历史和身份隔离。没有为通过而修改应用/缩短默认阶段。
- 全部逐次测量、工具计时边界及本地负载条件写入docs/admission-measurements.md。001原故事/FR/SC和原题副本保留；更新归档缺口、README、验收对照及006任务9/9。无新依赖/表/后端变更，无子智能体；远端CI、TLS/公网和真实双标签联动仍未实测。
- 工具时钟与容器/浏览器服务端创建时间不完全一致；不跨时钟相减。此前日志内17:51:23/18:15:24为相应日志记录时间，不能用于推算真实人工耗时。本轮包含多次工具连接/审批等待，不虚构精确人工工时。
- 最终136处本地文档链接、001原spec/原题逐字保留、006九项任务/16项质量清单及git diff --check通过；frontend/backend/mysql均healthy，test-mysql已停止，图片原文件存在且.audit-hold不存在。规格与代码分别提交f3986d7、9934a67，本次文档验收以最后Git提交为准。

## 007 US1 — 提交幂等与刷新安全重试（2026-10-29）
- RED：容器 `backend-test mvn -B -Dtest=CreationApiTest test`，2项失败：并发产生4编号、无效key返回202，非环境问题。
- GREEN：`backend-test mvn -B -Dtest=CreationApiTest,JobSubmissionTest test`，9项通过；事务锁本人行+持久唯一操作表，回放不重复调度。
- 前端RED：`frontend-test npm test -- src/features/jobs/submission.test.tsx src/lib/submission-proxy.test.ts`，2失败/24通过：缺安全重试入口、未透传key。
- GREEN：同两文件26项通过，另lint/tsc通过。未确认请求sessionStorage按本人/模板保存完整载荷，重试原key，存储不可用明确提示。保留人工核对入口兼容旧流程。
- 本轮开始约18:03（上海），按工具时段计，不声称精确人工工时。全部串行，无子智能体。

## 007 US2/US3 — 下载、重新制作、执行时间线
- 后端RED：CreationApiTest新增2项失败，recreate/download均404（预期409/200）；GREEN：CreationApiTest+JobSubmissionTest 11项通过。真实PNG字节与原预览一致；失败重试清除failStage后成功；保留源记录/素材顺序；丢素材后原key可回放，新key422；其他身份404。
- 前端RED：actions.test.tsx 2项缺操作按钮；events.test.tsx 2项缺展开入口。GREEN：lint/tsc及actions/events/submission/history/submission-proxy 38项通过。中途测试代码signal可空类型错误已修复，不算业务RED。
- 详情只在展开时读取并跟随任务version更新；收起/unmount abort，保留旧详情直到读取成功；401清理当前身份。下载先验证状态/类型再创建blob，失败显示原资源错误。

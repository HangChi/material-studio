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

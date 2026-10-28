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

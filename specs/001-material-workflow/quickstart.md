# 启动与验证指南（目标流程）

**当前不可直接运行**：本轮没有应用源码、Compose、Dockerfile、依赖锁文件或 SQL。
以下命令是后续实现必须兑现的入口，T002/T003/T039 完成后验证并更新本文件与 README。

## 当前前置材料检查（已具备入口）

从仓库根目录运行：

```sh
.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
git status --short
git log --oneline -5
```

克隆后的 feature.json 为机器本地文件（按官方 .gitignore 忽略），在 `001-material-workflow` 分支可按分支解析。
切换其他命名分支时使用 `SPECIFY_FEATURE_DIRECTORY=specs/001-material-workflow` 明确指定。

## 未来一键运行

前提：Docker Engine + Compose v2，能访问 Docker daemon；宿主无需 Node/Java/MySQL。
当前会话 Docker socket 访问未获验证，实施时重新检查。应用测试与构建均在容器内。

```sh
cp .env.example .env
docker compose up --build
```

预定浏览器入口 http://localhost:3000；Java 仅容器内 backend:8080，MySQL 仅 mysql:3306。
Next 通过 `JAVA_API_BASE_URL=http://backend:8080` 代理，浏览器不用容器内部域名。
示例配置提供 MYSQL_DATABASE、MYSQL_USER、MYSQL_PASSWORD、MYSQL_ROOT_PASSWORD、SPRING_PROFILES_ACTIVE=demo、
JAVA_API_BASE_URL；仅含明确标注的本地演示值。生产使用独立配置，禁用 simulation 覆盖。

Flyway 首次启动应用建表并插入两类三模板，demo 图片由仓库随 Java 打包，文件卷保存上传和结果。
容器健康检查保证数据库就绪后启动 Java，再启动前端；不得要求手动点击接口初始化种子。

## 未来测试与构建入口

```sh
docker compose --profile test run --rm frontend-test npm ci
docker compose --profile test run --rm frontend-test npm run lint
docker compose --profile test run --rm frontend-test npm run typecheck
docker compose --profile test run --rm frontend-test npm test -- --run
docker compose --profile test run --rm frontend-test npm run build
docker compose --profile test run --rm backend-test mvn -B verify
```

frontend-test 的 node_modules 使用命名卷以保留 npm ci 结果；backend-test 使用 Maven 镜像和缓存卷。
Testcontainers 需要测试容器连接 Docker daemon；Compose 测试 profile 挂载 socket，
在 Docker Desktop 下按实际运行结果设置 host override，README 必须记录已验证配置。
不得通过跳过集成测试来声称 Java 验证通过。

## 未来业务演示

1. 浏览两个分类和三模板，检查 1/2/3 张素材要求及本地封面。
2. 进入详情，选择合法 PNG/JPEG；观察上传、预览、替换、移除、失败反馈，验证大小/类型/数量限制。
3. 不带 simulation 提交，默认三阶段各 2000ms；受理显示任务 ID，关闭页面，稍后进入历史仍能见成功图片。
4. demo profile 下先 POST /api/session 得到身份，再上传所需文件、取得 assetIds，
   按 contracts/http-api.md 的 POST /api/jobs 示例分别指定三个 failAt，验证失败原因及后续阶段未执行。
   覆盖各 delayMs 为 5000 可延长观察窗口；不提供全局随机失败开关。
5. 连续创建三任务，确认分别显示状态；刷新恢复未完成任务，结束后 Network 不再轮询它们。
6. 临时阻止 GET /api/jobs/{id} 请求，确认显示查询异常且保留后台状态，解除后点击恢复查询。
7. UI 切换演示身份，验证个人历史隔离；打开无痕窗口应为另一身份。
8. 375px 下完成选择与提交，使用键盘遍历控件，检查焦点、标签和结果预览。

## 未来部署与回滚

部署前固定源码 commit、镜像版本/digest，备份数据库与文件卷，准备环境配置并执行容器检查。
在目标单机 `docker compose up -d --build`，等待健康检查，再演示成功闭环。
回滚到上一验收 commit/镜像，停止应用写入，恢复匹配的数据库与文件备份再启动；
不可假定新 schema 对旧应用兼容，不对持久卷执行常规删除。

本地需要彻底重置演示数据时才可使用 `docker compose down -v`；这会删除数据库、身份、上传和结果。
普通停止用 `docker compose down` 保留卷。服务重启只将遗留任务记为执行中断，不自动重试。

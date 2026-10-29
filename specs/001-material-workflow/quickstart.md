> 001作为总体需求归档；本页仅汇总后续已交付项目的当前操作入口。现行约束见[README](../../README.md)，接口以002～005契约为准，复查待修项见[归档说明](README.md)。

# 启动与验证指南（当前项目入口）

前后端源码、Compose、Dockerfile、依赖锁文件与V1～V3 SQL已由002～005交付。
本页命令从仓库根目录执行；本次仅维护文档，既往执行结果见[验收对照](../../docs/acceptance.md)和[工作日志](../../docs/work-log.md)。

## 规格与仓库检查

从仓库根目录运行：

```sh
SPECIFY_FEATURE_DIRECTORY=specs/005-history-tracking .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
git status --short
git log --oneline -5
```

feature.json是忽略的本机指针，不依赖Git分支解析。当前交付入口为005，不将001设为implement目标。

## 一键运行

前提：Docker Engine + Compose v2，能访问 Docker daemon；宿主无需 Node/Java/MySQL。
既往已验证Docker构建与启动；应用安装、测试与构建均在容器内。

```sh
cp .env.example .env
docker compose up --build -d
```

浏览器入口 http://localhost:3000，记录页为/history；Java仅容器内backend:8080，MySQL仅mysql:3306。
Next 通过 `JAVA_API_BASE_URL=http://backend:8080` 代理，浏览器不用容器内部域名。
示例配置含MYSQL_DATABASE、MYSQL_USER、MYSQL_PASSWORD、MYSQL_ROOT_PASSWORD、WEB_PORT、COOKIE_SECURE和可选APP_ORIGIN；仅含本地演示值。
当前应用是演示实现，没有按demo profile禁用simulation的机制；不要沿用001旧契约中的profile参数。

Flyway 首次启动应用建表并插入两类三模板，demo 图片由仓库随 Java 打包，文件卷保存上传和结果。
容器健康检查保证数据库就绪后启动 Java，再启动前端；不得要求手动点击接口初始化种子。

## 测试与构建入口

```sh
docker compose --profile test run --rm frontend-test
docker compose --profile test run --rm backend-test
```

frontend-test 的 node_modules 使用命名卷以保留 npm ci 结果；backend-test 使用 Maven 镜像和缓存卷。
前端默认入口运行npm ci、lint/typecheck/test/build；后端默认mvn verify连接独立test-mysql，不使用Testcontainers或Docker socket挂载。
不得通过跳过集成测试来声称 Java 验证通过。

## 业务演示

1. 浏览两个分类和三模板，检查 1/2/3 张素材要求及本地封面。
2. 进入详情，选择合法 PNG/JPEG；观察上传、预览、替换、移除、失败反馈，验证大小/类型/数量限制。
3. 不带 simulation 提交，默认三阶段各 2000ms；受理显示任务 ID，关闭页面，稍后进入历史仍能见成功图片。
4. 保留cookie调用POST /api/session，再上传所需文件取得assetIds；按[004现行契约](../004-async-pipeline/contracts/http-api.md)指定simulation.failStage和stageDurationsMs，验证三个失败阶段与中断。
   每阶段0～10000ms、默认2000；可设5000延长观察窗口，不提供全局随机失败开关。
5. 连续创建三任务，确认分别显示状态；刷新恢复未完成任务，结束后 Network 不再轮询它们。
6. 临时阻止 GET /api/jobs/{id} 请求，确认显示查询异常且保留后台状态，解除后点击恢复查询。
7. UI 切换演示身份，验证个人历史隔离；打开无痕窗口应为另一身份。
8. 375px 下完成选择与提交，使用键盘遍历控件，检查焦点、标签和结果预览。

真实接口验收脚本（会创建本地演示数据并撤销测试身份，保留记录与素材）：

```sh
docker compose exec -T frontend node --input-type=module < scripts/verify-003.mjs
docker compose exec -T frontend node --input-type=module < scripts/verify-004.mjs
docker compose exec -T frontend node --input-type=module < scripts/verify-005.mjs
```

历史刷新游标及图片资源错误反馈仍待修；SC-002十次耗时测量没有完整结果，不把上述脚本通过等同全部SC达标。

## 部署与回滚

部署前固定源码 commit、镜像版本/digest，备份数据库与文件卷，准备环境配置并执行容器检查。
在目标单机 `docker compose up -d --build`，等待健康检查，再演示成功闭环。
回滚到上一验收 commit/镜像，停止应用写入，恢复匹配的数据库与文件备份再启动；
不可假定新 schema 对旧应用兼容，不对持久卷执行常规删除。

本地需要彻底重置演示数据时才可使用 `docker compose down -v`；这会删除数据库、身份、上传和结果。
普通停止用 `docker compose down` 保留卷。服务重启只将遗留任务记为执行中断，不自动重试。

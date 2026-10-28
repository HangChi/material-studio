# 002 运行与验收

从仓库根目录运行，宿主只需Docker与Compose。以下入口已在本地Docker环境验证，结果见../../docs/work-log.md。

```sh
cp .env.example .env
docker compose up --build -d
```

浏览器http://localhost:3000；前端容器通过JAVA_API_BASE_URL=http://backend:8080访问Java；
Java通过mysql:3306访问数据库。MySQL和Java无宿主端口；Flyway自动建表与种子，封面在Java包内。

```sh
docker compose --profile test run --rm frontend-test
docker compose --profile test run --rm backend-test
```

frontend-test执行npm ci、lint、typecheck、test、build；backend-test执行mvn verify，使用独立test-mysql数据库。
单例TDD可覆盖默认命令：frontend-test sh -c 'npm ci && npm test -- --run ...'，backend-test mvn -B -Dtest=TemplateApiTest test。

验收：两个分类/三模板、筛选、不同图片要求、未知详情、网络故障后重试、快速切分类不覆盖、375px及键盘导航。
本期不包含上传/制作/历史。停止用docker compose --profile test down；保留数据库卷。
需要重置演示数据才用down -v（删除数据库卷），CI使用独立项目名与卷，禁止删除其他项目容器。
回滚：停止本项目应用并回到上一验收commit重建；本期只有初始schema，若以后有迁移应同时恢复匹配备份。

## 已验证范围（2026-10-29）

- 干净npm ci、lint、typecheck、16个前端测试、Next生产构建通过；Java verify中6个真实MySQL测试通过并打包。
- docker compose up --build -d从新建演示数据库卷启动成功，frontend/backend/mysql均healthy。
- 运行中容器验证Next代理→Java→MySQL的分类/列表/详情/未知资源/本地PNG和方法限制。
- 浏览器确认分类、卡片进入详情、375px无横向溢出、图片正常、键盘与焦点、未知模板和真实断服后的重试恢复。
- GitHub Actions配置已提供，远端尚未运行。空态及乱序响应由组件测试验证，不声称人工修改数据库验证过空态。

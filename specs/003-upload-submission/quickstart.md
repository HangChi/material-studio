# 003验证入口

```sh
docker compose --profile test run --rm backend-test
docker compose --profile test run --rm frontend-test
docker compose up --build -d
```

访问localhost:3000/templates/demo-postcard，先初始化访客，再选两张PNG/JPEG，观察预览/替换/移除/上传状态。
素材未齐/上传中/提交中不可提交；受理后展示任务编号与服务端状态，允许准备另一任务。
003尚无真实worker，默认保存明确FAILED，不能将其作为004制作成功演示。
点击“查看已受理任务”核对当前身份最近记录；重载后仍能核对，暂无自动跟踪。
用另一个浏览器身份验证不能读取原素材和任务。API可用curl cookie jar按contracts调用，禁止传ownerId。

数据库V2由Flyway自动迁移；素材存命名卷asset-data:/data，普通down保留，down -v会删除数据库/素材。
测试使用容器临时目录与test-mysql，不污染演示文件。服务重启本期保留受理记录但不自动执行；004处理中断语义。
成功/失败测试的实际命令、时间及浏览器证据以docs/work-log.md为准，不将本指南视为已执行。

## 本期已执行结果（2026-10-29）

- 前端容器：lint、typecheck、41个测试和生产构建通过；后端容器：22个测试及打包通过。
- 真实Compose接口验证：`docker compose exec -T frontend node --input-type=module < scripts/verify-003.mjs`通过，覆盖身份、私有上传、受理与手动记录核对。
- Chrome完成上传/移除/重新上传/提交/刷新后核对；375×812下确认长编号和错误信息换行。
- 应用三个容器均healthy；已有002数据库迁移成功，无需重置演示数据。
- HTTPS反向代理须配置APP_ORIGIN为公开源并设置COOKIE_SECURE=true；本期只验证配置逻辑，未部署TLS。

详细RED/GREEN与实际验收边界见[工作日志](../../docs/work-log.md)。真正制作由004实现，完整历史与自动跟踪由005实现。

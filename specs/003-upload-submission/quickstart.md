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

# 005验证指南

```sh
docker compose --profile test run --rm backend-test
docker compose --profile test run --rm frontend-test
docker compose up --build -d
docker compose exec -T frontend node --input-type=module < scripts/verify-005.mjs
```

访问/history恢复本人记录，分页加载更多；刷新恢复未完成任务并自动跟踪。无痕窗口/切换访客看不到原任务。详情连续受理多任务，各自跟踪到终态；离开页面停止前端请求，后台继续。
关闭Java演示查询异常，已有卡片保持最后状态；恢复Java后“恢复查询”继续，不误改后台FAILED。重启本身按004中断未完成任务，两类原因需区分。
组件测试用可控Promise和假时钟验证三任务乱序、旧版本/旧身份、终态后两周期无请求、卸载abort、分页失败保留；不能将其冒充浏览器故障注入。

最终逐条R01～14的源码/测试/运行证据见docs/acceptance.md，实际执行和限制见docs/work-log.md。

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

## 本地已执行结果（2026-10-29）

- 完整Java38/38及打包通过；前端64/64、lint无警告、typecheck及生产构建通过。
- Compose重建和verify-003/004/005均通过；005用真实接口创建24条记录跨四页，验证三任务独立结果/active及撤销/新身份隔离。
- Chrome验证详情自动更新、离线暂停保留RUNNING、恢复查询后成功、历史页刷新恢复；375×812确认编号换行/图片缩放/单列布局。已还原网络/设备模拟并关闭DevTools。
- 无痕窗口另行确认空记录模板入口与切换后新访客编号；截图保存工具超时，空态只有AX观察证据，未声称已保存该截图。
- 旧身份/旧版本/微秒排序/终态两周期无请求由可控测试证明；跨标签storage通知有组件验证，未声称真实双标签操作。
- 远端CI、TLS与公网部署未执行；源码以本地Git目录和最终验收commit交付。

详细证据见[工作日志](../../docs/work-log.md)与[原题验收对照](../../docs/acceptance.md)。

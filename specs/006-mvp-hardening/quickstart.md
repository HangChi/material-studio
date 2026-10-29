# 006验证入口

```sh
docker compose --profile test run --rm frontend-test
docker compose --profile test run --rm backend-test
docker compose up --build -d
docker compose exec -T frontend node --input-type=module < scripts/measure-admission.mjs
```

回归原末页和旧游标遇到跨页新增记录的刷新路径，刷新失败保留；图片error→重试→load，连续失败仍可重试，另一任务不受影响。
浏览器确认错误状态与恢复并完成10次受理可见编号的计时。真实结果记录docs/admission-measurements.md与docs/work-log.md，不将计划当已执行。

## 实际结果

70/70前端、lint/typecheck/生产构建及38/38 Java verify通过；Compose已重建。10次API及另10次浏览器可见编号均<2秒，见[完整测量](../../docs/admission-measurements.md)。浏览器真实404→提示→恢复文件→重新加载成功，任务保持成功。

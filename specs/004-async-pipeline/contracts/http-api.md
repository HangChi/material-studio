# 004接口与执行契约

所有私有读取要求material_session，未登录401/他人资源404/no-store；Next代理仅白名单GET路径。003 POST结构增加可选simulation（null与省略均为默认）：

```json
{"templateId":"demo-portrait","assetIds":["<owned-asset-id>"],"simulation":{"failStage":"GENERATE","stageDurationsMs":{"ASSET_CHECK":2000,"GENERATE":2000,"FINALIZE":2000}}}
```

failStage省略或null为成功，合法值ASSET_CHECK/GENERATE/FINALIZE。stageDurationsMs省略或null使用各2000；允许部分覆盖，值必须非空整数0～10000。未知字段/枚举/非整数400，越界或null值422；无任务写入，无dispatch。单任务快照永久保存，不修改其他任务。

POST /api/jobs仍202+Location+{job}，瞬时快照可能QUEUED/RUNNING/甚至终态，不等待执行结束。队列满仍返回已保存FAILED/QUEUE_REJECTED，禁止在HTTP线程执行流水线。

GET /api/jobs/{id}与GET /api/jobs保持003字段；stage显示当前/失败阶段，resultUrl仅成功为/api/jobs/{id}/result。查询严格只读。version随阶段事件单调递增，终态只读不变。

GET /api/jobs/{id}/events → {items:[{version,stage,kind,createdAt,message}]}，升序，QUEUED可为空；每阶段STARTED/COMPLETED，失败替代该阶段COMPLETED；中断为INTERRUPTED。

GET /api/jobs/{id}/result → image/png + nosniff + no-store；未成功/无文件404结构化RESULT_NOT_AVAILABLE；他人404。禁止返回磁盘路径。

错误：ASSET_UNAVAILABLE素材失效；SIMULATED_FAILURE指定阶段模拟失败；PIPELINE_FAILED其他制作异常；PROCESS_INTERRUPTED服务中断；QUEUE_REJECTED队列满。公开中文原因不含内部异常、路径或SQL。

前端：手动核对快照显示中文阶段、状态、错误和成功图片；本期无自动跟踪或模拟控制UI。未知提交结果仍必须先核对，查询失败不改变任务为FAILED。

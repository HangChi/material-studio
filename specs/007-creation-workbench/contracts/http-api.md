# 007 HTTP契约

所有接口沿用HttpOnly身份、no-store、本人归属；他人资源404，无身份401。

POST /api/jobs：原字段templateId/assetIds/simulation保留，可选parameters（仅demo-postcard）。可选Idempotency-Key头，1～80位[A-Za-z0-9_-]。同身份相同规范化内容重复返回202及原任务最新快照/Location，不重复调度；内容冲突409 IDEMPOTENCY_CONFLICT；非法标识400 INVALID_IDEMPOTENCY_KEY。参数非法422 INVALID_PARAMETERS，结构/类型/未知字段400。未提供key继续创建独立任务。
parameters={title:string,palette:"CREAM"|"OCEAN",format:"LANDSCAPE"|"SQUARE",crops:[{x:number,y:number,zoom:number},{x:number,y:number,zoom:number}]}，约束见data-model。

POST /api/jobs/{id}/recreate：空body，必需Idempotency-Key；只允许本人SUCCEEDED/FAILED（否则409 JOB_NOT_FINISHED），从原素材/参数重新创建任务，simulation清除failStage；202 {job} + Location。重复key只创建一次，重新制作操作与原始提交的key空间共用且内容摘要含源任务ID。旧记录无配方时取默认参数。素材不存在404，失效422。
GET /api/jobs/{id}/recipe：200 {parameters:object|null,sourceJobId:string|null,assetIds:string[]}；仅本人。历史旧数据sourceJobId为空，明信片参数返回默认值。
GET /api/jobs/{id}/download：本人成功PNG，Content-Disposition: attachment; filename="material-{uuid}.png"；缺失/非成功404，nosniff/no-store。下载与预览读取同一结果。
GET /api/jobs/{id}/events：沿用已有{items:[{version,stage,kind,createdAt,message}]}，version升序。

示例明信片参数：
```json
{"templateId":"demo-postcard","assetIds":["<本人素材1>","<本人素材2>"],"parameters":{"title":"旅途来信","palette":"OCEAN","format":"SQUARE","crops":[{"x":0.5,"y":0.5,"zoom":1},{"x":0.2,"y":0.7,"zoom":1.5}]}}
```

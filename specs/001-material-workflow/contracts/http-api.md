> 初始契约归档，禁止直接作为当前调用示例。现行契约：[002模板](../../002-template-catalog/contracts/http-api.md)、[003上传/受理](../../003-upload-submission/contracts/http-api.md)、[004流水线](../../004-async-pipeline/contracts/http-api.md)、[005历史](../../005-history-tracking/contracts/http-api.md)。差异见[归档说明](../README.md)。

# HTTP API 契约 v1（初始归档）

端点现已由后续feature实现；下文保存最初设想，字段和错误码并非当前契约。尤其failAt/delayMs、demo profile限制、默认历史条数及事件结构已经被004/005替代。当前浏览器仍仅访问同源 `/api/*`，Java负责业务。
JSON 使用 camelCase；时间 ISO 8601 UTC；ID 为 UUID，模板 ID 可用种子 slug。
所有个人接口禁止缓存；统一错误为 `{error:{code,message,field?}}`，不暴露堆栈或文件路径。
未识别字段拒绝为 400。缺少/失效 cookie 为 401，个人资源不存在或不属于本人统一 404。

## 身份

- `POST /api/session`：无有效 cookie 时创建匿名用户，设置 `material_session`（HttpOnly、SameSite=Lax、Path=/，HTTPS 下 Secure）；
  返回 200 `{user:{id,createdAt}}`；已有有效 cookie 则返回该用户，不新建。
- `DELETE /api/session`：清除浏览器 cookie，返回 204；不删除原任务也不中断后台。然后 POST 创建新身份。
- `GET /api/session`：200 `{user:{id,createdAt}}`，没有有效身份则 401。
- cookie token 为随机 32 字节（base64url）；数据库只存其 hash；服务端不接受 ownerId。

## 模板（匿名可读）

- `GET /api/template-categories` → 200 `{items:[{id,name}]}`。
- `GET /api/templates?categoryId=creative` → 200 `{items:[Template]}`；无数据为空数组；未知分类返回空数组。
- `GET /api/templates/{id}` → 200 Template；不存在 404。
- Template：`{id,title,categoryId,coverUrl,description,requiredImageCount,acceptedMimeTypes,maxFileSizeBytes}`。
- `GET /api/demo/{filename}` → 本地封面 PNG/JPEG；只允许种子白名单名，未知 404，无路径遍历。

## 素材（需要身份）

- `POST /api/assets`：multipart 的单个 `file`，成功 201 `{id,url,mimeType,sizeBytes,createdAt}`。
- 允许 image/jpeg、image/png；文件 1～5242880 字节；实际图片解码与声明匹配；超限 413 FILE_TOO_LARGE，
  空文件/损坏内容 422 INVALID_IMAGE，不支持类型 415 UNSUPPORTED_MEDIA_TYPE。
- `GET /api/assets/{id}/content`：当前用户自己的图片内容；其他用户统一 404；设置准确 Content-Type，nosniff，禁止缓存。
- 文件写入完成后才登记和返回；替换/移除仅变更客户端选择，不删除已上传素材，孤儿清理由演示数据重置负责。

## 受理任务

`POST /api/jobs`：

```json
{
  "templateId": "demo-postcard",
  "assetIds": ["asset-uuid-1", "asset-uuid-2"],
  "simulation": {
    "failAt": "GENERATE",
    "delayMs": {"ASSET_CHECK": 2000, "GENERATE": 2000, "FINALIZE": 2000}
  }
}
```

simulation 可省略，只有 demo profile 接受；failAt 可 null，各 delayMs 可省略沿用 2000。
有效值见数据模型；非 demo profile 收到 simulation 返回 400 SIMULATION_DISABLED。
模板存在、素材属于本人、ID 无重复、数量精确匹配、文件存在且属性满足模板限制，否则不插入任务。
不存在模板/素材 404，重复/数量不符/字段非法 422 VALIDATION_FAILED，服务不可用 503。
完成受理事务后 202 `{job:Job}`，Location 为 `/api/jobs/{id}`；不等待生成。
通常返回 QUEUED，也可能 worker 已执行而返回 RUNNING；调度被拒绝返回 FAILED/QUEUE_REJECTED，仍为已记录任务。
不得返回一个永远不会处理也没有失败原因的 QUEUED 任务。
响应丢失时客户端不自动重提，提示查历史；本期不提供幂等键或重试制作。

## 状态与历史

- `GET /api/jobs/{id}` → 200 `{job:Job}`，查询只读；临时错误可 503，不改变持久任务状态。
- `GET /api/jobs?limit=50&cursor=opaque` → 200 `{items:[Job],nextCursor:null|string}`；
  仅当前用户，按 createdAt/id 降序，limit 1～50，默认 50；非法 cursor/limit 为 400。
- `GET /api/jobs/{id}/events` → 200 `{items:[{stage,sequence,status,startedAt,finishedAt,errorCode,errorMessage}]}`；
  按 sequence 升序，未开始返回空数组，归属规则同任务。
- `GET /api/jobs/{id}/result` → 成功任务的本地图片内容，其他用户 404，未成功 409 RESULT_NOT_READY；
  文件缺失为 404 RESULT_MISSING（资源异常，不改变 job.status）。

Job：`{id,templateId,templateTitle,status,stage,version,createdAt,updatedAt,finishedAt,resultUrl,errorCode,errorMessage}`。
resultUrl 成功时是受保护的 `/api/jobs/{id}/result`；其余状态为 null。
errorCode/errorMessage 仅失败时非空；stage 等枚举和可空规则以 data-model.md 为准。
记录模拟参数仅存后端，不必在普通查询中公开。

```json
{"job":{"id":"job-uuid","templateId":"demo-postcard","templateTitle":"旅行明信片","status":"FAILED","stage":"GENERATE","version":4,"createdAt":"2026-10-29T01:00:00Z","updatedAt":"2026-10-29T01:00:04Z","finishedAt":"2026-10-29T01:00:04Z","resultUrl":null,"errorCode":"SIMULATED_FAILURE","errorMessage":"模拟生成阶段按演示配置失败"}}
```

## 前端调用约束

- 代理必须保留 Set-Cookie、HTTP 状态和文件响应，并使用流转发上传，避免把 Cookie 返回到 JS。
- 每任务只允许一个在途轮询；查询异常保存 queryError，暂停并提供恢复，不设置 status=FAILED。
- 已结束任务不再轮询；卸载/身份切换时 abort，epoch 不匹配的迟到响应丢弃。
- 以 version 忽略过时快照；终态不被旧 RUNNING 响应覆盖。

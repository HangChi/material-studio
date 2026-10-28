# 003 HTTP契约

沿用002模板接口。个人接口无缓存，统一错误{error:{code,message}}，无凭据/SQL/路径/堆栈泄露。

## 身份

POST /api/session → 200 {user:{id,createdAt}}，已有有效cookie返回原身份；否则创建并Set-Cookie material_session。
GET /api/session → 同上，缺失/撤销401 UNAUTHENTICATED。
DELETE /api/session → 204，撤销token并清cookie，不删除素材/任务；下次POST得到新身份。
Cookie: HttpOnly/SameSite=Lax/Path=/，Max-Age=31536000；COOKIE_SECURE=true启用Secure（本地HTTP默认false）。

## 上传

POST /api/assets：multipart单file，需当前身份；201 {id,url,mimeType,sizeBytes,createdAt}。
url=/api/assets/{id}/content。PNG/JPEG真实内容与声明一致、1～5242880字节、最多2000万像素。
不支持类型415 UNSUPPORTED_MEDIA_TYPE，超限413 FILE_TOO_LARGE，空/损坏/伪类型/像素过大422 INVALID_IMAGE。
写盘失败503 STORAGE_UNAVAILABLE，不返回可提交id。
GET /api/assets/{id}/content：仅本人，200图片+nosniff；不存在或他人404 RESOURCE_NOT_FOUND。

## 受理与核对

POST /api/jobs JSON {templateId,assetIds}，严格拒绝未知字段（含ownerId/simulation）为400 INVALID_REQUEST。
模板/素材不存在或他人404；数量/去重/字段非法422 VALIDATION_FAILED；素材物理缺失/大小改变422 ASSET_UNAVAILABLE。
事务保存后202 {job:Job}，Location=/api/jobs/{id}；不等待执行。
默认处理器本期拒绝：FAILED、stage=null、PROCESSOR_NOT_AVAILABLE、“制作服务暂不可用，任务未开始处理”。
其他调度异常为QUEUE_REJECTED，仍返回已受理任务的202及终态。004才接真实执行。
GET /api/jobs/{id} → 200 {job:Job}，仅本人，否则404。
GET /api/jobs → 200 {items:[Job],nextCursor:null}，本人最新50条倒序，手动核对；分页待005。
Job={id,templateId,templateTitle,status,stage,version,createdAt,updatedAt,finishedAt,resultUrl,errorCode,errorMessage}。
无ownerId/token/文件路径；成功结果及阶段执行在004提供，不提供结果/事件端点。

## 代理与客户端

仅上述路径允许GET/POST/DELETE的对应组合；模板端点继续只读，其他路径404/方法405。
保留Cookie/Set-Cookie/Content-Type/Location及状态码，multipart不重编码；禁止缓存。
写请求若有Origin必须匹配当前请求origin，否则403 ORIGIN_NOT_ALLOWED；允许无Origin的命令行测试。
连接失败502 UPSTREAM_UNAVAILABLE。POST网络/5xx响应视为结果未知，提示手动核对，不自动重提。

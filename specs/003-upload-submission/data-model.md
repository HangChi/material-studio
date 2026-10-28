# 003 数据模型

时间UTC/Instant，ID UUID字符串36字符；V1模板保留，新增V2。

## DemoUser

id主键；tokenHash非空唯一64字符hex；createdAt非空；active非空boolean。
明文token不落库；active=false不可再认证，资源保留。

## Asset

id/ownerId/storageFilename/mimeType/sizeBytes/createdAt非空，ownerId外键。
约束：mimeType ∈ {image/jpeg,image/png}；0 < sizeBytes <= 5242880；解码像素 <= 20000000。
storageFilename服务端UUID+.png/.jpg，不使用用户文件名。ownerId来自session，不能由请求指定。

## Job / JobAsset

id/ownerId/templateId/templateTitle/status/version/createdAt/updatedAt非空；stage/resultPath/finishedAt/errorCode/errorMessage可空。
status ∈ {QUEUED,RUNNING,SUCCEEDED,FAILED}；stage ∈ {ASSET_CHECK,GENERATE,FINALIZE}或null；version非负更新递增。
QUEUED的stage/result/finishedAt/error为空；FAILED必须有finishedAt/errorCode/errorMessage且result为空；终态不回退。
003仅创建QUEUED或受理后调度拒绝转FAILED；RUNNING/SUCCEEDED实际转换在004实现。
JobAsset(jobId,assetId,slotIndex)，主键(jobId,slotIndex)，唯一(jobId,assetId)，两端外键。
约束：assetIds不重复且数量等于模板requiredImageCount；素材全部属于当前用户，物理文件存在且大小与登记一致。
job按(ownerId,createdAt,id)索引，最新50条倒序查询仅用于核对。

## 前端状态

session: loading/ready/error；slot: empty/validating/uploading/ready/error，独立预览、序号和abort。
submit: idle/submitting/unknown/error；受理后显示服务端job快照，不把202响应理解为制作成功。
unknown须成功读取最近记录并由用户明确确认后解锁，不自动重提。

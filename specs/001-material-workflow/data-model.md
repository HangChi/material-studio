> 初始数据模型归档；现行结构以[V1](../../backend/src/main/resources/db/migration/V1__templates.sql)、[V2](../../backend/src/main/resources/db/migration/V2__submission.sql)、[V3迁移](../../backend/src/main/resources/db/migration/V3__pipeline.sql)及003～005模型为准。重要差异见[归档说明](README.md)。

# 数据模型与不变量（初始方案）

所有时间使用 UTC 存储、ISO 8601 带 Z 返回，页面以本地时间展示。ID 为服务端生成 UUID 字符串（36 字符）。
下列保留001设计时的字段与约束；SQL已在后续feature落地。尤其StageEvent、模拟配置和错误码已经调整，不应按下文重建或修改现有数据库。

## DemoUser（demo_user）

`id` 主键；`tokenHash` 非空且唯一；`createdAt` 非空。不保存明文 cookie token。

## TemplateCategory / Template（template_category / template）

分类 `id/name`，模板 `id/title/categoryId/coverPath/description/requiredImageCount/acceptedMimeTypes/maxFileSizeBytes`。
约束：**模板 requiredImageCount ∈ {1,2,3}；acceptedMimeTypes 为 image/jpeg、image/png；maxFileSizeBytes=5242880。**
初始两类三模板，各需 1/2/3 张；封面位于后端自制 demo 目录，可匿名读取。无需模板 CRUD。

## Asset（asset）

`id/ownerId/storagePath/mimeType/sizeBytes/createdAt` 均非空；ownerId 外键。
约束：**素材 ownerId 必须等于当前用户；mimeType ∈ {image/jpeg,image/png}；0 < sizeBytes <= 5242880。**
服务端检查实际解码格式与声明类型，拒绝伪造类型；使用随机文件名，不采用客户端路径。
仅完整写入的文件可登记 Asset 并用于提交；上传失败不产生可提交 ID。

## Job / JobAsset（job / job_asset）

Job：`id/ownerId/templateId/status/version/createdAt/updatedAt/simulationConfig` 非空；
`stage/resultPath/errorCode/errorMessage/finishedAt` 可空。
约束：**status ∈ {QUEUED,RUNNING,SUCCEEDED,FAILED}；stage ∈ {ASSET_CHECK,GENERATE,FINALIZE} 或 null；version 为非负整数且更新时递增。**
约束：**SUCCEEDED 必须有 resultPath 与 finishedAt 且无错误；FAILED 必须有 errorCode、errorMessage、finishedAt 且无结果。**
约束：**QUEUED/RUNNING 的 resultPath、finishedAt 为空；QUEUED 的 stage 为空；RUNNING 的 stage 非空。**
任务保存 templateTitle 快照用于历史展示，素材按 job_asset 的 slotIndex 保存顺序。
JobAsset：`jobId/assetId/slotIndex` 非空，联合主键(jobId,slotIndex)，唯一(jobId,assetId)。
约束：**assetIds 不重复，数量等于模板 requiredImageCount，所有素材属于当前用户且文件存在。**
索引：job(ownerId,createdAt,id)，job(status)，event(jobId,sequence)。按 createdAt/id 降序游标分页。

## StageEvent（job_stage_event）

`id/jobId/sequence/stage/status/startedAt` 非空，`finishedAt/errorCode/errorMessage` 可空。
约束：**每个任务每阶段最多一条事件；事件 status ∈ {STARTED,SUCCEEDED,FAILED}；sequence 依次为 1、2、3。**
任务与该阶段事件在同一事务更新。队列拒绝无阶段事件；启动中断仅结束已有 STARTED 事件。

## SimulationConfig（Job 内 JSON 快照）

约束：**failAt ∈ {ASSET_CHECK,GENERATE,FINALIZE} 或 null；每阶段 delayMs 为 0～10000 的整数，默认各 2000。**
仅 demo profile 接受覆盖；普通 profile 传入 simulation 字段返回 SIMULATION_DISABLED，不忽略。

## 状态转换

- QUEUED → RUNNING/ASSET_CHECK → RUNNING/GENERATE → RUNNING/FINALIZE → SUCCEEDED/FINALIZE。
- 任一 RUNNING 阶段 → FAILED/相同阶段，记录原因，后续阶段无事件。
- QUEUED → FAILED/null：QUEUE_REJECTED 或 EXECUTION_INTERRUPTED。
- RUNNING → FAILED/当前阶段：EXECUTION_INTERRUPTED 或当前执行错误。
- SUCCEEDED/FAILED 为终态；重复查询、迟到响应均不能转回 RUNNING；不提供重试端点。
- 一次有效提交关联一个任务；本期不承诺请求级幂等。队列只在当前进程执行，不做集群协调。

## 前端状态（不持久化业务事实）

UploadSlot：empty/uploading/ready/error + assetId + previewUrl + requestId。
Submission：idle/submitting/unknownOutcome/error；受理后回 idle 并展示任务，响应丢失用 unknownOutcome。
TrackedJob：job 快照 + queryError + tracking 标志，键为 identityEpoch/jobId。
个人历史从 Java 恢复；本地缓存不能替代持久化记录。资源加载错误独立于制作状态。

# Contracts
- POST /api/batches/{id}/cancel：本人批次200 {batch}；并发已结束的子任务不修改、不阻断其他取消；重复安全，他人404，整批归属错误仍回滚。
- POST /api/jobs/{id}/cancel：本人活动任务200；已取消重复200；其他终态409 JOB_NOT_CANCELLABLE保持。
- GET /api/batches：字段、排序、limit/cursor、归属与错误码保持。减少查询次数属于内部实现优化。
- 前端批次请求快照不得覆盖请求期间新增的受理回执；新请求仍从当前权威第一页恢复分页。
- 草稿localStorage版本/键格式不变；素材全部移除后存储空槽位，重载得到空选择，后台素材不删除。

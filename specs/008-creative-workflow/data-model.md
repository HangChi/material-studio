# Data Model
V5新增job_library：job_id主键/外键，display_name可空（1～60Unicode码点、去首尾空白、无控制字符），favorite/hidden默认false。
V6新增job_runtime：job_id主键外键，attempt_count默认0（0～3）、available_at可空。旧任务按需补行。
JobView可选补充displayName/favorite/hidden/queueAhead/attempt/nextAttemptAt；旧客户端继续可读。管理修改递增job.version但不改执行状态/事件；前端允许相同终态更高版本的管理属性更新，不允许终态回退。
取消持久为FAILED/JOB_CANCELLED并显示已取消，事件FAILED/已取消；无需破坏原状态CHECK。
草稿：localStorage按owner/template/source分键，v1、assetIds长度对应槽位、parameters可空、savedAt；只存服务器素材ID，不存File/blob URL/cookie。

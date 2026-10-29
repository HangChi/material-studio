# 005数据与客户端状态

持久模型沿用V1～V3，无新表或列。

- HistoryPage：items为JobView列表；nextCursor可空本人job UUID（36字符）；limit整数1～50、默认20。按created_at/id倒序，读limit+1判下一页，不含owner/磁盘路径。
- Active集合：本人QUEUED/RUNNING，按created_at/id倒序；无任务为空数组，查询不修改任何状态。
- TrackerSnapshot：按ID保存Job和独立queryError，身份失效标记authExpired；Job.version为非负安全整数；status限QUEUED/RUNNING/SUCCEEDED/FAILED。
- merge只接收同ID有效响应，version必须大于已有版本；同版本/更旧丢弃。已有终态不再被任何快照覆盖。新列表合并去重并按创建时间/ID倒序。
- 每ID最多1个timer和1个请求；首次接收非终态后1秒查询，完成后再定时。终态清理；异常清理timer并暂停，手动恢复发起新的请求代次。
- stop/身份切换：abort所有controller、清理timer、提升epoch、清空快照；迟到Promise无效。401全体清理并停止，其他404/5xx/无效JSON作为该任务查询异常。
- History分页请求另有generation/controller与锁；页失败保留cursor与已有结果，重试同一页；刷新合并首页，不覆盖更高版本/终态。加载更多不会触发重复请求。

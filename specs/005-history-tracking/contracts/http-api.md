# 005接口与界面契约

沿用003/004 cookie归属/no-store/结构化错误；所有GET只读。

GET /api/jobs?limit=20&cursor=<job-id> → {items:[JobView],nextCursor:string|null}。
limit可省略，整数1～50；错误类型/范围400 INVALID_REQUEST。cursor省略为首页，必须是存在且属于本人的标准UUID，否则400 INVALID_CURSOR，不能泄漏他人任务。按created_at DESC,id DESC稳定排序；查询limit+1判尾页。
默认由003最近50条改为20条分页，保留items/nextCursor结构；旧脚本仅检查最新受理任务存在，兼容。

GET /api/jobs/active → {items:[JobView]}，本人QUEUED/RUNNING，不截断首页之外活动任务；其他身份看不到。
GET /api/jobs/{id}仍{job}，fields/版本语义沿004；未登录/撤销401，他人404。Next白名单允许active与分页query，禁止POST /jobs/active。

/history：建立/复用访客后载入首页+active；显示创建时间、中文状态/阶段、错误原因和成功私有图片；无记录为空态及模板入口；加载/失败/加载更多明确反馈。
未结束卡片自动更新；查询失败保留快照，单卡“恢复查询”；终态或无任务停止所有自动查询。刷新页面从Java恢复。历史分页失败不能丢掉既有卡片或推进游标。
详情提交202后立即解除提交状态，可继续创建任务；每个任务独立跟踪，未知受理结果核对门禁保持003语义。
切换访客立即卸载旧任务/素材视图，DELETE session成功后POST新session；失败不回显旧记录，提供重新建立身份。切换说明原记录不再可找回、后台制作继续；身份切换不携带ownerId。

同源标签页共享cookie；切换完成写入不含身份/token的本地epoch标记，其他标签页收到storage事件后立即清理个人视图并重新读取当前身份。浏览器禁用本地存储时跨标签通知不可用，需要刷新；单页切换清理仍有效。

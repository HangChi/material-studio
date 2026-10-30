# UI contract
GET /api/jobs/{id}/events、POST批量/ZIP与归属契约不变。
查看执行详情按钮aria-haspopup=dialog、aria-controls指向具名dialog；打开后按钮仍位于原卡片第二列，不显示内联event-panel。关闭只中止查询，不改变任务或后台执行。dialog标题“执行详情”，描述包含作品名/任务编号。
选择入口未全选时aria-label“选择已加载作品（最多50项）”，全选后“取消选择已加载作品”；视觉文案“全选/取消全选”，aria-pressed表达true/false/mixed。全选取当前jobs前50，取消全选清空选择；原清空入口仍有，完成批量更新后焦点回初始选择按钮。

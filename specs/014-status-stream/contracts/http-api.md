# HTTP Contracts
GET /api/jobs/stream?ids=UUID,UUID，Cookie同既有API；1～50唯一小写规范UUID。未登录401、非本人/不存在404、非法/重复/超限400、连接限额429 STREAM_LIMITED Retry-After60，错误application/json/no-store。
成功text/event-stream、Cache-Control:no-store、X-Accel-Buffering:no；event jobs的data为{items:JobView[]}，初次全快照、随后变化快照；event heartbeat的data为{kind:"keepalive"}；event expired通知身份失效并结束；event unavailable通知服务读状态异常后关闭，前端补查。
固定55秒/全部终态关闭。忽略Last-Event-ID，每次订阅重新读取最新快照，不承诺推送每一个历史阶段事件；原/events接口仍可查看完整事件。只读、不触发任务执行。
客户端只接收当前源/epoch且完整属于订阅集合的数据，复用version保护；中断/无效消息/20秒静默均立即GET补查和原轮询，无POST重发；401或expired清空私有状态，换身份/离开/终态关闭连接。
完成事务已提交但确认丢失时，现有成功状态与已登记PNG继续可读；worker不得在异常清理中删除数据库已经指向的结果，不因此重复执行。

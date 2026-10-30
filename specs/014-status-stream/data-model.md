# Data Model
无数据库新表。Subscription含owner、捕获会话token（仅内存不输出）、1～50唯一规范UUID、last JobView列表、创建/心跳单调时刻、SseEmitter、future与AtomicBoolean closed。连接map每进程最多64、owner最多2；销毁移除，无持久用户订阅。
JobTracker新增单EventSource、集合key、watchdog与本生命周期fallback标记；保留owner/epoch、version、终态和逐项查询错误。所有终态无source或timer；20秒无jobs/heartbeat视为静默中断。

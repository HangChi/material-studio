# Contracts
现有jobs/history/batch/cancel/result返回形状不变；events.items.kind允许RESUMED，message说明从已完成阶段恢复。查询不返回断点路径/摘要、不触发执行。
内部只信任数据库已登记且摘要匹配的文件；resume仅允许QUEUED、重试到期、预算未耗尽，保留旧事件。终态不允许resume/start/complete。

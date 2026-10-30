# Contracts
现有HTTP形状不变，不公开workerID、租约时间或代次；执行详情仍可见中断/断点恢复。接口取消不受执行租约限制，终态之后旧worker任何提交均拒绝。
内部claim同任务同时间仅一成功；renew只匹配当前代次且未过期且任务未终态；release不得影响后继。每次发布文件名独立，结果URL仍按jobID查询数据库指针。
部署可docker compose up --scale backend=2；所有实例必须共享同MySQL与同一资产卷，不提供跨主机文件复制。STUDIO_LEASE_MS默认15000，低于3000启动拒绝。

# Research
- Decision：持久输入摘要+PNG断点。Rationale：COMPLETED事件不能证明中间图仍可读或输入未变。Alternative：每次从头执行简单但重复合成。
- Decision：先原子发布文件，完成事件与断点共同提交。Alternative：分开写有已完成但无断点窗口。文件/数据库无跨介质事务，未登记孤儿诚实保留。
- Decision：RESUMED事件计执行预算但不伪造重做；资产内容SHA与配方摘要避免只按ID信任输入。
- 评估：当前无生产容量/轮询瓶颈测量，不声称达到生产规模；先做可量化恢复收益，再分别立项租约防并发与可回退SSE。

# 004研究与决策

- Decision：JDK单线程有界执行器，AbortPolicy；Rationale：多任务可顺序执行且队列满能返回失败；Alternatives：无界队列可能无限积压，CallerRuns会阻塞受理，MQ超出范围。[Java21官方文档](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)
- Decision：Spring ApplicationRunner启动时先中断遗留QUEUED/RUNNING，再开放dispatch；关闭时停止接收、interrupt worker并将剩余任务标中断。Rationale：不续跑且不遗留永久等待；Alternatives：查询推进状态违反约章，后台恢复执行超出范围。[Spring Boot 3.5官方文档](https://docs.spring.io/spring-boot/3.5/reference/features/spring-application.html)
- Decision：每任务独立simulation快照，省略字段使用默认值；枚举与整数字段严格解析，非法格式400、越界422。Rationale：可重复演示，不使用全局开关；Alternatives：随机失败难复现，前端计时不代表后台执行。
- Decision：job行FOR UPDATE，阶段事件与版本原子更新，延迟不包长事务；Rationale：读事件能核对状态，终态后再执行无效；Alternatives：仅内存阶段重启丢失，长事务阻塞查询。
- Decision：模板预置PNG复制到任务私有results文件，先原子move再提交成功；Rationale：原题允许预置结果，私有接口不暴露磁盘路径；Alternatives：浏览器临时URL不可恢复，真实图片合成非必需。
- Decision：004仅扩展手动快照的阶段/结果显示；轮询和独立历史页留005。原有003记录/未知受理门禁保持。

未知项已解决；无新增依赖，不做框架版本升级。测试需验证关停/重新初始化行为及真实容器重启。

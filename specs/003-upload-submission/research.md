# 研究与决策

2026-10-29，单一执行者，无子智能体。

- Decision: TransactionTemplate插入后再dispatch，防止同类@Transactional自调用陷阱；测试用另一连接读取已提交记录。
  Rationale: 受理需先持久化再调度。Alternatives: afterCommit监听亦可，但本期显式流程更易审阅。
  Source: [Spring编程式事务](https://docs.spring.io/spring-framework/reference/data-access/transaction/programmatic.html)。
- Decision: cookie随机token、DB存hash/active；删除身份撤销token，保留任务。Alternatives: 不使用可伪造ownerId或引入账号系统。
- Decision: 文件先真实解码校验，再写盘与登记；2000万像素上限先读取元数据，避免大解码占用。Alternatives: 只信MIME不够。
- Decision: 代理转发cookie和原始multipart流，不把文件JSON化、不把cookie暴露给客户端JS。
  Sources: [Next响应cookie](https://nextjs.org/docs/app/api-reference/functions/next-response)、[Node Request](https://nodejs.org/api/globals.html#class-request)。
- Decision: 003默认处理器拒绝且保存明确失败，测试替身验证可受理QUEUED；004再接实际worker。
  Rationale: 不以永久QUEUED/前端计时器冒充制作。Alternatives: 提前实现整个004会破坏feature边界。
- Decision: 提供最近50条只读核对与单条读取，解决响应丢失后的人工核对；不做005轮询和完整历史页。

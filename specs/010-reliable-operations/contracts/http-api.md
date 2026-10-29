# Contracts
## Identity
现有POST/GET/DELETE /api/session不变；点击切换先原生确认，取消不发DELETE。
## Templates
History读取GET /api/templates的{id,title}列表，不自行推导列表；失败显示重试，不阻塞历史加载。
## Admission
POST /api/jobs及/jobs/{id}/recreate共享配额。幂等同key/同内容先返回既有202；其他校验同008。
超过全局/本人未完成配额：429 ADMISSION_LIMIT；超过60秒创建速率：429 RATE_LIMITED。body沿用{error:{code,message}}，两者Retry-After:60，事务不创建任何业务记录；前端以明确4xx显示并解锁输入，用户稍后可新提交。
即时调度不可用：返回202持久QUEUED，后续scanner接管，不能返回QUEUE_REJECTED。
配置：STUDIO_QUEUE_CAPACITY=16控制内存等待槽位，独立于受理配额；STUDIO_MAX_PENDING=100、STUDIO_MAX_PENDING_PER_USER=20、STUDIO_SUBMISSIONS_PER_MINUTE=10，正整数。
## Operations
GET /actuator/studio，仅Java内部网络可达；Next /api/actuator/studio与/api/studio均404。
返回{counts:{queued,running,succeeded,failed,cancelled},failureRate,queue:{samples,totalMs,averageMs},stages:[{stage,samples,totalMs,averageMs}],retries,scanner:{failures,lastSuccessAt}}。
计数/耗时来自MySQL，进程重启保留；scanner进程计数重启清零；未完成/无STARTED任务无排队样本，stage无样本不返回该项。无终态样本failureRate=0。
禁止返回用户、任务标识、令牌、文件名；Cache-Control:no-store。

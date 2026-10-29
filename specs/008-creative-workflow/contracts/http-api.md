# HTTP contracts
所有私有资源本人校验，无身份401，他人404，no-store。
GET /api/assets?limit=20&cursor=id：{items:[{id,url,mimeType,sizeBytes,createdAt}],nextCursor}，limit1～50，按created_at/id倒序，非法/他人游标400。
POST /api/jobs扩展可选sourceJobId：本人终态原任务且模板相同（否则409/422），可更换素材和参数；来源入配方和幂等摘要。GET recipe沿用。
GET /api/jobs扩展q（最长60，按显示名/模板名子串）、templateId、status（QUEUED/RUNNING/SUCCEEDED/FAILED/CANCELLED）、from/to（ISO日期含当日UTC边界，前端本地日期转ISO瞬时）、favorite（boolean）、hidden（默认false）；非法400。筛选后keyset分页；active接口仍返回本人所有活动任务。
PATCH /api/jobs/{id}/library：部分{displayName?,favorite?,hidden?}，至少一项，displayName去首尾后1～60码点无控制字符；422非法，未知字段400；200{job}更新版本，执行状态不变。
POST /api/jobs/{id}/cancel：空体；本人QUEUED/RUNNING→FAILED/JOB_CANCELLED；200{job}。已取消重复200；其他终态409 JOB_NOT_CANCELLABLE；不删除素材/记录。
Job快照补充displayName:null|string,favorite:boolean,hidden:boolean,queueAhead:number|null（仅QUEUED，前方待处理估计数量）、attempt:number,nextAttemptAt:instant|null。内部调度不靠GET推进。
自动恢复/重试不新增用户写接口。使用INTERRUPTED事件记录恢复或暂时错误，最大3次执行，缺失素材/强制模拟失败/取消直接终止。启动将RUNNING恢复QUEUED或耗尽标失败，QUEUED直接补队。

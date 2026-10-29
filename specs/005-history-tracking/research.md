# 005研究决策

- Decision：keyset分页，ORDER BY created_at DESC,id DESC；Rationale：相同时间有稳定次序，新插入不移动旧页；Alternatives：offset遇新记录会重复/跳过。[MySQL8.4 LIMIT官方文档](https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html)
- Decision：JobTracker管理各ID的controller/timer/request代次，React effect清理实例；Rationale：不用闭包共享单一任务状态，卸载/换身份后即使fetch忽略abort也不能写旧响应；Alternatives：全局轮询会越页执行，SSE增加连接管理。[React useEffect](https://react.dev/reference/react/useEffect)
- Decision：1秒非重叠轮询；失败暂停单任务，显式“恢复查询”，保持最后快照；Rationale：清楚区分请求异常与后台FAILED，不隐式无限请求；Alternatives：查询失败直接改FAILED错误，自动重试不是必需。
- Decision：历史页同时查询分页与本人active集合；Rationale：刷新能恢复首屏之外未完成任务；Alternatives：只跟踪首屏遗漏老任务，全量历史一次拉取不可控。
- Decision：SessionGate挂载建立/复用身份，history提供切换访客；切换立即清空视图/取消请求再DELETE+POST；身份401清空个人快照，要求刷新重新建立。客户端不传ownerId。其他标签页撤销后当前页下一次私有请求401时清理，不提供跨标签实时通知。
- Decision：沿用现有视觉与原生语义按钮/图片；不新增UI库。所有未知项已解决，依赖版本不变。

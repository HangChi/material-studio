# Contracts
- SessionGate内部props为showIdentity，显示身份摘要，不提供游客重置行为。账号动作仍为/account和DELETE /api/session。
- 登录/注册入口不自动提交迁移，原账号页mergeGuest显式选择/确认保持。
- 退出中隐藏原owner视图，成功发material-visitor-epoch通知其他标签；卸载中止请求且代次失效。失败显示错误与重试，不能显示旧私有数据。
- 现有material-visitor-epoch键保持兼容，其含义为账号身份变化通知，不作为界面上“可切换游客”功能。
- SessionExpired仅说明当前会话失效及登录入口，不执行重置/刷新，也不承诺恢复丢失的游客身份。

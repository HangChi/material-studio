# UI Contract
GET /api/session沿用Java现有响应{user:{id,username}}；不新增HTTP端点。无账号或失败时提供“登录”链接，账号时链接可访问名称“管理账号：用户名”，title保留完整用户名，显示过长时截断；/account设置aria-current。
事件material-account-changed只表示同页账号展示需重读，不携带凭据或恢复码；原material-visitor-epoch键兼容跨标签。账号内容保留到用户确认恢复码，不能因Header更新卸载。所有既有POST/DELETE与确认语义保持。

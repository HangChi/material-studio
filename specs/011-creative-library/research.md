# Research
- Decision: 登记素材全部保留。Rationale: 草稿在浏览器，后端无法判断其引用；仅清理未登记老孤儿，不能以未关联job判断可删。
- Decision: 隔离与过期清理分开，DELETING持久中间态。Rationale: 文件系统和数据库不是一个事务，删前审计和可重复收尾保证异常可追踪。
- Decision: 复用单项受理+afterCommit。Rationale: 外层批次事务不能提前调度，避免失败批次泄漏执行。
- Decision: JDK PBKDF2WithHmacSHA256、600000次。Rationale: 无新增依赖，按OWASP当前PBKDF2工作因子；每次随机盐及常量时间比较。Source: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html 。不宣称最优算法或已做生产认证审计。
- Decision: 本地用户名+一次性恢复码，无邮件。Rationale: 适配独立容器、无需真实凭据；码丢失且忘记密码无法找回，页面必须说明。
- Decision: 迁移仅终态匿名源。Rationale: 运行中worker已缓存owner，直接改归属可能导致读取原素材失败；先完成或取消，比引入执行租约简单。

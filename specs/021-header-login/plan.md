# Plan
约章1.2.0 I～V通过；单智能体串行，继承018/020。
沿用绿#286353、墨#29332f、次级#62716a、画布#f7f8f7、白#fff、分隔#e0e5e1，系统中文黑体表单/导航与mono恢复码。右上角为独立44px轻描边账号链接，主导航不重复；手机用品牌/登录首行和三项导航次行。克制的单列白色表单作为唯一集中区域，删除重复页面标题，不引入营销图案或弹窗。
新增HeaderAccount客户端组件，使用已有GET /api/session+no-store，不与SessionGate并发创建访客。路由依赖及storage/custom event刷新，AbortController与序号忽略旧响应；失败回到登录入口。Account.notify在原跨标签通知之外派发同页展示更新事件，SessionGate不订阅该事件以保留恢复码门禁。
先测试入口、只读查询、失败降级、过期响应失效、注册成功头部更新但恢复码仍在；原SiteNav账号测试按新入口归属修改。纯视觉不新增快照测试。Docker完整lint/typecheck/test/build、生产前端重建，实际桌面/375px验收，无真实凭据提交。保留服务。

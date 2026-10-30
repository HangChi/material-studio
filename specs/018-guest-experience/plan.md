# Plan
## Context / Constitution
约章1.2.0 I～V通过，继承011账号/会话、016身份隔离与017界面。无新依赖、迁移或后端变更，单智能体串行。
## Design
SessionGate将allowSwitch替换为showIdentity，移除switchVisitor及确认弹窗，简化生命周期；游客区域为库图标+简短保留说明+登录/注册链接。登录区域显示username和管理/退出动作。退出显式触发原DELETE后重新读取会话，过程中卸载私有视图；失败仅可重新连接，不回退显示旧快照。
共用SessionExpired组件替换制作/历史/批次的“刷新重建访客”提示，说明游客恢复限制并提供/account入口。账号页现有绑定/显式迁移/恢复码和退出逻辑保持。
视觉复用--action/--soft/--line和StudioIcon，不再出现UUID。历史局部样式布局桌面横向、手机纵向。
## Verification
SessionGate新行为RED→GREEN：游客无切换/编号，登录提示，账号退出/失败，跨标签清理及旧响应隔离。原历史换游客测试改为模拟另一标签登录/退出通知，保留迟到分页断言。增加401的登录恢复指引断言。前端全量容器和生产构建；真实游客原作品仍在、链接正确、1280/375px截图，保留服务运行。

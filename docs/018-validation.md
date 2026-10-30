# 018 · 游客体验验收

2026-10-30，用户要求移除“切换访客”的演示性质入口，改为正常游客/账号体验。[规格](../specs/018-guest-experience/spec.md)、[计划](../specs/018-guest-experience/plan.md)、[界面契约](../specs/018-guest-experience/contracts/ui.md)、[任务](../specs/018-guest-experience/tasks.md)。

## 行为与兼容性

游客自动复用当前身份，记录页不显示UUID或切换按钮，展示无需登录即可制作、注册保留说明及/account入口。登录用户显示用户名、管理账号及退出登录；退出只撤销当前会话，处理期间卸载私有视图，失败显式重试。账号绑定/恢复码/显式游客迁移、后台任务与持久记录保持原契约。

跨标签沿用不含凭据的material-visitor-epoch标记，旧请求代次失效和卸载取消保留。历史、制作和批次共用会话过期提示，指向重新登录并说明原游客无法靠重建找回。不改变后端POST /api/session行为；用户手动清Cookie或刷新时仍可能建立新游客，不承诺恢复丢失的游客身份。

## 测试证据

四项新行为在原实现RED：缺游客提示、账号退出/失败和401登录入口（/tmp/xiaoying-018-red.log）。原游客切换相关三项测试被新需求替代；初始化abort、跨标签清理保留，历史迟到分页改用账号变更事件触发，断言旧记录不进入新身份保持。

相关31项通过；完整28文件131项，以及lint/typecheck/生产构建通过（/tmp/xiaoying-018-all.log）：

```sh
docker compose --profile test run --rm --no-deps frontend-test sh -c 'npm run lint && npm run typecheck && npm test && npm run build'
docker compose up --build -d --no-deps frontend
```

无后端/数据库/依赖变更，Java沿用016的97项基线，不冒充本轮重跑。未推送远端、未触发新CI。

## 实际浏览器

当前原演示游客的成功作品仍存在；刷新与进入账号页再返回均未替换身份或丢失记录。登录/注册链接正确进入已有账号表单，未提交凭据或操作用户账号。1280及375px文档宽度均等于视口，提示及入口无溢出；临时视口已恢复。

登录态展示、退出中/失败、401和跨标签以可控组件测试验证，不声称已在真实账号上执行退出或恢复。当前前端已重建、项目保留运行。

- [桌面游客提示](018-guest-desktop.jpg)
- [375px游客提示](018-guest-mobile.jpg)

实际投入包含规格/交互TDD、身份生命周期简化、容器全量和浏览器验证，执行日志见[工作日志](work-log.md)。没有删除游客/账号数据或重置当前用户身份。

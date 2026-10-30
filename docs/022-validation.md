# 022 · 精简账号表单与密码规则验收

2026-10-30，容器检查、生产重建与真实浏览器验收完成。

## 交付

登录/注册删除标题重复介绍、规则段落、密码管理器和本地草稿说明。用户名/新密码规则放入输入提示，保留可见标签；注册只留一行数据保留说明。游客合并默认原生details收起，展开后默认不勾选，勾选提交仍须明确确认。

注册和恢复的新密码8～18字符，8/18接受、7/19拒绝，无额外字符组成限制。登录及恢复码轮换保留8～128字符认证，以兼容旧密码；已有哈希和账号不变。非法新密码不创建账号、不消耗恢复码或撤销现有会话。一次性恢复码保存门禁和验证节流保留。无数据库迁移或依赖变化。

## 实际验证

- Java先RED：9项账号测试中3项因8位被拒、旧规则文案和8位恢复失败，6项通过（`/tmp/xiaoying-022-java-red.log`）。新增边界及旧长密码兼容测试使用独立tmpfs数据库，历史账号通过测试SQL生成旧哈希，不改演示账号。
- 前端先RED：6项中3项因缺少新范围/折叠合并失败（`/tmp/xiaoying-022-front-red.log`）。首次全量发现测试误把原生details收起理解成DOM移除，改为断言不可见/展开可见及默认未选，未改为宽松的存在性断言。
- `docker compose --profile test run --rm backend-test mvn -B verify`：100项，0失败/错误/跳过，打包通过（`/tmp/xiaoying-022-java.log`）。
- `docker compose --profile test run --rm --no-deps frontend-test sh -c 'npm run lint && npm run typecheck && npm test && npm run build'`：30文件141项，lint/typecheck/构建全部通过（`/tmp/xiaoying-022-front.log`）。
- `docker compose up --build -d --no-deps backend frontend`成功（`/tmp/xiaoying-022-runtime.log`），前端/后端/MySQL均healthy。独立测试数据库停止并移除，运行项目与数据卷保留。
- 真实1280/375px登录/注册，手机合并展开与找回/返回登录核对完成，无横向溢出；读取实际输入属性确认注册与找回均minLength=8/maxLength=18。未填写或提交真实凭据、修改用户密码、注册账号或提交制作任务；真实凭据流程不冒充验收，行为由API与组件测试覆盖。浏览器视口恢复并保留账号页。未推送远端、未运行新的远端CI。

## 截图

| 界面 | 桌面 | 手机 |
|---|---|---|
| 登录 | [桌面](022-login-desktop.jpg) | [手机](022-login-mobile.jpg) |
| 注册 | [桌面](022-register-desktop.jpg) | [手机](022-register-mobile.jpg) |

另有[手机展开合并](022-merge-mobile.jpg)、[手机找回账号](022-recovery-mobile.jpg)。

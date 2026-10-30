# 020 · 全站界面减法验收

2026-10-30，本地 Docker 与真实浏览器验收完成；规格见 `specs/020-product-restraint/`。

## 交付

模板库、制作页、记录页、批量制作、账号页及导航统一简化：用途文案替代宣传口号，移除装饰插画、箭头、重复序号与图标，收紧字号与空白，减少嵌套外框。账号采用单列表单，保留访客绑定、迁移确认、恢复码保存和草稿本地限制。模板名称、样张和作品内文字保留。

V16 只更新三个内置模板的说明，不改表结构、用户记录或模板配置；旧迁移保持原样。实际运行日志显示从15迁移到16成功，页面已显示新说明。没有API、依赖或业务状态规则变化。

## 实际验证

- 前端两轮完整容器检查，最终 `docker compose --profile test run --rm --no-deps frontend-test sh -c 'npm run lint && npm run typecheck && npm test && npm run build'`：29文件、134项通过，lint/typecheck/生产构建通过。日志 `/tmp/xiaoying-020-final.log`。
- 后端 `docker compose --profile test run --rm backend-test mvn -B verify`：97项通过，0失败/错误/跳过，打包成功；使用独立tmpfs测试数据库。日志 `/tmp/xiaoying-020-java.log`。
- `docker compose up --build -d --no-deps backend frontend` 成功，前端/后端/MySQL均healthy；只移除本轮独立测试数据库，运行项目和卷保留。
- 五类页面逐页1280/375px检查，document.scrollWidth均等于视口。手机更多筛选展开/收起、多选/清空正常，既有游客作品仍在。账号登录/注册提示及输入展示已核对，未输入真实凭据、提交新任务或修改用户数据。
- 本轮为样式和文案调整，不强造视觉RED；原账号测试只更新注册入口定位文本，行为断言未放宽。未运行新的远端CI或推送。没有宣称真实账号登录/恢复/迁移端到端验收，相关行为由现有组件和Java回归覆盖。

## 截图

| 页面 | 桌面1280px | 手机375px |
|---|---|---|
| 模板库 | [桌面](020-catalog-desktop.jpg) | [手机](020-catalog-mobile.jpg) |
| 制作页 | [桌面](020-making-desktop.jpg) | [手机](020-making-mobile.jpg) |
| 制作记录 | [桌面](020-history-desktop.jpg) | [手机](020-history-mobile.jpg) |
| 批量制作 | [桌面](020-batches-desktop.jpg) | [手机](020-batches-mobile.jpg) |
| 账号 | [桌面](020-account-desktop.jpg) | [手机](020-account-mobile.jpg) |

另留[手机选择作品后的操作栏](020-history-selection-mobile.jpg)。临时视口已恢复，浏览器保留批量制作页。

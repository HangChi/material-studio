# 017 · 制作记录界面优化验收

2026-10-30；来源为用户两张筛选/批量工具截图。[规格](../specs/017-history-interface/spec.md)、[计划](../specs/017-history-interface/plan.md)、[界面契约](../specs/017-history-interface/contracts/ui.md)、[任务](../specs/017-history-interface/tasks.md)。

## 结果

- 主筛选统一为搜索、模板、状态与应用按钮；日期/标签按需展开并保持输入；收藏/隐藏选项和已应用数量独立呈现。
- 空记录隐藏批量工具，未选时只有紧凑入口；选中后显示计数、分组操作与ZIP，标签编辑另行展开。批量/ZIP额度及原接口保持。
- 沿用现有品牌，新增页面作用域样式及统一线性图标，控件44px；标签覆盖/清除含义明确，清空选择及请求完成焦点可恢复。

## 容器证据

新增history-interface/bulk-interface四项，RED因缺少更多筛选、零选择仍显示动作、空集仍显示工具和缺ZIP解释失败。实现后相关17项通过，完整27文件130项及lint/typecheck/Next构建通过：

```sh
docker compose --profile test run --rm --no-deps frontend-test sh -c 'npm run lint && npm run typecheck && npm test && npm run build'
docker compose up --build -d --no-deps frontend
```

日志：`/tmp/xiaoying-017-red.log`、`/tmp/xiaoying-017-green.log`、`/tmp/xiaoying-017-all.log`。浏览器发现的小屏CSS优先级冲突修正后重新生产构建，见`/tmp/xiaoying-017-final-build.log`。未新增依赖，Java未改动，沿用016的97项全量基线；本轮未推送远端或宣称新CI通过。

## 实际浏览器

在独立演示游客中以项目自带portrait.png创建一项真实成功作品，不使用用户私人图片或修改其他身份资料。检查空态、常用/更多条件、未选/已选、标签展开及清空选择。清空后焦点落在稳定选择按钮；批量写请求和额度通过可控测试覆盖，没有为截图修改账号或已有作品。

1280px及375px下document.scrollWidth分别等于1280及375，无横向溢出。修正了原全局label:first-child规则对搜索框和日期范围的干扰；最后真实截图已目视复核，临时视口恢复。页面现已在当前运行前端生效，MySQL/Java/前端均healthy，按用户此前启动要求保留运行。

截图：

- [桌面常用筛选与选中工具](017-history-desktop.jpg)
- [桌面更多条件与标签展开](017-history-selected-desktop.jpg)
- [桌面未选择作品](017-history-idle-desktop.jpg)
- [375px完整展开态](017-history-mobile.jpg)

本轮实际投入包含规格/交互TDD、页面结构/CSS、容器检查与多轮真实浏览器修正，工具时段约2026-10-30 18:39～18:51（Asia/Shanghai），不折算人工工时。

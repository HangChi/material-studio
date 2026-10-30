# 019 · 批量制作工作台验收

2026-10-30，用户截图要求改善批量制作页面。[规格](../specs/019-batch-workbench/spec.md)、[计划](../specs/019-batch-workbench/plan.md)、[界面契约](../specs/019-batch-workbench/contracts/ui.md)、[任务](../specs/019-batch-workbench/tasks.md)。

## 改动

桌面采用制作清单与280px准备概览，手机依次纵向排列。制作项头部集中序号、模板及移除，上传区缩为图片与信息组合；多图模板独立槽位。名称、增加项与唯一提交入口分工明确。概览反映就绪项/图片数，所需素材不足时不能提交；该进度只代表准备素材，与后台制作进度区分。

批次历史补充空态、结束数量、进度和编号层级。所有上传样式由batch-workspace限定，原UploadSlots逻辑未修改；无后端/数据库/依赖变更。

## 容器验证

workbench.test.tsx三项先RED：缺少进度、具名区域与容量提示。实现后与原批次/上传/素材库13项通过；完整29文件134项及lint/typecheck/Next构建通过。

```sh
docker compose --profile test run --rm --no-deps frontend-test sh -c 'npm run lint && npm run typecheck && npm test && npm run build'
docker compose up --build -d --no-deps frontend
```

日志为`/tmp/xiaoying-019-red.log`、`/tmp/xiaoying-019-green.log`和`/tmp/xiaoying-019-all.log`。视觉复核后收紧状态标签间距、提高辅助字号，最终生产重建成功（`/tmp/xiaoying-019-refined.log`）。Java沿用016的97项基线，未冒充本轮重跑；未推送远端或执行新CI。

## 实际浏览器

- 在原演示游客中，从素材库复用项目演示图片。1项就绪时进度1/1、提交启用；增加第二项并选三图拼贴后，进度1/2、图片1/4、提交禁用，第一项保留。
- 桌面1280px和手机375px均document.scrollWidth等于视口；多图排列和素材库展开可用。临时视口恢复，演示选择清空并保留批量页面。
- 没有为截图提交真实批次、取消任务或删除素材。幂等安全重试/旧列表保护/历史恢复由原批次回归覆盖，新增就绪进度/模板隔离/1～10项边界由行为测试覆盖。
- 当前前端已更新，前端、Java、MySQL均healthy，按用户此前要求保留服务运行。

截图已目视核对：

- [桌面单项准备完成](019-batch-desktop.jpg)
- [桌面多项与三图模板](019-batch-multiple-desktop.jpg)
- [375px多项及概览](019-batch-mobile.jpg)

实际投入包含规格/测试、布局及局部样式、容器检查和多轮浏览器字号/间距调整，执行证据见[工作日志](work-log.md)。没有新建身份或修改其他用户数据。

# Implementation Plan
## Summary / Technical Context
沿用 Next/React/TypeScript，无新增依赖。全局视觉令牌配合共享 SVG 品牌、图标与客户端当前导航；保留现有业务组件。
## Constitution Check
读取现行008规格、计划、任务、契约与约章；单智能体串行。视觉改造使用既有业务回归和截图验证；导航新增可访问行为先RED后GREEN。容器执行检查与运行。
## Design
石板墨 #253732、工坊青 #286353、纸白 #ffffff、雾灰 #f4f6f4、分隔线 #dce3de、黄铜 #b18b51。
标题使用本地衬线中文字体，操作与正文系统无衬线，数据等宽。小面积衬线体现装帧，工具区保持清晰。
布局：安静的全局页头 → 模板引导与原创叠片示意 → 分类与样张网格；详情以样张/规格双栏，制作台分区；历史筛选栅格与结果卡片。
Logo：两张交错照片与裁切边角，不使用闪光、机器人或渐变。
## Project Structure
frontend/src/components/{BrandMark,StudioIcon,SiteNav}.tsx；app/globals.css、layout.tsx、icon.svg；现有features与history页面。
## Complexity Tracking
无新增业务、存储、依赖或外部资源。仅导航选中语义是新增UI行为。

## 上传区精修方案
复用原生file input，采用视觉隐藏但可键盘聚焦的实现，关联可见label作为本地选择/预览区域；保留图片N的可访问名称。单图横向素材行，多图纵向卡片，共享空态/已有素材结构。素材库放在卡片下方的独立整行区域。底部统一状态、清空、任务核对、提交，各自语义与禁用条件不变。以既有上传/草稿/提交回归验证，无新业务行为，不强造RED。

## 制作记录精修方案
JobCards使用200px预览+弹性正文的作品行，底部共享管理和执行详情区域。成功图片限制预览高度并object-fit:contain，其他状态显示克制的记录图标。JobActions保留业务逻辑，下载强调为主操作。WorkControls原生details保留，展开区统一名称表单与收藏/隐藏操作。375px纵向适配，使用现有回归与浏览器验证纯视觉调整。

## 明信片编辑区精修方案
PostcardEditor采用左预览右设置，手机先预览后设置。预览与画布stage有清晰边界；设置区共享标题/字数行，双列配色/比例控件；每张图片裁剪卡使用三列短标签、range和输出，重置按钮在卡片标题行。保留原生input/select及其可访问名称，已有业务回归和浏览器截图验证，无新增业务行为。

## 视觉收敛方案
去掉重复装饰性文案与首页CSS插图；降低标题字号、使用系统无衬线，减少浅绿底与重复边框；照片作品作为视觉主体。原生select保留，在CSS集中appearance:none、单个SVG chevron背景定位right 14px center、padding-right:38px，forced-colors恢复系统箭头。使用既有回归及桌面/375px实际原生下拉选择、计算样式和截图验证。

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

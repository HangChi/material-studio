# Plan
约章1.2.0原则I～V通过；单智能体串行，继承020/021/022。
从具体Unsplash免费照片页面核对作者和许可，不用Unsplash+、API或随机图片服务。六张为旅行人物、湖景、旷野、花卉、咖啡、森林。以CDN固定URL按最长边1600提供JPEG/PNG，本地保存与sha256清单，原图版权归摄影者。
前端公共samples目录保存六图及ZIP，静态manifest驱动首页SampleGallery，提供实际文件尺寸/类型、原来源与下载。沿用绿/白/系统字体，照片为主体，3列桌面/2列平板/单列手机；人工步骤details默认收起，首页与页脚可达，不增加导航负担。
Java容器内离线工具复用TemplateRenderer/PostcardRenderer，以只读文件AssetService提供照片，生成原三个PNG封面；不复制渲染算法，不写DB。工具验证6张正常输入/4类异常样例，生成来源/步骤/ZIP并检查解压CRC。ZIP不自动导入任何身份。
新增图库下载/许可/整包入口测试先RED；全前端lint/typecheck/test/build、后端模板图片回归与工具运行。真实首页/375px、下载静态内容核对，不提交制作任务，文档记录用户待做的人工制作验证。

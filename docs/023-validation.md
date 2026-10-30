# 023 · 真实照片与人工验证素材验收

2026-10-30开始，2026-10-31完成本地验收。

## 已交付

- 首页三个模板封面换为真实照片样张，由现有TemplateRenderer/PostcardRenderer离线生成；业务配置和接口不变，封面使用contain展示完整成品。
- 首页和页脚可进入“示例素材”，6张照片可预览、逐张下载、查看作者原来源和许可；整包下载无需登录。
- ZIP约5.1 MiB（5,330,631字节），包含01-valid的6张JPEG/PNG、02-invalid的4类异常文件及README/SOURCES。单张正常素材133 KiB～2.2 MiB，最长边1600，均满足5 MiB/2000万像素限制。
- 下载入口：http://localhost:3000/samples/manual-verification.zip 。解压后按README验证；ZIP本身不是上传图片。
- [人工步骤](manual-materials.md)、[照片出处/校验和](../frontend/public/samples/SOURCES.md)、[数据清单](../frontend/src/features/samples/materials.json)。

## 来源

2026-10-30逐项核对Unsplash免费照片页面：Luca Bravo的湖边行者/山间湖景/旷野远景、Karina Vorozheeva的花卉、Nathan Dumlao的咖啡、Sebastian Unrau的森林。页面均标明免费适用Unsplash License；未用Unsplash+、API或随机服务。固定CDN URL下载指定JPEG/PNG大小版本，本地存储，不依赖运行时外部图片。版权归摄影者，包中保留出处与许可链接；不能把未修改照片直接销售或编成竞争图库，完整条款见 https://unsplash.com/license 。

## 验证

1. 新gallery契约先RED：缺少“示例素材”区域失败（`/tmp/xiaoying-023-red.log`）。实现6个下载、作者来源、ZIP与许可链接/折叠步骤后GREEN。
2. 资产工具真实解码6图、计算尺寸/大小/sha256，调用现有Java渲染器生成3张PNG。生成并核对超5MiB、4500×4500超像素、损坏JPG、非图片4类样例。ZIP12项逐项CRC/字节校验通过（`/tmp/xiaoying-023-assets-final.log`）。工具仅只读文件模拟AssetService，不写会话、账号或素材数据库。
3. 第一次尝试Maven dependency插件解析停滞，已仅停止那个临时工具容器；改用现有依赖缓存和Spring Boot包中lib离线运行成功，未将环境停滞算RED。
4. `docker compose --profile test run --rm backend-test mvn -B verify`：100项/0失败/错误/跳过与打包通过（`/tmp/xiaoying-023-java.log`），独立tmpfs数据库。
5. 前端容器lint/typecheck/test/build：31文件142项及构建通过（`/tmp/xiaoying-023-front.log`）。新增HTTP验证脚本后另跑lint通过（`/tmp/xiaoying-023-final-lint.log`）。
6. 生产前后端重建成功（`/tmp/xiaoying-023-runtime.log`）。只读HTTP检查6张照片的响应格式/大小/sha256、ZIP及SOURCES下载与本地完全一致、三张封面PNG实际尺寸正确（`/tmp/xiaoying-023-downloads.log`）。
7. 真实浏览器1280/375px：首页照片封面、六图实际加载、页脚锚点定位、下载链接和步骤展开/收起正常；页面宽度等于视口。用户待做的制作/上传/拒绝用例写在包中，未冒充已由用户完成，也未在现有身份上传新素材或提交任务。临时视口恢复，保留素材页面。
8. 前端/后端/MySQL均healthy，独立测试数据库停止移除，演示库/文件卷保留。未推送远端或运行新CI。

## 复现

先按正常流程在Docker完成后端构建/verify以准备Maven缓存。照片已随项目提交；只有需要重新下载时运行 `python3 scripts/fetch-samples.py`（网络下载工具，不运行应用）。然后：

```sh
docker compose --profile test run --rm --no-deps -v "$PWD:/project" backend-test sh /project/scripts/prepare-samples.sh
docker compose --profile test run --rm --no-deps frontend-test node scripts/verify-sample-downloads.mjs
```

第二条要求项目frontend已启动。

## 截图

[首页完整桌面](023-home-desktop.jpg)、[桌面六图区域](023-gallery-desktop.jpg)、[375px完整页面](023-gallery-mobile.jpg)。

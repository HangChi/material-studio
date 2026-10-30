# 024 · 素材库对齐验收

2026-10-31完成。截图问题源于上传区域去掉外框/内边距后，旧素材库仍保留横向16px（手机12px）margin，且上边距为0。

修复单图素材库margin为16px 0 0，多图分别匹配槽位16px/手机14px内容缩进，保留批量页局部16px 0 0规则；空网格display:none减少空态留白，关闭按钮44px。仅CSS，无JS/API/数据/依赖改动，因此不造业务RED或CSS快照。

- 完整容器lint/typecheck/test/build：31文件142项与构建通过，日志 `/tmp/xiaoying-024-front.log`。
- 本地frontend生产重建成功，日志 `/tmp/xiaoying-024-runtime.log`，后端和数据库继续运行。
- 真实1280/375px分别核对单图页、批量页、三图页：六组素材库相对上传内容左右差均0px，素材库与slot-body垂直间隔均16px；所有场景document.scrollWidth等于视口。
- 当前浏览器已有一张演示素材，核对了该列表展开/关闭和缩略图显示，未上传、选取、删除素材或提交任务；空态隐藏仅CSS规则与已有空列表组件回归覆盖，未清空真实素材库伪造空态。
- 保存[桌面单图](024-library-desktop.jpg)、[手机单图](024-library-mobile.jpg)、[手机批量](024-batch-mobile.jpg)、[手机三图](024-multi-mobile.jpg)。恢复临时视口，保留单图制作页展开状态。
- Java无变更，沿用023的100项通过基线，未重跑Java、远端推送或新CI。

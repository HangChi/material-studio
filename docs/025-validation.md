# 025 · 执行详情与批量工具栏验收

2026-10-31完成。执行详情原来在卡片内展开，且旧网格规则会把入口从第二列移动到整行；两者共同造成位置变化。现改为原生dialog，移除该网格规则，锁定背景滚动并补偿滚动条，关闭后preventScroll恢复焦点。保留懒查询、版本更新、错误重试及关闭/卸载abort。批量区改为紧凑全选/取消全选、数量、清空与44px按钮，标签默认折叠，原操作与50/20项限制保留。

- RED：Docker运行events.test.tsx和bulk-interface.test.tsx，4失败/3通过，缺少dialog、关闭/Esc与取消全选；日志 `/tmp/xiaoying-025-red.log`。实现后首轮相关7项GREEN，另补充遮罩与卸载清理覆盖。
- 完整命令：`docker compose --profile test run --rm --no-deps frontend-test sh -c 'npm run lint && npm run typecheck && npm test && npm run build'`，31文件145项、lint/typecheck/build通过；日志 `/tmp/xiaoying-025-front.log`。
- 生产frontend两次重建成功，最终构建包含手机关闭按钮不收缩/不换行样式；日志 `/tmp/xiaoying-025-final-runtime.log`。该纯CSS修正使用生产构建和浏览器复核，未重复整套测试。
- 真实1280×950：打开/关闭详情前后scrollY均137、入口top均735.171875、文档高度1087，关闭后焦点回入口，body overflow恢复。375×900在入口已滚动可见后，三次读数均scrollY642.5、入口top717.0078125、文档高度1542。第一次手机定位时End平滑滚动尚未结束，入口不在视口内，点击自动滚入造成200px变化；待定位稳定后复测如上，不将自动定位当弹窗跳动。
- 原生模态打开后背景不在可操作AX树中；Tab可进入事件区，Esc与关闭按钮均实际关闭并返回入口。375×600弹窗高568px，内容区432px/内容463px，键盘End可在内部滚动。手机scrollWidth375等于视口，无横向溢出；最终关闭按钮56×44px且nowrap。
- 真实桌面/手机对当前一项既有演示作品验证全选、取消全选、清空及操作布局；51项只选50由组件测试覆盖。没有修改收藏、隐藏或标签，没有下载ZIP、提交制作或变更身份。遮罩与卸载清理由组件测试覆盖。
- 截图：[桌面详情](025-events-desktop.jpg)、[手机详情](025-events-mobile.jpg)、[桌面批量](025-bulk-desktop.jpg)、[手机批量](025-bulk-mobile.jpg)。目视发现手机关闭文字换行，已修正并更新截图；临时视口恢复，弹窗关闭、选择清空，保留记录页。
- Java无变化，沿用023的100项基线；未重跑Java、远端推送或新CI。项目继续运行。

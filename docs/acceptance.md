# 原题R-01～R-14验收对照

依据[原题](requirements-source.md)，001为总体基线，002～008为独立交付。实现与实际运行分别记录，最终结果及具体边界见工作日志。

| 原题 | 实现证据 | 自动检查 | 运行证据及范围 |
| --- | --- | --- | --- |
| R-01 技术职责 | backend Spring/MyBatis/MySQL；frontend Next App Router/React/TS；README版本 | Java verify、前端lint/typecheck/build | Compose三服务，Next同源代理→Java→MySQL |
| R-02 模板 | TemplateMapper/TemplateController、catalog、V1自制种子/PNG | TemplateApiTest、catalog.test.tsx | 002两分类/三模板，封面本地可读 |
| R-03 上传 | UploadSlots/AssetService、服务端格式/解码/大小/像素限制 | AssetApiTest、upload.test.tsx、submission.test.tsx | 003真实双槽上传/移除/重新上传/预览，005延续 |
| R-04 异步受理 | JobSubmissionService事务后dispatch、BackgroundJobDispatcher | JobSubmissionTest跨连接可见、阻塞worker仍202；Lifecycle有界队列 | 004无查询后台完成、实际离开页面后恢复结果 |
| R-05 阶段/状态 | PipelineState/Worker、V3 job_event/version、结果原子写盘 | PipelineApiTest六事件与10次终态不变；Consistency事务回滚 | 004真接口六事件/PNG，所有GET只读 |
| R-06 可控模拟 | 每任务Simulation快照，0～10000ms、三个指定失败阶段 | PipelineApiTest参数化失败/参数边界/隔离 | verify-004三个失败阶段与成功；README请求示例 |
| R-07 状态/查询异常 | JobCards/JobTracker、上传/受理状态、独立queryError、ResultPreview资源错误/重试 | tracker.test.ts三任务503与恢复、无虚假FAILED；submission门禁 | Chrome临时离线保持RUNNING快照，恢复查询后SUCCEEDED；正常自动更新；006真实图片404提示后恢复文件，点击重试成功且任务保持成功 |
| R-08 多任务/清理 | 每ID非重叠1秒timer/controller、epoch、version、终态保护 | tracker.test.ts迟到/低版本/两周期/abort；session及history切换测试 | 005浏览器及运行脚本验证多任务；假时钟清理不冒充浏览器计数 |
| R-09 刷新/结果历史 | /history、HistoryService keyset分页、/jobs/active补老页任务 | HistoryApiTest55条同时间/插入稳定性；history.test.ts空态/分页失败/恢复 | verify-005覆盖24条真实记录/分页；浏览器刷新恢复与私有PNG；006原末页新增25条及旧游标替换回归通过、失败保留游标 |
| R-10 身份 | HttpOnly cookie/hash、owner校验、SessionGate切换、storage事件 | SessionApiTest、Asset/Job归属、session.test.ts跨标签清理 | 无痕/新身份隔离；撤销旧token401，新cookie空记录 |
| R-11 可用性 | 蓝白作品台账、语义控件、创建时间/阶段/原因/预览、移动单列 | 组件Testing Library语义断言、lint/typecheck | 002～005桌面/375px、002键盘焦点证据；无原题附件截图 |
| R-12 CI与测试 | .github/workflows/ci.yml push/PR容器任务 | 本地53个Java测试、87个前端测试及构建（008后） | 本地容器检查已执行；未创建远端，远端CI未运行 |
| R-13 源码与说明 | 本地独立Git目录、锁文件/SQL/CI/README/工作日志、阶段提交 | 文档链接/任务/原题副本一致性检查 | 本地目录交付，最终验收commit由最后提交记录确认；无外部发送 |
| R-14 容器 | compose.yaml、Dockerfiles、.env.example、卷/健康检查 | 同CI容器入口；镜像构建不代替测试 | docker compose up --build -d；004SIGKILL恢复；回滚步骤见README |

## 已知边界

- 单后端实例、持久排队与内存有界队列；008会从第一阶段恢复未完成任务并有限自动重试，最多三次执行。全部三模板真实合成；无真实AI或阶段断点续跑。
- 跨标签身份通知依赖localStorage；存储禁用时其他标签页需手动刷新。通知不存token；切换本页仍立即清理。
- 无账号/身份找回；切换或清除cookie后无法恢复旧访客；资源保留但归属隔离。
- 孤儿文件不自动清理；需要演示重置数据卷时统一清理。没有真实TLS、公网部署或远端CI验证。
- 查询异常暂停对应任务，由用户恢复；不宣称实现自动重试算法。分页历史按创建时间+ID，未完成旧页由active集合恢复。

006额外完成10次API及10次浏览器可见编号的<2秒验收，每次使用默认三个2000ms阶段；完整数据见[受理时延记录](admission-measurements.md)。

具体RED/GREEN、容器和浏览器结果以[工作日志](work-log.md)为准。

## 007 用户新增功能验收

| 功能 | 证据 | 运行与浏览器 |
| --- | --- | --- |
| 幂等与安全重试 | CreationApiTest 4并发同key仅一编号/一次dispatch、冲突409、无效key400；submission.test.tsx丢响应remount后相同key/body恢复 | verify-007真实代理并发返回同任务，变更内容409 |
| 下载/再次制作/失败重试 | CreationApiTest对比PNG字节、源关联、failStage清除、丢素材回放/新操作422及他人404；actions.test.tsx丢响应/下载错误/abort | 真实脚本及浏览器PNG下载、独立新编号、历史两项并存 |
| 事件详情 | events.test.tsx按需加载/版本更新/失败保留/收起abort；后端六事件和真实合成文案断言 | 浏览器展开六事件；旧事件不改写 |
| 真实明信片/参数 | CreationApiTest输出像素、同尺寸裁剪移动、标题变化、两比例/配色、中文字体、参数校验/配方继承；postcard.test.tsx两图参数提交及锁定 | 双图上传→标题/配色/比例/键盘放大→后台成功，PNG1000×1000 |
| 小屏与工程交付 | Docker默认前端入口78项测试及lint/typecheck/生产构建；后端mvn verify44项/打包 | 1366×900桌面、375×812编辑/历史页无横向溢出、滑块Home/ArrowRight可操作 |

截图：[真实结果与执行详情](007-result.jpg)、[桌面编辑器](007-editor-desktop.jpg)、[375px编辑器](007-editor-mobile.jpg)。运行脚本 `scripts/verify-007.mjs` 撤销自己的临时测试身份，不泄漏令牌；演示文件/记录保留。浏览器丢响应/故障注入未执行，分别由组件/接口测试覆盖；远端CI/TLS/公网部署仍未验证。

## 008 七项拓展验收

| 用户功能 | 测试证据 | 实际链路/浏览器证据 |
| --- | --- | --- |
| 编辑后再次制作 | WorkflowApiTest来源归属/模板/原配方不变；workflow-editor恢复和新提交参数 | 浏览器从原任务da542ff0进入编辑，生成新任务6a3172ef，原记录保留 |
| 全模板真实合成 | WorkflowApiTest原图像素及拼贴顺序、CreationApiTest裁剪与文字像素 | verify-008下载三模板PNG并检查各自尺寸 |
| 素材库 | AssetLibraryTest本人分页/非法游标/未登录；library.test选择不上传 | 浏览器选用既有618d2a92素材替换第1槽 |
| 草稿 | workflow-editor跨remount恢复、清空失败不丢输入，draft-storage校验格式 | 修改标题/配色/裁剪后刷新仍保留，受理后提示草稿已清空 |
| 历史管理 | WorkLibraryTest重命名/收藏/隐藏恢复/日期与搜索；work-library包含重命名后模板搜索；work-route直接验证Next PATCH导出 | 浏览器收藏/重命名“持续创作验收作品”、搜索、隐藏后消失、隐藏列表恢复、模板搜索可找到 |
| 取消/排队 | CancellationTest归属、幂等、取消后complete/start拒绝；actions.test取消 | 实际脚本排队/运行取消、他人404；浏览器354fc102显示已取消且无下载 |
| 恢复/自动重试 | RecoveryTest暂时IO恢复/三次耗尽/确定性失败不重试/领取前数据库错误上限；PersistedBacklog容量1排六任务均一次成功；Lifecycle启动/退出/队列边界 | 真实SIGKILL后66d5b18d同编号第2次成功、原等待项acd29021第1次成功并保留恢复事件 |

最终：53项Java测试与mvn verify通过；87项前端测试、lint/typecheck/build通过（缓存依赖镜像、当前src只读挂载）；正常生产Docker镜像构建成功。全新npm ci下载长等待、Maven首次TLS故障单独记录，不算业务RED或检查通过。无远端CI/TLS/公网部署验证。

桌面1366×900、375×812编辑/历史页验证，375px下scrollWidth=innerWidth=375。截图：[历史工作台](008-history-desktop.jpg)、[编辑草稿](008-editor-desktop.jpg)、[小屏历史](008-history-mobile.jpg)、[小屏编辑](008-editor-mobile.jpg)。

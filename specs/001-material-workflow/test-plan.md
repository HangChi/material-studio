> 初始测试设计归档，场景编号保留溯源。实际测试、结果与未覆盖项见[实施追踪](traceability.md)、[验收对照](../../docs/acceptance.md)和[工作日志](../../docs/work-log.md)。

# TDD 验证计划（初始设计）

001制定本计划时尚未编写业务测试；后续已有64项前端、38项后端检查与构建通过。以下是原计划场景和原拟文件名，不表示这些旧路径都已原样创建，也不代表所有场景已经验证。
应用安装/测试/构建均在容器中进行；文档解析检查可在宿主执行。

现行测试映射：B01→TemplateApiTest；B02→AssetApiTest；B03→JobSubmissionTest；B04～B06/B08→PipelineApiTest、PipelineConsistencyTest、PipelineLifecycleTest；B07/分页→SessionApiTest、HistoryApiTest及归属测试。
F01→catalog/detail；F02→upload；F03～F05→tracker/session；F06→history；F07→submission；F08→api-proxy/submission-proxy。
实际使用Compose隔离MySQL和受控fetch/Promise，未引入初始计划中的Testcontainers/MSW。
复查已确认历史刷新游标缺陷，图片资源错误反馈也待补；SC-002十次耗时测量未补齐，详见[当前缺口](README.md)。

## RED → GREEN → REFACTOR

每次选择一个最小行为：先写测试，在容器运行，确认断言因目标行为缺失失败；补最小实现，再执行同一测试。
随后重构并跑受影响测试集合；在 docs/work-log.md 记录命令、失败断言、通过结果与耗时。
环境/编译配置错误先修正，不作为行为 RED；未安装依赖不得假称“测试先失败”。
阶段任务先列测试，再列实现，但执行时按单个行为小循环，避免一次写完整套失败测试后再一次性实现。
不为纯文档或默认脚手架制造镜像实现的测试；用解析、构建或启动检查验证配置。

## 后端行为与契约

| 编号 | 场景/关键断言 | 计划测试文件 | 对应 |
| --- | --- | --- | --- |
| B01 | 分类筛选、模板数量差异、空结果/未知 ID | backend/src/test/java/com/materialstudio/template/TemplateApiTest.java | US1 |
| B02 | 图片边界：0、上限、上限+1；伪 MIME、损坏内容；跨用户素材不可见 | backend/src/test/java/com/materialstudio/asset/AssetApiTest.java | US2 |
| B03 | 数量/重复/归属不符不创建；提交已返回但 worker 尚未放行；事务提交后才投递 | backend/src/test/java/com/materialstudio/job/JobSubmissionTest.java | US2 |
| B04 | 精确顺序 ASSET_CHECK→GENERATE→FINALIZE；每次事件落库；无查询也完成 | backend/src/test/java/com/materialstudio/job/JobPipelineTest.java | US3 |
| B05 | 对三个 failAt 参数化，失败后的阶段没有调用/事件；真实文件不可读同样中断 | backend/src/test/java/com/materialstudio/job/JobPipelineTest.java | US3 |
| B06 | 队列拒绝写 FAILED/null；结果落盘失败不能成功；重复查询无更新；终态不可回退 | backend/src/test/java/com/materialstudio/job/JobLifecycleTest.java | US3 |
| B07 | token hash、cookie 属性、当前身份、切换隔离，历史/详情/事件/结果越权返回404 | backend/src/test/java/com/materialstudio/identity/PersonalHistoryTest.java | US4 |
| B08 | 真 MySQL/MyBatis：事务回滚、事件与任务原子更新、游标分页、重启中断对账 | backend/src/test/java/com/materialstudio/job/JobPersistenceTest.java | US3/4 |

单元测试使用可注入 Sleeper、受控 Executor、临时目录及 latch，不靠长时间 sleep。
受理测试用 latch 阻塞 worker，先断言已得到 202 再释放，证明接口不等待执行。
集成测试使用 Testcontainers MySQL 8.4，不能用 H2 代替证明 MySQL 行为；容器需可访问测试 Docker daemon。
模拟参数必须是任务级快照，验证两个任务配置互不污染。

## 前端行为与请求生命周期

| 编号 | 场景/关键断言 | 计划测试文件 | 对应 |
| --- | --- | --- | --- |
| F01 | 筛选、详情、加载/空态/失败重试/404 | frontend/src/features/templates/templates.test.tsx | US1 |
| F02 | 选择/替换/移除、校验、失败恢复；迟到上传不能填回已替换槽位；禁用重复提交 | frontend/src/features/assets/upload.test.tsx | US2 |
| F03 | 三任务乱序返回，只更新对应任务；版本旧响应丢弃，终态不回退 | frontend/src/features/jobs/tracking.test.tsx | US4 |
| F04 | GET503/网络失败只设 queryError，不设 FAILED；恢复后可成功 | frontend/src/features/jobs/tracking.test.tsx | US4 |
| F05 | 终态后停止；无未结束任务不查；卸载/换身份清理，旧 epoch 响应忽略 | frontend/src/features/jobs/tracking.test.tsx | US4 |
| F06 | 刷新从历史恢复并跟踪；历史空/失败/分页；成功结果预览；结果资源失败不改变任务状态 | frontend/src/features/jobs/history.test.tsx | US4 |
| F07 | 受理后解除 submitting 并显示任务；响应丢失提示查历史，不自动重提 | frontend/src/features/jobs/submission.test.tsx | US2 |
| F08 | cookie/Set-Cookie、multipart/图片和错误码通过代理保留，个人响应不缓存 | frontend/src/lib/api-proxy.test.ts | foundation |

使用 Vitest 假时钟、MSW 和可控 Promise 检查请求数及 abort；不能只断言文案。
用户切换先启动旧身份请求，再切换并让旧响应迟到，验证新身份的数据完全不变。

## CI 与人工验证

CI 在 push/pull_request 中独立执行 eslint、tsc --noEmit、vitest run、next build、mvn verify；
Java verify 必须包含关键集成测试，不能把测试放到 CI 不执行的命名/插件模式中。
CI 使用容器运行各应用检查，按需提供 Testcontainers 的 Docker socket 和网络设置。

人工按 quickstart 完成成功、三个失败阶段、多任务、刷新、身份切换、查询异常、375px 和键盘操作。
SC-002 的 10 次受理耗时在本地容器正常负载记录；单元测试不将脆弱 wall-clock 阈值作为正确性依据。
最后保存各项“通过/失败/未验证”及原因，不以静态审查替代实际运行结论。

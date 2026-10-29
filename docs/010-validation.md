# 010实际验证记录

## 基线与交付
- 起始文档基线a03a782。公开仓库：https://github.com/HangChi/material-studio；用户明确授权创建公开仓库。
- 公开前审查49个历史提交：敏感配置文件名、常见私钥/GitHub/OpenAI/AWS凭据模式均0命中；无真实凭据加入仓库。
- `WEB_PORT=3101 docker compose -p material-studio-010-cold up --build -d --wait`从不存在的独立卷创建mysql-data/asset-data，三服务健康。使用已有Docker依赖层，未宣称无缓存全量下载。
- 独立cold项目frontend执行scripts/verify-008.mjs通过：素材分页、三模板真实PNG、编辑配方、重命名/收藏/隐藏恢复/搜索、排队取消、跨身份隐私；编辑任务74edd4e2。
- 浏览器两个3101/history标签显示相同访客609b26d9；切换后均显示6639c02e，真实storage联动通过，未向原3000服务发送撤销请求。不同端口并不隔离浏览器Cookie；后续浏览器验收改用127.0.0.1以隔离localhost Cookie，不能把端口隔离称为身份隔离。
- 首次远端CI运行[40901483518](https://github.com/HangChi/material-studio/actions/runs/40901483518)，前端与后端两项均success；完整依赖安装/检查在GitHub runner容器执行。

## US2访客确认
- RED：容器session.test.tsx为4通过/1失败，取消用例断言confirm被调用实际0次，目标行为缺失。
- GREEN：原生confirm前置于身份变更/撤销，取消保持私有视图；lint/typecheck及session/history共13项通过。

## 交付检查
- 最终实现与浏览器检查已完成，最新提交远端CI等待推送后核实。

## US3动态模板
- RED：容器template-filter.test.tsx三个测试均因动态选项/重试/abort缺失失败。
- GREEN：History独立读取Java模板接口，保留当前选择、错误重试/卸载abort，不阻塞历史；全前端20文件94项测试、lint/typecheck/生产构建通过。
- 整合时旧history测试桩把所有额外请求当分页，导致四个用例失败；修正桩明确处理/api/templates后恢复通过，不修改既有分页目标断言。

## US4持久受理
- RED：AdmissionPolicyTest/JobSubmissionTest/PipelineLifecycleTest/PersistedBacklogTest共14项，6项失败：配额未拒绝、跨访客超额、内存满和关停调度变FAILED。
- GREEN：V7全局受理锁行、READ_COMMITTED受理事务、本人锁→幂等回放→全局锁→计数/限额→创建；调度异常保留QUEUED。14项全部通过，随后全量Java56项/打包通过。
- 内存容量1下真实HTTP连续受理6项，最终每项成功、一次执行、六条阶段事件；跨访客6并发总配额3只能受理3；个人待办2、滚动分钟3（测试小值）拒绝不创建任务，取消释放待办，过期时间释放速率，满配额可幂等回放。
- 配额429携带Retry-After=60；代理新增测试RED为该头丢失，补转发后9项代理测试及lint/typecheck通过。verify-005的24记录演示遵守限流退避，不关闭配额。
- Chrome DevTools Rendering真实forced-colors:active：黑底高对比文字/边框/原生箭头可见；任务状态下拉键盘选择正在制作，应用后没有匹配的作品，操作通过。随后恢复No emulation并关闭临时标签。

## US5内部监控
- 初始RED：OperationsTest两项均因/actuator/studio不存在返回404而失败。
- 阶段聚合从相邻数字版本改为相邻执行事件；新增管理属性造成版本跳号、失败阶段不计样本测试先RED（期望1样本实际0），实现后通过。
- 修复过程中发现：MyBatis代理无法用doCallRealMethod恢复抽象接口桩；独立调度器和可控mapper测试扫描故障。监控最初直接依赖具体dispatcher，导致旧测试替换JobDispatcher时上下文不兼容；拆分QueueScanMonitor后解耦恢复。此类测试基础设施错误不记作业务RED。
- GREEN：全量Java59项、0失败/错误/跳过、mvn verify打包通过。统计用一致只读事务，取消单列；完成阶段/首次排队毫秒样本来自事件，重试来自runtime，扫描失败及最近成功为进程指标。
- /actuator/studio是内部只读MVC监控入口；Actuator通用指标未开放，Next代理不允许访问，无用户/任务/文件标识。

## 最终真实验收
- 最终前端95项/20文件、lint/typecheck/生产构建通过；Java59项（0失败/错误/跳过）及mvn verify通过。
- 新项目material-studio-010-final、端口3102、首次创建独立MySQL和文件卷，生产镜像构建与三服务健康通过；Flyway V1～V7从空库初始化。依赖层使用Docker缓存，首次公开CI已在runner实际安装。
- 验收配置：STUDIO_QUEUE_CAPACITY=1、STUDIO_MAX_PENDING=8、STUDIO_MAX_PENDING_PER_USER=6、STUDIO_SUBMISSIONS_PER_MINUTE=10。容器执行scripts/verify-010.mjs通过：本人6待办拒第7项、其他访客2待办后达到全局8、相同key回放、八项各成功一次/六事件/可读PNG、本人累计10次后限流、外人404、Next无法代理监控。共本人10项、其他2项，全部成功。
- 监控零样本counts全0、queue.samples=0、stages=[]、failureRate=0，无NaN。链路后counts.succeeded=12、其余0，queue及三阶段均12样本，retries=0、scanner.failures=0；总排队58705.222ms、平均4892.10183333ms（本次运行样本，不作为性能承诺）。
- 127.0.0.1:3102真实浏览器确认：Escape取消后a19ffa6f保持；Return确认后两个标签均变为dc6e99e4。原生confirm最初使自动化挂起，使用键盘处理后恢复，没有把未完成操作记作通过。
- Java动态加载三模板，键盘选择旅行明信片并应用筛选后出现没有匹配的作品。375px实测innerWidth=scrollWidth=375，模板含全部及三模板共4选项；已恢复临时视口。
- 截图：[桌面](010-history-desktop.png)、[375px](010-history-mobile.png)。高对比由Chrome真实forced-colors模拟验证，非截图换色；不宣称完整屏幕阅读器或所有操作系统覆盖。
- 原3000项目更新使用保留卷的docker compose up --build -d --wait；不删除或重置原演示数据。独立验收项目仅含本轮测试数据，收尾停服务保留卷。

- 独立final项目再次运行verify-008成功，覆盖全三模板、素材分页、编辑配方、重命名/收藏/隐藏恢复/搜索、取消、排队和隐私；这是12样本核对后的追加测试数据。verify-010/005脚本node --check通过。原3000仅重建和健康检查，未执行写入演示记录的验收脚本。

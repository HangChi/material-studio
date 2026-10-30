# 016 · 代码审查优化验收

范围与验收：[规格](../specs/016-review-hardening/spec.md)、[计划](../specs/016-review-hardening/plan.md)、[兼容契约](../specs/016-review-hardening/contracts/http-api.md)、[任务](../specs/016-review-hardening/tasks.md)。2026-10-30，用户授权按审查顺序逐项优化；全部单智能体串行完成。

## 修复与回归证据

| 项目 | RED | GREEN / 保留行为 |
| --- | --- | --- |
| 批量取消并发结束 | HTTP预期200实际500，UnexpectedRollbackException | 锁内终态容忍，剩余取消提交；单任务终态409、归属404和重复取消保持 |
| 旧列表覆盖受理回执 | 旧GET返回后新批次标题消失 | 请求期间受理记录保留，分页去重、刷新重建第一页仍正确 |
| 空草稿恢复旧内容 | 移除最终照片/还原标题后，存储仍为旧照片/标题 | 空编辑覆盖旧草稿；重载为空；初次打开不创建空草稿，提交保护保持 |
| 批次逐项查询 | 两批五项触发五次任务owned读取 | 列表、关联、任务各一次，业务查询8→3；槽位/批次顺序、管理元数据、他人隔离和分页保持 |

永久测试位于BatchCancellationRaceTest、BatchReadTest、batches.test.tsx及draft-lifecycle.test.tsx。每项在原实现观察到目标缺陷后修复；取消用例最初的MyBatis spy调用错误不计RED，修正后重跑原实现确认真实事务回滚。完整命令和日志路径见[工作日志](work-log.md)。

## 查询与结构

任务只读快照及历史筛选通过LEFT JOIN读取job_library、job_runtime，缺失关联保留默认值；需要FOR UPDATE的路径维持原单表锁边界。共同列投影不再维护两份XML/非XML副本。批次读取拆为批量加载、分组、计数；前端列表合并提取为独立函数，事务与草稿保存的分支展开。

V15新增`ix_job_status_time(status,created_at,id)`，V1～V14不改写。MySQL EXPLAIN在测试库记录：索引前调度和排队COUNT均全表扫描；索引后使用range/ix_job_status_time，runtime关联eq_ref、COUNT覆盖索引。调度仍有filesort；两次数据分别30和143行、无活动任务，仅证明执行计划可用，未做生产负载测试，不推断吞吐倍数。

数据库通过既有Flyway启动流程应用V15；索引不改业务数据及字段，回滚应用代码可以保留该索引。演示数据库及素材卷没有启动、迁移或清理。

## 完整容器检查

```sh
docker compose --profile test run --rm backend-test mvn -B verify
docker compose --profile test run --rm --no-deps frontend-test sh -c 'npm run lint && npm run typecheck && npm test && npm run build'
```

- Java：97项测试零失败/错误，打包通过。
- 前端：lint、TypeScript、25文件126项测试、Next生产构建通过。
- 前端依赖来自本次审查已按锁文件npm ci安装的容器卷；本轮无依赖变更。
- git diff --check通过，规格/契约无新增外部接口；测试数据库为Compose独立tmpfs测试服务。
- 本轮未推送远端或触发CI，也未重新做浏览器视觉验收；本次未修改界面布局。

本轮投入包含规格和测试、逐项RED/GREEN修复、批量读取/索引验证、完整检查与文档整理；实际工具执行时段约为2026-10-30 18:19～18:29（Asia/Shanghai），不折算人工工时。验证结束关闭本轮测试容器，保留已有项目卷和其他项目。

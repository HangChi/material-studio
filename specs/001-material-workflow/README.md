# 001总体基线与归档说明

**定位**：001覆盖整个项目的需求基线；实施已拆分到002～005。001不再作为可执行feature，也不表示还有43项业务待开发。

## 阅读入口

- [总体需求](spec.md)：保留原题故事、FR与SC编号。
- [实施追踪](traceability.md)：原题、后续feature与已知缺口的对应关系。
- [当前启动与验证](quickstart.md)：使用实际容器入口和现行接口。
- [项目迭代图](../../docs/roadmap.md)、[验收对照](../../docs/acceptance.md)、[真实工作日志](../../docs/work-log.md)：查看交付与证据。

## 实施迁移

| 范围 | 当前规格与任务 | 已记录的阶段交付 |
| --- | --- | --- |
| 模板浏览、详情、工程骨架 | [002规格](../002-template-catalog/spec.md) / [任务](../002-template-catalog/tasks.md) | 17/17 |
| 身份、私有上传、任务受理 | [003规格](../003-upload-submission/spec.md) / [任务](../003-upload-submission/tasks.md) | 18/18 |
| 三阶段执行、模拟控制、事件与结果 | [004规格](../004-async-pipeline/spec.md) / [任务](../004-async-pipeline/tasks.md) | 17/17 |
| 历史分页、多任务跟踪、身份清理 | [005规格](../005-history-tracking/spec.md) / [任务](../005-history-tracking/tasks.md) | 15/15 |

任务勾选记录当时交付，不代表之后复查不会发现缺陷。已记录本地64项前端、38项后端检查与构建通过；本次文档维护不重新运行这些应用检查。

## 归档文件如何使用

[plan](plan.md)、[research](research.md)、[data-model](data-model.md)、[原契约](contracts/http-api.md)、[test-plan](test-plan.md)保存初始设计及其演变，不覆盖后续feature的决策。
[旧任务](tasks.md)保留T001的实际完成标记，T002～T044改为“已迁移归档”条目，保留编号和原描述，不批量勾选或继续执行旧路线。

现行实现与初始方案的主要差异：

| 初始设想 | 实际交付 / 现行依据 |
| --- | --- |
| 队列容量100 | 单线程、等待容量16，[004计划](../004-async-pipeline/plan.md) |
| Testcontainers、MSW | Compose隔离MySQL与受控fetch/Promise，无这两项依赖，[当前README](../../README.md) |
| simulation.failAt / delayMs，仅demo profile接受 | failStage / stageDurationsMs，当前演示应用接受任务级覆盖，[004契约](../004-async-pipeline/contracts/http-api.md) |
| 每阶段一条可变事件，job_stage_event | job_event按version追加边界事件；正常成功6条，另有INTERRUPTED，[004模型](../004-async-pipeline/data-model.md) |
| job内JSON模拟配置 | job_execution独立表、与受理记录同事务写入，[V3迁移](../../backend/src/main/resources/db/migration/V3__pipeline.sql) |
| 默认50条历史、初始结果错误码 | 默认20条游标分页与active集合；结果未就绪/失效404 RESULT_NOT_AVAILABLE，[004](../004-async-pipeline/contracts/http-api.md) / [005契约](../005-history-tracking/contracts/http-api.md) |

## 复查后的待处理与未验证项

截至本次001文档维护，下列内容仍然保留，不因归档而标为通过：

- 历史页局部刷新未更新分页游标：从原末页刷新到超过一页的新记录时，可能缺失“加载更多”；新增临时回归已在容器复现失败。待修位置：[History.tsx](../../frontend/src/features/jobs/History.tsx)。
- 成功结果图片加载失败缺少明确资源错误提示与重试；应保持任务成功状态，独立处理图片错误。待补位置：[JobCards.tsx](../../frontend/src/features/jobs/JobCards.tsx)。
- SC-002原定“10次受理均小于2秒”尚无完整测量记录；已验证不等待阻塞worker，但不能据此认定数值指标通过。
- 远端CI、真实双标签联动、TLS/公网部署未完成实测；跨标签清理已有组件测试。原题不强制公网部署。

重启续跑、幂等、自动重试、孤儿文件自动清理和账号找回属于已说明的范围边界；不在本次文档维护中扩展业务。

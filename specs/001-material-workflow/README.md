# 001总体基线与归档说明

**定位**：001覆盖整个项目的需求基线；实施已拆分到002～005，006承接复查收尾。001不再作为可执行feature，也不表示还有43项业务待开发。

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

任务勾选记录当时交付，不代表之后复查不会发现缺陷。[006规格](../006-mvp-hardening/spec.md) / [任务](../006-mvp-hardening/tasks.md)完成9/9收尾，当时通过70项前端、38项后端检查与构建。后续007/008扩展业务、009完成界面优化、010完成可靠受理与内部监控；当前本地95项前端、59项后端检查及构建通过，范围见[验收对照](../../docs/acceptance.md)。

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

## 复查收尾与未验证边界

006按SDD+TDD完成以下三项，证据见[工作日志](../../docs/work-log.md)及[测量记录](../../docs/admission-measurements.md)：

- 历史局部刷新游标已修复：成功刷新使用最新首页游标；原末页/旧游标跨页新增、失败保留及去重回归通过。实现：[History.tsx](../../frontend/src/features/jobs/History.tsx)。
- 成功结果图片已提供独立错误提示与重复重试，任务保持成功；浏览器真实404后恢复文件/重新读取通过。实现：[ResultPreview.tsx](../../frontend/src/features/jobs/ResultPreview.tsx)。
- SC-002十次受理目标已实测：API 10.460～25.796ms；另10次浏览器确认新编号可见273.088～498.503ms；默认三阶段各2000ms，全部通过本地目标。
- 010已补远端CI首次运行、真实双标签联动及高对比模式；TLS/公网部署未实测，原题不强制公网部署。

007已实现提交幂等和安全重试，008已实现从第一阶段重做的重启恢复与最多三次执行；不支持阶段断点续跑和多后端实例。孤儿文件自动清理、账号找回仍未实现。本次文档维护不扩展业务，现行范围以[项目README](../../README.md)为准。

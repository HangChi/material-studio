# 项目基线与迭代图

原题以 [requirements-source.md](requirements-source.md) 为准。
[001 原始规格](../specs/001-material-workflow/spec.md)、[总体方案](../specs/001-material-workflow/plan.md)保留为总体需求/初始架构基线；
001原任务清单仅供溯源，不继续执行；43条旧任务已改为迁移归档条目，不作为待办数量。[001归档总览](../specs/001-material-workflow/README.md)汇总现行入口、设计差异、原SC证据边界和复查待修项。功能完成状态以各feature的任务、真实验证及后续复查为准。

| Feature | 范围 | 原题/原任务 | 依赖 | 本轮状态 |
| --- | --- | --- | --- | --- |
| [002-template-catalog](../specs/002-template-catalog/spec.md) | 必需工程骨架、模板分类/列表/详情、本地封面、基础 CI/容器 | R-01/02、R-03 只读详情、R-11/12/14 当前切片；旧T002～T004/T009～T013/T039～T041相关部分 | 无 | 已完成本地验收；17/17任务 |
| [003-upload-submission](../specs/003-upload-submission/spec.md) | 匿名身份、图片落盘/预览/校验、任务受理和记录、调度接口 | R-03/04/10；旧T005～T008/T014～T021 | 002 | 已完成本地验收；18/18任务 |
| [004-async-pipeline](../specs/004-async-pipeline/spec.md) | 三阶段执行、模拟控制、状态/事件/结果持久化、重启中断说明 | R-04/05/06；旧T022～T029 | 003 | 已完成本地验收；17/17任务 |
| [005-history-tracking](../specs/005-history-tracking/spec.md) | 本人历史、刷新、多任务、查询异常、订阅清理、最终交付验收 | R-07/08/09/10 与完整R-11～R-14；旧T030～T044剩余部分 | 003/004 | 已完成本地验收；15/15任务 |
| [006-mvp-hardening](../specs/006-mvp-hardening/spec.md) | 刷新游标、图片错误与重试、十次受理测量 | R-04/07/09/11；001 SC-002/005复查收尾 | 005 | 已完成本地验收；9/9任务 |
| [007-creation-workbench](../specs/007-creation-workbench/spec.md) | 提交幂等、安全重试、下载/再次制作、执行详情、参数化真实明信片 | 用户明确新增的全部两段建议 | 006 | 已完成本地验收；16/16任务 |

| [008-creative-workflow](../specs/008-creative-workflow/spec.md) | 编辑、全模板合成、素材库、草稿、历史管理、取消/排队、恢复/有限重试 | 用户授权七项拓展 | 007 | 已完成本地验收；15/15任务 |

007为原题MVP之后的用户授权拓展；不修改原题。007时真实合成先覆盖明信片；008扩展至全部三模板。仍为单实例匿名身份。新增V4配方与幂等表，旧记录兼容，具体验证见[验收对照](acceptance.md)。

006在005交付后修复复查发现的问题，并完成001 SC-002数值验收，见[逐次测量](admission-measurements.md)。

每个 feature 独立执行 specify → plan → tasks → implement。只为当前 feature 展开技术计划/任务，后续 feature 在实施前重新检查依赖与契约。
不为未来功能预建用户/素材/任务表；基础配置、CI 和容器随当前切片增量完善。
002 不显示未实现上传/提交控件；003 依赖调度接口验证受理，不将占位执行器宣传为完整制作；004 已交付真实流水线。
005 已完成原题业务闭环，本地验证与未执行的远端CI/TLS分开记录，见[验收对照](acceptance.md)。

## 可重复选择当前 feature

Spec Kit 0.16.4 的 `.specify/feature.json` 为忽略的机器本地指针，不能依靠分支名自动恢复。
克隆/切换 feature 后显式运行（将路径替换为目标 feature）：

```sh
SPECIFY_FEATURE_DIRECTORY=specs/008-creative-workflow .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```

脚本将持久化本机 feature 指针。禁止把新功能继续加到 001 的执行清单。

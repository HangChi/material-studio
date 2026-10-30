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
| [009-studio-identity](../specs/009-studio-identity/spec.md) | 全模块UI、品牌Logo、当前导航及响应式排版 | 用户视觉优化要求 | 008 | 已完成容器检查及浏览器验收；20/20任务 |
| [010-reliable-operations](../specs/010-reliable-operations/spec.md) | 交付验证、访客确认、动态模板、持久排队/配额与内部监控 | 用户授权执行顺序1～5 | 009 | 本地及远端CI验收通过；16/16任务，见[010验收](010-validation.md) |
| [011-creative-library](../specs/011-creative-library/spec.md) | 文件生命周期、批次、作品组织、本地账号/恢复与迁移 | 用户授权执行顺序6～9 | 010 | 本地及远端CI通过；13/13任务，见[011验收](011-validation.md) |
| [012-stage-checkpoints](../specs/012-stage-checkpoints/spec.md) | 第10项第一增量：阶段断点、失效回退与清理 | 用户授权第10项 | 011 | 本地及远端CI通过，7/7任务，见[012验收](012-validation.md) |
| [013-worker-leases](../specs/013-worker-leases/spec.md) | 第10项第二增量：租约、执行代次与接管 | 用户授权第10项 | 012 | 本地及远端CI通过，7/7任务，见[013验收](013-validation.md) |
| [014-status-stream](../specs/014-status-stream/spec.md) | 第10项第三增量：SSE快照、身份重验和轮询回退 | 用户授权第10项 | 013 | 本地及远端CI通过，7/7任务，见[014验收](014-validation.md) |

007为原题MVP之后的用户授权拓展，不修改原题。008扩展真实合成至三模板，011增加可选账号。012提供断点，013支持共享数据库/文件卷的多后台租约接管，014优先SSE并保留轮询回退；默认一个后台。

006在005交付后修复复查发现的问题，并完成001 SC-002数值验收，见[逐次测量](admission-measurements.md)。

每个 feature 独立执行 specify → plan → tasks → implement。只为当前 feature 展开技术计划/任务，后续 feature 在实施前重新检查依赖与契约。
不为未来功能预建用户/素材/任务表；基础配置、CI 和容器随当前切片增量完善。
002 不显示未实现上传/提交控件；003 依赖调度接口验证受理，不将占位执行器宣传为完整制作；004 已交付真实流水线。
005 已完成原题业务闭环，本地验证与未执行的远端CI/TLS分开记录，见[验收对照](acceptance.md)。

## 可重复选择当前 feature

Spec Kit 0.16.4 的 `.specify/feature.json` 为忽略的机器本地指针，不能依靠分支名自动恢复。
克隆/切换 feature 后显式运行（将路径替换为目标 feature）：

```sh
SPECIFY_FEATURE_DIRECTORY=specs/017-history-interface .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```

脚本将持久化本机 feature 指针。禁止把新功能继续加到 001 的执行清单。

当前交付包含002～017；现行契约以016兼容说明及014和前序契约为准。当前前端130项及构建通过，Java沿用016的97项全量基线；方法和边界见[017验收](017-validation.md)。执行顺序1～5由010实现，6～9由011实现，第10项由012～014分别实现，见[异步流程](async-workflow.md)。

## 015 账号界面

[015规格](../specs/015-account-interface/spec.md)继续优化账号视觉、表单模式、密码显示与安全概览，不改后端接口。该阶段前端24文件122项及生产构建通过，桌面/375px实测无横向溢出；CI与进程关停见[015验收](015-validation.md)。014及前文数字保留阶段含义。

## 016 代码审查优化

[016规格](../specs/016-review-hardening/spec.md)按审查顺序修复批量取消并发、列表覆盖和空草稿；批次批量读取、元数据JOIN、状态索引与相关代码整理均已完成。永久回归先RED再GREEN，6/6任务，本地126项前端/97项Java及构建通过；当前入口为016，未推送远端。证据及性能结论边界见[016验收](016-validation.md)。

## 017 制作记录界面

[017规格](../specs/017-history-interface/spec.md)重排用户截图中的筛选与批量管理区域，5/5任务，130项前端检查和真实1280/375px界面通过。当前入口为017，保留用户已启动的项目运行。见[017验收](017-validation.md)。

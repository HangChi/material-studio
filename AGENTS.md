# 项目开发约定

本文件适用于本仓库全部文件。用户明确要求：整个过程禁止使用子智能体，所有工作串行完成。

- 需求来源为 `docs/requirements-source.md`，保留其原始内容。
- 使用 Spec Kit skills：constitution → specify → plan → tasks → implement。
- 开发前读取 `.specify/memory/constitution.md`、当前 feature 的 spec、plan、contracts、tasks。
- 任何业务变更先更新规格/契约，再写能验证行为的测试；观察预期失败，最小实现，通过后重构。
- 测试失败必须由目标行为缺失引起；依赖未安装、环境错误不能算 RED。
- 每个可审阅的逻辑增量及时提交；正常提交须通过该增量的适当检查。不要将 RED 状态留在交付分支。
- TDD 证据写入 `docs/work-log.md`：测试命令、RED 原因、GREEN 结果及取舍；未执行不得写为通过。
- 应用安装、测试、构建及运行使用容器；当前已进入逐 feature 实现阶段。
- 只在本仓库内创建项目文件，不修改上级需求 README。禁止提交凭据、依赖和构建缓存。
- 保持实现简单；不引入真实 AI、消息队列、Redis、支付或复杂身份系统。
- 更新 README 的完成情况、实际投入、限制和验证结果。禁止把设计、计划或脚手架当成业务已完成。

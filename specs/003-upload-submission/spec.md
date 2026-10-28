# Feature Specification: 素材上传与任务受理

**Feature Branch**: `003-upload-submission`

**Created**: 2026-10-29

**Status**: Ready for planning（未实现）

**Input**: 按项目迭代图从001总体基线拆分，独立完成SDD与TDD周期；不使用子智能体。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 准备可用素材 (Priority: P1)

用户选择、预览、替换、移除图片并得到上传失败反馈。

**Why this priority**: 本feature的主要用户价值。

**Independent Test**: 数量、类型、大小和真实图片内容双端校验；旧上传不填回替换槽位。

**Acceptance Scenarios**:

1. **Given** 有效数据与前置条件，**When** 完成本故事的操作，**Then** 数量、类型、大小和真实图片内容双端校验；旧上传不填回替换槽位。
2. **Given** 无效输入或临时请求异常，**When** 尝试操作，**Then** 显示明确反馈且不污染其他对象的状态。

### User Story 2 - 以当前身份受理任务 (Priority: P2)

用户提交合法素材后取得任务编号，并可以继续准备另一任务。

**Why this priority**: 补齐该切片可独立使用的可靠性。

**Independent Test**: 前端防重复；服务端校验归属/存在/数量；事务完成后投递；受理不等待执行。

**Acceptance Scenarios**:

1. **Given** 有效数据与前置条件，**When** 完成本故事的操作，**Then** 前端防重复；服务端校验归属/存在/数量；事务完成后投递；受理不等待执行。
2. **Given** 无效输入或临时请求异常，**When** 尝试操作，**Then** 显示明确反馈且不污染其他对象的状态。

### Edge Cases

- 不存在资源、空数据、请求失败、重复操作和迟到响应均须可验证。
- 后续feature未实现的能力不展示为可用入口；不以占位数据声称完整闭环。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须创建可在刷新后使用的匿名身份，个人素材/任务不得被其他身份读取或使用。
- **FR-002**: 系统必须文件完整保存到服务端后才返回可提交ID，支持JPEG/PNG、每文件1～5242880字节。
- **FR-003**: 系统必须按模板精确数量提交，拒绝重复ID、非法类型/大小、无效文件和他人素材；失败不插入任务。
- **FR-004**: 系统必须保存等待处理任务及有序素材关联，提交事务结束后调用后台调度接口；不等待制作完成。
- **FR-005**: 系统必须入队拒绝必须有明确终态，提交中避免重复点击；响应丢失提示查询记录而不自动重提。

### Key Entities

- **身份**：个人资源归属。
- **素材/任务**：由前置feature提供或本期引入，字段约束沿用总体模型并在本feature计划细化。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 合法素材上传后可由服务端重新读取，边界错误及越权均被拒绝。
- **SC-002**: 阻塞测试调度器时已受理请求仍返回编号，证明不等待执行。
- **SC-003**: 连续两次独立提交生成不同任务；请求中多次点击只发一次。

## Assumptions

- 依赖002。此feature验证受理与调度契约，完整执行由004提供；不把测试替身当正式生成器。
- TDD必须记录真实RED/GREEN；计划中的测试不代表已运行。

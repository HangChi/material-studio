# Implementation Plan: MVP验收收尾

**Branch**: 006-mvp-hardening | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

## Summary / Technical Context

沿用005锁定版本与容器入口，无新依赖/表/接口。History成功读取首页时始终更新nextCursor，原已加载任务保留，通过JobTracker按ID/版本合并。ResultPreview使用组件内资源状态与重试计数，错误不进入JobTracker；重试改变图片请求query和React key，仍使用同源私有路径。

## Constitution Check

| 原则 | 设计前后 |
| --- | --- |
| 规格与追踪 | 三项需求映射到测试、契约和任务，PASS |
| TDD | 新增刷新/资源错误测试先RED，修复后GREEN；测量真实执行，PASS |
| Java职责 | 业务仍由Java提供，前端只管理分页与资源请求，PASS |
| 身份隔离 | 私有图片与任务状态分开，继承卸载/身份边界，PASS |
| 可复现 | Docker测试/运行、锁定依赖、单智能体、及时提交，PASS |

## Structure

- frontend/src/features/jobs/History.tsx、history.test.tsx：分页链重置和失败保留。
- frontend/src/features/jobs/ResultPreview.tsx、JobCards.tsx、result-preview.test.tsx：图片错误/重试/任务隔离。
- scripts/measure-admission.mjs：在前端容器计时经过Next代理的真实POST，逐次等待终态，默认各阶段2000ms。
- docs/admission-measurements.md：API与浏览器10次可见编号的测量数据与条件。
- specs/006-mvp-hardening/：规格、研究、契约、模型、任务、验证。

## Validation / Complexity

先定向测试，再完整前端lint/typecheck/test/build；Java未改但最终回归verify。Compose重建后运行真实接口与浏览器验收。API测量不冒充DOM显示时间；浏览器使用操作前后时钟与最新可访问性快照判断新任务编号，工具开销计入观测上界。无约章例外。

# Implementation Plan
**Date**: 2026-10-29 | **Spec**: spec.md
## Summary / Technical Context
沿用固定Java21/SpringBoot/MyBatis/MySQL、Next/React/TS、Java2D、本地卷；不增加服务或JS依赖。先US1～5后US6～7；每个故事独立RED/GREEN/提交。JUnit真实HTTP/MySQL，Vitest交互/生命周期，Docker执行安装测试构建运行。
## Constitution Check
设计前后：规格契约先行、TDD、Java拥有业务、本人隔离、容器验证、无子智能体全部通过。用户明确授权重启恢复与自动重试，更新旧MVP边界说明；终态不回退，自动重试仅非终态内部重新排队。
## Project Structure
backend: AssetMapper/Controller分页；JobSubmissionService扩展sourceJobId；TemplateRenderer；LibraryMapper/Service与JobController查询/管理；ExecutionMapper与PipelineState/Worker/Dispatcher恢复调度。
frontend: SubmissionForm来源恢复、UploadSlots初始素材、AssetPicker、draft-storage；History筛选和WorkControls；JobActions取消/编辑；JobCards排队/尝试次数。沿用现有页面和样式。
## Complexity Tracking
仍为单实例有界线程池，数据库保留排队任务；每250ms扫描到期未调度任务，进程内Set避免重复入队；退出不把待执行改成失败。恢复与重试从头执行、图像结果原子替换同一任务路径。

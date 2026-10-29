# Implementation Plan: 多步骤异步制作流水线

**Branch**: `004-async-pipeline` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

## Summary

承接003已提交任务，Java单后台线程执行素材检查→模拟生成→结果整理；阶段边界、版本、失败原因和结果持久化。单进程有界队列16；拒绝即持久失败。启动将遗留未终结任务标中断，不续跑。前端手动核对显示阶段和成功图片，自动跟踪留005。

## Technical Context

- Java21、Spring Boot3.5.16、MyBatis3.0.5；Next/React/TypeScript依赖保持003锁定版本。
- MySQL8.4、Flyway V3；本地asset-data卷增加results目录，结果为模板对应自制PNG的独立副本。
- ThreadPoolExecutor(1线程、ArrayBlockingQueue容量16、AbortPolicy)，绝不CallerRuns；任务提交先事务提交再dispatch。
- JUnit5真实HTTP/MySQL；Vitest组件与代理；全部容器执行，无新依赖。
- 单机演示、每阶段默认2000ms且范围0～10000；无AI、MQ、重试、续跑或集群。
- 受理不等待worker，使用阻塞测试验证；数据库短事务且延迟/文件IO不持有行锁。

## Constitution Check

| 原则 | 设计前/后 |
| --- | --- |
| 需求追踪 | FR001～006对应契约、状态表、任务和测试，PASS |
| TDD | 顺序/失败/隔离/队列/中断/私有结果真实RED→GREEN，PASS |
| Java职责 | 执行、SQL和结果均由Java负责；查询只读，PASS |
| 隔离 | 按owner读任务/事件/结果，配置按job保存；版本递增，PASS |
| 可复现 | 保持容器、锁文件和自制素材；单智能体，PASS |

## Project Structure

```text
backend/src/main/java/com/materialstudio/job/  PipelineState、PipelineWorker、BackgroundJobDispatcher、Simulation、EventMapper、ResultStore
backend/src/main/resources/db/migration/V3__pipeline.sql
backend/src/test/java/com/materialstudio/job/  PipelineApiTest、PipelineLifecycleTest、JobSubmissionTest
frontend/src/lib/                            代理及契约测试
frontend/src/features/jobs/                  手动快照阶段与结果组件测试
scripts/verify-004.mjs                       容器运行验收
specs/004-async-pipeline/                    spec、plan、research、data-model、contracts、quickstart、tasks
```

## Complexity Tracking

无约章例外。状态更新与事件写入同一事务，行锁/CAS阻止重复执行和终态回退；文件先原子落盘再提交成功，提交失败删除该结果，进程强杀可留孤儿文件，不提供自动清理。

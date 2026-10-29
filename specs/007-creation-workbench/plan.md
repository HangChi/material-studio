# Implementation Plan: 制作工作台拓展

**Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

## Summary
在现有三阶段流水线中加入明信片渲染，使用数据库事务与唯一键保障幂等。新增独立配方/操作表，保持Job快照与旧契约兼容。新增任务操作及事件UI，沿用当前设计。

## Technical Context
沿用Java21/Spring Boot/MyBatis/MySQL8.4、Next/React/TypeScript固定版本。图片使用Java2D/ImageIO；本地卷原子发布PNG。现有JUnit真实HTTP/MySQL、Vitest组件测试；Docker Compose执行安装/测试/构建/运行。无新增应用服务或JS依赖；容器安装中文字体。
性能：提交只做参数/素材校验与短事务，不等待渲染。规模保持单工作线程+有界队列。

## Constitution Check
设计前/后均通过：规格契约先行；业务测试RED/GREEN；Java持有持久化与执行；本人权限及异步隔离；容器可复现；串行工作，无子智能体。无例外。

## Project Structure
backend/src/main/java/com/materialstudio/job/：SubmissionService、CreationMapper、PostcardParameters、PostcardRenderer、Controller、Worker、ResultStore。
backend/src/main/resources/db/migration/V4__creation.sql：新增表。
backend/src/test/java/com/materialstudio/job/CreationApiTest.java（含输出像素与中文字体测试）。
frontend/src/features/jobs/：SubmissionForm、PostcardEditor、JobActions、JobEvents、DownloadResult及对应测试。
frontend/src/lib/api-proxy.ts：透传操作标识/下载头，严格放行新接口。

## Delivery
US1 → US2 → US3 → US4 → 完整回归与真实浏览器验证。每个增量记录TDD并提交。迁移为新增表，旧任务默认参数；前端未确认请求保存完整不可变载荷，刷新时按本人/模板恢复。

## Complexity Tracking
无约章例外。本人行锁只序列化同身份短受理事务，不跨文件渲染或后台执行。

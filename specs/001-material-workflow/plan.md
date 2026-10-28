# Implementation Plan: 素材制作与异步任务闭环

**Branch**: `001-material-workflow` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: `specs/001-material-workflow/spec.md`

## Summary

Java 提供全部业务和持久化，Next.js 提供三类页面及同源代理。任务事务提交后由有界单线程队列顺序处理，
每阶段独立提交状态和事件；前端按身份/任务轮询。采用容器中的 TDD 逐故事交付。
本轮止于设计与任务拆分，不执行业务 implement。

## Technical Context

**Language/Version**: Java 21；TypeScript 5；Node.js 22。

**Primary Dependencies**: Next.js 16 App Router、React 19、Spring Boot 3.5、MyBatis Starter 3.0、Maven 3.9。

**Storage**: MySQL 8.4 + Flyway；本地文件命名卷，容器重建保留。patch 版本在脚手架任务核验并固定。

**Testing**: JUnit 5/Mockito、Testcontainers MySQL；Vitest/Testing Library/MSW，假定时器及可控 Promise。

**Target Platform**: Docker Linux；浏览器桌面及 375px 小屏。

**Project Type**: 前后端分离 Web 应用 monorepo。

**Performance Goals**: 本地 10 次受理均 <2s（制作总延迟 >=6s）；单工作线程，队列容量 100，超量显式失败。

**Constraints**: 不使用真实 AI；不使用前端计时器推进任务；不使用 Redis/MQ；全部应用验证在容器中进行。

**Scale/Scope**: 2 类 3 模板，1/2/3 张图片；匿名演示用户；列表、制作、历史页面。

## Constitution Check

| 原则 | 研究前 | 设计后 | 依据 |
| --- | --- | --- | --- |
| 规格与追踪 | PASS | PASS | spec、traceability、contracts、tasks |
| 测试先行 | PASS | PASS | test-plan，任务顺序 RED → GREEN → REFACTOR；未声称测试已运行 |
| Java 业务与异步 | PASS | PASS | 后台提交后调度、MySQL 状态和阶段事件 |
| 身份与状态隔离 | PASS | PASS | 匿名 cookie、归属校验、轮询 epoch/version |
| 简单可复现交付 | PASS | PASS | 单线程有界队列、Compose 与 CI 任务 |

用户禁止子智能体，研究由当前执行者逐项完成。以上 PASS 指设计满足约章，非实现检查通过。

## Project Structure

### Documentation (this feature)

```text
specs/001-material-workflow/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/http-api.md
├── quickstart.md
├── test-plan.md
├── traceability.md
└── tasks.md
```

### Source Code (repository root)

以下源码路径为计划，尚未创建：

```text
backend/pom.xml
backend/src/main/java/com/materialstudio/
  identity/ template/ asset/ job/ config/ common/
backend/src/main/resources/db/migration/
backend/src/main/resources/demo/
backend/src/test/java/com/materialstudio/
frontend/package.json
frontend/package-lock.json
frontend/src/app/                 # /、/templates/[id]、/history、/api/[...path]
frontend/src/features/templates/
frontend/src/features/assets/
frontend/src/features/jobs/
frontend/src/lib/
frontend/src/test/
compose.yaml
backend/Dockerfile
frontend/Dockerfile
.github/workflows/ci.yml
.env.example
```

**Structure Decision**: 单仓库按前后端划分；Java 按业务模块划分，无通用多层框架或多微服务。

## 执行与事务设计

1. 提交事务内验证模板、素材归属/数量/文件属性，插入 QUEUED 任务和有序素材快照，提交后调度。
2. 使用显式 application service 事务完成后调用 dispatcher，避免同类自调用绕过事务代理。单线程执行器，容量 100。
3. 若调度拒绝，在新事务中将任务标记 FAILED，`errorCode=QUEUE_REJECTED`，`stage=null`，返回 202 和该终态任务。
   不在事务中等待生成；进程在提交与调度间崩溃的窗口不自动恢复，启动中断对账处理。
4. worker 先将 QUEUED 改为 RUNNING，进入每阶段时写 stage STARTED；延迟/文件检查在事务外。
   阶段结束或失败在短事务中同时更新 job 和 event；每次变更 version 自增。
5. 结果整理复制自制示例 PNG 到结果卷，确认文件存在后写 SUCCEEDED、resultPath；文件写入错误记失败。
   未引用的文件可为孤儿，不实现清理服务。原文件路径不得直接返回给浏览器。
6. 顶层捕获执行异常并保存当前失败阶段、可理解原因，禁止 finally 再推进后续阶段。
7. 启动时将 QUEUED/RUNNING 统一标记 FAILED/EXECUTION_INTERRUPTED，并将未结束事件标为失败。
   保留当前阶段，若从未开始则 stage=null；不续跑，不作为重启恢复能力宣传。

## 前端与身份设计

Java 创建随机匿名 token，cookie HttpOnly/SameSite=Lax，HTTPS 下 Secure；数据库仅保存 token hash。
Next.js route handler 将 `/api/*` 同源代理到 Java，显式透传 cookie、Set-Cookie、状态码及文件内容；个人响应禁止缓存。
身份初始化完成前不加载个人数据；切换身份清除 cookie并创建新身份，旧用户记录仍保存但无找回入口。
所有个人读写在服务端由 cookie 解析 owner，不接受 ownerId 参数。

轮询以当前身份 epoch 和 jobId 建键；每任务最多一个在途查询，2s 间隔，以 setTimeout 在完成后续排。
更新时校验 epoch/requestId/version，拒绝旧响应及终态回退。终态清理该任务定时器，页面卸载/身份切换 abort 全部请求。
查询失败只设置 queryError 并暂停该任务自动跟踪，用户点击恢复后重试；首次历史失败允许重试。
刷新读取个人历史（最新 50 条，游标分页）并恢复已加载未终结任务；分页加载更多任务时同样跟踪。
历史第一页每 2s 仅在存在已知非终态任务时刷新，或使用各任务查询；本期选择各任务查询，避免无任务时重复请求。
上传 slot 使用独立 requestId/AbortController，替换/移除后旧响应不得重新填回；释放 object URL。

## Complexity Tracking

无约章例外。Flyway 用于可重复初始化，Testcontainers 用于验证真实 MySQL 事务/MyBatis；无需消息中间件。

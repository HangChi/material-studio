# 素材工坊 · Material Studio

根据[原始题目](docs/requirements-source.md)开发独立运行的素材制作网站。
当前为**前置设计阶段**：没有业务源码、应用依赖、数据库脚本、CI 或容器交付配置，尚不能启动网站。

## 开发入口

项目目录为 `xiaoying/material-studio/`，拥有独立 Git 仓库。
Spec Kit CLI 0.16.4 通过 `specify init material-studio --integration codex --integration-options='--skills' --script sh` 初始化，
模板、脚本及 Codex skills 已保存在仓库。后续从本目录继续，禁止使用子智能体。

1. 阅读[开发约章](.specify/memory/constitution.md)及 [AGENTS.md](AGENTS.md)。
2. 阅读[需求规格](specs/001-material-workflow/spec.md)与[技术计划](specs/001-material-workflow/plan.md)。
3. 按[任务清单](specs/001-material-workflow/tasks.md)使用 `$speckit-implement`，逐个执行 RED → GREEN → REFACTOR。

## 计划技术栈

| 层 | 选型（尚未安装） |
| --- | --- |
| 前端 | Next.js 16 App Router、React 19、TypeScript 5、Node.js 22、npm 锁文件 |
| 后端 | Java 21、Spring Boot 3.5、MyBatis Spring Boot Starter 3.0、Maven 3.9 |
| 持久化 | MySQL 8.4、Flyway、后端本地文件数据卷 |
| 测试 | JUnit 5、Mockito、Testcontainers MySQL；Vitest、Testing Library、MSW |
| 交付 | Docker Compose、GitHub Actions |

这些为兼容版本系列，实际 patch 版本须在 T002/T003 中核验并锁定；本轮不虚构锁文件。
兼容性依据及官方来源见 [research.md](specs/001-material-workflow/research.md)。

## 设计与交付导航

- [数据模型与状态机](specs/001-material-workflow/data-model.md)
- [接口契约](specs/001-material-workflow/contracts/http-api.md)
- [TDD 验证计划](specs/001-material-workflow/test-plan.md)
- [需求追踪](specs/001-material-workflow/traceability.md)
- [未来启动与验收指南](specs/001-material-workflow/quickstart.md)（其中命令待实现后验证）
- [实际投入和验证日志](docs/work-log.md)

身份方案：Java 创建匿名用户并设置 HttpOnly cookie；MySQL 保存个人记录，Next.js 同源代理透传 cookie。
同一浏览器刷新保留身份；更换浏览器为新用户。演示切换用户时清理旧查询，再创建新的匿名身份；不提供账号找回。

后台方案：提交事务保存任务和素材关联，提交事务成功后投递至有界单工作线程队列。
按素材检查、模拟生成、结果整理三阶段处理，各阶段独立持久化；查询只读。
开发环境允许按任务指定失败阶段和阶段耗时，正式配置关闭该覆盖能力。
前端区分上传、提交、任务状态与查询错误，按身份和任务 ID 管理轮询。
接口字段及错误行为以契约为准。

## 完成状态与取舍

已完成：独立目录与 Git 初始化、Spec Kit 基础设施、约章、规格及质量检查、设计、任务拆分。
未完成：前后端代码、真实测试、锁文件、SQL/种子与示例图片、CI、Compose、运行验收和交付包。

本轮可核对的初始化至检查投入为 8分47秒，前期阅读未独立计时，详见工作日志。
本轮仅验证前置材料及 Spec Kit 路径解析，不能据此认定 R-01～R-14 已实现。
后续运行记录必须明确区分“源码可证明”与“已运行验证”。
不实现重启自动恢复、自动重试、受理幂等或分布式执行。
计划在启动时将遗留未终结任务标记为失败并保存“服务重启导致执行中断”，不自动续跑。
上传孤儿文件清理暂不实现，演示环境通过重置数据卷清理。
部署与回滚、成功/失败/多任务演示的预定步骤见 quickstart；完成应用后更新为实际验证过的说明。

## AI 工作流与来源

使用 Codex 辅助开发：读取原始需求 → 编写可验收规格 → 明确事务、状态与接口边界 → 拆分先测试后实现的任务 →
记录真实失败/通过证据 → 修正规格或实现 → 分阶段提交。全部由单一智能体执行。
例如：R-07 被拆为“任务执行失败”和“状态查询错误”两个独立字段与前端测试场景，后续先模拟查询 503，
断言已有任务仍为处理中，再实现恢复查询；当前该测试尚未编写。

Spec Kit 模板、脚本和 skills 来自 [github/spec-kit](https://github.com/github/spec-kit)，由本地 CLI 0.16.4 生成。
原题由用户提供；本轮未引入第三方业务代码或图片素材。后续素材使用项目自制本地文件，并记录来源。

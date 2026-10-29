> 初始研究记录归档；后续技术取舍与锁定版本见[当前README](../../README.md)及各feature研究。主要差异见[归档说明](README.md)。

# 研究与决策（初始记录）

日期：2026-10-29。001阶段由当前执行者逐项研究，未使用子智能体；当时选择版本系列，后续已锁定patch与镜像digest。以下决策保留其历史语境。

## 版本兼容

- Decision: Java 21 + Spring Boot 3.5 + MyBatis Starter 3.0 + MySQL 8.4。
- Rationale: 原题要求的栈；Java 21 满足 Boot 与 Starter 兼容要求，避免 Boot 4 / Starter 3 混用。
- Alternatives considered: Boot 4 + Starter 4 可行，但本期选较熟悉的 3.5 系列，实施时核对可用补丁。
- 官方依据：[Spring Boot 3.5 系统要求](https://docs.spring.io/spring-boot/3.5/system-requirements.html)、
  [MyBatis 兼容矩阵](https://mybatis.org/spring-boot-starter/mybatis-spring-boot-autoconfigure/)。

- Decision: Next.js 16 App Router + React 19 + TS 5 + Node.js 22，npm package-lock 固定解析结果。
- Rationale: Node 22 高于 Next.js 的 20.9 下限；lint 必须独立命令，不能依靠 next build。
- Alternatives considered: Pages Router 不符合题目；不使用 next lint 作为 CI 入口。
- 官方依据：[App Router 安装](https://nextjs.org/docs/app/getting-started/installation)、
  [Next.js 16 升级说明](https://nextjs.org/docs/app/guides/upgrading/version-16)。

## 异步执行

- Decision: 事务提交后投递至有界单工作线程队列；阶段状态在独立短事务更新，延迟在事务外。
- Rationale: 允许排队且无需 MQ；持久状态和执行解耦，不依赖页面或查询。
- Alternatives considered: 请求内同步阻塞违反受理要求；只用内存状态不能刷新恢复；MQ 超出当前范围。
- 风险：提交到入队之间存在进程崩溃窗口。启动将未终结任务标为失败，不承诺重启续跑。

## 前端与身份

- Decision: 自建小型按任务轮询 hook，用假时钟测试生命周期；Java 匿名 cookie + Next 同源代理。
- Rationale: 不引入全局状态库即可清楚表达 queryError 与 job.status 分离；cookie 归属由服务端判定。
- Alternatives considered: SSE/WebSocket 增加连接管理；localStorage ownerId 容易被误当授权；账号系统超范围。
- 约束：身份 token 使用安全随机值，存 hash；切换身份不提供恢复入口，演示需明确说明。

## 模拟与图片

- Decision: 自制 3 个封面及结果 PNG/JPEG，仓库保存；开发 profile 开启按任务覆盖阶段延迟和失败阶段。
- Rationale: 不依赖付费、外部网络或随机失败；任务保存模拟参数快照，并发任务互不影响。
- Alternatives considered: 全局失败开关会串扰；仅前端临时图片无法支持后台执行。

## 工具与执行边界

- Decision: 使用本机现有 Spec Kit CLI 0.16.4 离线初始化，保留其模板、脚本、skills 和来源说明。
- Rationale: 可复现 SDD 工作流，无需编造兼容脚本。当前 `.specify/extensions.yml` 不存在，无前后钩子。
- Alternatives considered: 手写伪 spec-kit 目录不如实际 CLI 初始化可靠。
- 001前置阶段当时尚未验证daemon访问；后续已完成Docker实际构建、测试与启动，证据见[工作日志](../../docs/work-log.md)。不能把当时限制当作当前阻塞。

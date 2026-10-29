# Implementation Plan: 制作可靠性与交付验证

## Summary
串行交付1～5。沿用Next/React/TypeScript、Java21/Spring Boot/MyBatis/MySQL；不新增运行依赖。先独立空卷验证及公开仓库CI，再访客确认、动态模板、持久排队/受理配额、内部监控。

## Technical Context
- 匿名单实例；MySQL持久事实，后台单线程与250ms扫描。
- 原生confirm提供切换前确认，取消不变更状态；既有SessionGate负责清理。
- History模板选项读取/api/templates，独立请求/错误/重试和AbortController。
- V7新增唯一全局受理锁行；现有owner锁→全局锁→当前读统计→校验配额→保存。READ_COMMITTED确保等待锁后的统计见到已提交任务；幂等回放先于配额检查。
- 可配置全局100/访客20未完成、每访客每60秒10新任务；429含错误码和Retry-After=60。已有记录无需回填；取消释放未完成额度，不抹去最近提交次数。
- 任何即时调度异常均保留QUEUED并记录日志，由持久扫描恢复；扫描ready查询限制批次64，失败计数但不退出定时循环。
- 自定义内部MVC监控入口/actuator/studio提供统计，返回no-store；沿用Actuator路径分组，但不开放通用metrics端点。只在Java容器网络暴露，不加入Next代理白名单。统计通过MyBatis读取现有任务/事件/runtime；扫描计数为本进程生命周期。

## Constitution Check
需求可追溯；先行为RED再GREEN；业务由Java持久化；查询不推进状态；按用户隔离；容器检查。单智能体串行，无新依赖/服务。设计前后全部通过，无复杂度例外。

## Project Structure
frontend/src/features/identity/{SessionGate.tsx,session.test.tsx}
frontend/src/features/jobs/{History.tsx,template-filter.test.tsx}
backend/src/main/java/com/materialstudio/job/{AdmissionPolicy,JobSubmissionService,BackgroundJobDispatcher,OperationsMapper,OperationsEndpoint,QueueScanMonitor}.java
backend/src/main/resources/db/migration/V7__admission_lock.sql
backend/src/test/java/com/materialstudio/job/{AdmissionPolicyTest,OperationsTest}.java
scripts/verify-010.mjs；docs/010-validation.md；既有README/compose/CI。

## Verification
前端既有依赖镜像挂载当前src；Java Compose独立test-mysql；真实链路在独立cold项目。公开前扫描全部历史对象的敏感文件/密钥特征；新公开仓库material-studio，推送当前分支并观察GitHub Actions。

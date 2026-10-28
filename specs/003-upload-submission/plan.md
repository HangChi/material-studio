# Implementation Plan: 素材上传与任务受理

**Branch**: `003-upload-submission` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

## Summary

沿用002栈。Java匿名cookie身份、私有本地文件卷与MySQL素材/任务记录；Next同源代理扩展POST/DELETE和流转发。
详情页增加真实上传槽位/提交表单/最近受理记录核对入口。004才实现制作，默认dispatcher本期明确拒绝并记录终态。

## Technical Context

**Language/Version**: Java21、TypeScript5.9.3、Node22。
**Primary Dependencies**: 现有Boot3.5.16、MyBatis3.0.5、Next16.4.3、React19.3.1，不新增应用依赖。
**Storage**: MySQL8.4 + V2迁移；/data素材命名卷，测试使用容器临时目录。
**Testing**: JUnit真实HTTP/真实MySQL；Vitest/Testing Library可控Promise，所有应用检查在容器。
**Target Platform**: Docker Linux/桌面与375px。
**Project Type**: 前后端Web。
**Performance Goals**: 受理不等待worker；测试用latch而非脆弱wall-clock阈值证明。
**Constraints**: 图片<=5MiB且<=2000万像素；不实现004、自动跟踪、重试或幂等。
**Scale/Scope**: 当前模板1/2/3槽；匿名身份/上传/受理/手动最近50条核对。

## Constitution Check

| 原则 | 前/后 | 设计依据 |
| --- | --- | --- |
| 规格可追踪 | PASS/PASS | FR-001～007、契约、逐故事任务 |
| TDD | PASS/PASS | 身份→上传→受理→代理/UI逐个RED/GREEN；记录命令结果 |
| Java业务/持久化 | PASS/PASS | MyBatis/MySQL、事务完成后调用dispatcher |
| 身份/异步隔离 | PASS/PASS | cookie hash归属；上传slot token+abort；提交ref防重复 |
| 简单交付 | PASS/PASS | 复用Compose/CI，文件卷，默认拒绝未接通worker |

## Project Structure

### Documentation (this feature)

spec、plan、research、data-model、contracts/http-api、quickstart、tasks、checklists/requirements。

### Source Code (repository root)

```text
backend/src/main/java/com/materialstudio/{common,identity,asset,job}/
backend/src/main/resources/db/migration/V2__submission.sql
backend/src/test/java/com/materialstudio/{identity,asset,job}/
frontend/src/features/assets/UploadSlots.tsx
frontend/src/features/jobs/SubmissionForm.tsx
frontend/src/lib/api-proxy.ts
compose.yaml
```

**Structure Decision**: 按业务模块直接使用MyBatis，无额外通用仓储框架。

## 事务与边界

Session token用SecureRandom32字节/base64url，DB仅SHA-256 hash，cookie HttpOnly/SameSite=Lax/Path=/，可配置Secure。
删除session令token失效但保留资源归属；新session不接受客户端ownerId。
上传先校验真实PNG/JPEG/字节大小/像素，再随机文件名写完整文件；DB登记失败删除新文件，进程崩溃孤儿清理不在本期。
受理在TransactionTemplate中验证模板、素材归属/数量/去重/存在/大小，保存job与有序job_asset；事务结束后dispatch。
调度失败新短事务将QUEUED标为FAILED并保存原因；返回202及最新持久记录，不能留下永久等待。
测试替身在独立线程阻塞并从另一连接读取任务，证明已提交且响应不等worker完成。
默认UnavailableJobDispatcher明确拒绝，code=PROCESSOR_NOT_AVAILABLE；004替换为实际有界调度器。
手动GET最近50条仅解决不确定提交，完整历史分页/自动跟踪由005提供。

## 前端与代理

每槽位独立AbortController/序号与objectURL；替换/移除/卸载释放并忽略旧结果。双端校验，浏览器也检查可解码及像素。
提交ref同步锁+disabled，受理后清槽并展示任务ID/服务端状态；网络/5xx结果不确定时禁用重提直到成功核对记录。
核对成功后用户显式确认再准备提交；不自动补发POST。普通4xx可修正后重试。
身份初始化失败可重试；上传前必须身份ready。离开页面取消请求，已经受理的任务不被客户端取消。
代理按路径+方法白名单转发，保留Cookie/Set-Cookie/Content-Type/Location，body使用流；有Origin的写请求必须同源。

## Complexity Tracking

继续Compose专用MySQL集成验证，足以测试事务提交/回滚且不需嵌套Docker。无约章例外。

# Implementation Plan: 个人历史与多任务跟踪

**Branch**: `005-history-tracking` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

## Summary

新增/history独立记录页与导航。Java提供按创建时间+ID倒序的游标分页及本人未完成任务查询。前端共享逐任务跟踪器：每秒查询未完成任务，失败暂停该任务并手动恢复；按请求代次/身份/版本防迟到覆盖。详情受理即启动跟踪；历史刷新恢复全部未完成任务。访客切换先卸载旧个人视图、撤销旧cookie再创建新身份。

## Technical Context

- 延用004全部锁定版本：Java21/Boot3.5.16/MyBatis3.0.5/MySQL8.4；Next16.4.3/React19.3.1/TS5.9.3；无新依赖。
- 已有job索引(owner_id,created_at,id)支持keyset分页，无SQL迁移；cursor为末条本人job UUID，服务端查锚点时间，limit默认20、范围1～50。
- GET /api/jobs/active补全首页以外仍未完成任务；生产有界单队列保证未完成数受控，查询仍按owner过滤。
- 客户端JobTracker + useSyncExternalStore，页面内按身份实例化，setTimeout完成后再安排下一次，无重叠轮询；每任务错误独立。
- 容器Vitest假时钟/延迟Promise验证生命周期；JUnit真实HTTP/MySQL验证分页归属；真实Compose与浏览器验收原题。
- 单机演示，无用户账号找回、跨设备同步、删除历史或自动重试策略。

## Constitution Check

| 原则 | 设计前/后 |
| --- | --- |
| 规格追踪 | FR001～006映射契约/数据模型/任务及R01～14验收表，PASS |
| TDD | 新分页、三任务乱序、查询异常、清理及身份切换先RED，PASS |
| Java业务 | 历史/活动查询由Java和MySQL负责，GET严格只读，PASS |
| 隔离 | owner/任务/request epoch/version隔离，终态不回退，PASS |
| 可复现 | 无依赖变更，Docker检查/启动、单智能体、及时提交，PASS |

## Project Structure

```text
backend/src/main/java/com/materialstudio/job/    HistoryService、JobMapper、JobController
backend/src/test/java/com/materialstudio/job/    HistoryApiTest
frontend/src/features/jobs/                     JobTracker、useJobTracker、JobCards、History、SubmissionForm
frontend/src/features/identity/                 SessionGate
frontend/src/app/history/page.tsx                记录入口
frontend/src/app/layout.tsx                      主导航
scripts/verify-005.mjs                           容器验收
specs/005-history-tracking/                      规格/设计/任务
docs/acceptance.md                              R01～14实现与验证对照
```

## UI方向

延用canvas #f3f6fa、ink #172a42、action #275dce、paper #fff、muted #526277、line #d6dfea。标题沿系统中文字族，任务编号用等宽字体。
记录是照片作品的制作台账：上方标题、身份与刷新，下方按时间排列的作品卡；成功图片占一侧，状态/阶段/失败原因占另一侧；小屏改为单列。
页面只展示“正在自动更新/查询暂停/制作失败”等用户可理解语义；不将版本、轮询实现或队列参数加入正常用户流程。无装饰统计卡片或新品牌风格。

## Complexity Tracking

无约章例外。每个页面只跟踪已受理/已恢复任务；history同时恢复active集合以免旧页任务漏跟踪。切换访客不取消Java后台任务。

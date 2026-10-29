# Tasks: MVP验收收尾

单智能体、容器TDD、及时提交。

## Setup

- [x] T001 在 specs/006-mvp-hardening/ 完成spec/plan/research/data-model/contracts/quickstart与质量检查。

## US1 刷新分页

- [x] T002 [US1] 在 frontend/src/features/jobs/history.test.tsx 增加原末页/旧游标跨页新增、失败保留与去重测试，观察RED。
- [x] T003 [US1] 在 frontend/src/features/jobs/History.tsx 修复成功刷新使用最新游标，完成GREEN，不回退任务快照。

## US2 图片资源恢复

- [x] T004 [US2] 在 frontend/src/features/jobs/result-preview.test.tsx 增加图片失败/反复重试/两任务隔离/终态保持用例，观察RED。
- [x] T005 [US2] 在 frontend/src/features/jobs/ResultPreview.tsx、JobCards.tsx、frontend/src/app/globals.css 实现“attempt非负整数”、独立资源状态与同源GET重试，完成GREEN。

## US3 受理测量

- [x] T006 [US3] 在 scripts/measure-admission.mjs 实现10次真实受理逐项计时与默认三阶段各2000ms检查，结果不含token。
- [x] T007 [US3] 重建Compose，执行API测量及浏览器10次可见编号观测，将逐次数据/负载/工具开销写入 docs/admission-measurements.md。

## Validation / Delivery

- [x] T008 执行 compose.yaml 全前端检查与Java verify，真实接口及浏览器恢复验收，记录 docs/work-log.md。
- [x] T009 更新 README.md、docs/acceptance.md、docs/roadmap.md、specs/001-material-workflow/ 的已知缺口/SC证据，并完成文档校验和提交。

依赖T001→T002/T003→T004/T005→T006/T007→T008/T009；无[P]任务。每个行为先观察RED，再最小实现并回归。

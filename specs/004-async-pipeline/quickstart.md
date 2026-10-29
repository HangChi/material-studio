# 004验证指南

```sh
docker compose --profile test run --rm backend-test
docker compose --profile test run --rm frontend-test
docker compose up --build -d
docker compose exec -T frontend node --input-type=module < scripts/verify-004.mjs
```

先建立session并上传素材（沿003），POST参数见[契约](contracts/http-api.md)。省略simulation各阶段2秒；指定三个阶段分别失败，或调整各阶段0～10000ms。等待后读取events核对顺序/中断，终态重复查询不变，其他身份无法读取结果。

页面上传提交后可离开，稍后回到详情“查看已受理任务”手动核对阶段/结果；自动轮询与历史页留005。受理返回值是瞬时快照，无需始终QUEUED。

重启验证：提交耗时任务后docker compose restart backend，稍后查询应FAILED/PROCESS_INTERRUPTED，不续跑；此前成功终态与图片不变。容器数据卷保留。单进程，不允许多副本共享该队列/恢复逻辑。

队列容量16，1个运行+16个等待；满时新增任务202且持久QUEUE_REJECTED。集成测试使用更小队列与阻塞栅栏可靠验证，不依赖长时间睡眠。

本文件为计划验证入口，实际结果及RED/GREEN证据填写docs/work-log.md。

## 已执行结果（2026-10-29）

- Java容器完整35/35测试及mvn verify打包通过；前端45/45、lint/typecheck/生产构建通过。
- 最终Compose重建成功；真实verify-003与verify-004均通过，V3兼容既有演示数据。
- restart-prepare→SIGKILL backend→up --wait→restart-check通过：运行和排队任务中断，成功快照及结果图片保留。
- Chrome上传两图并提交，离开详情再回来手动读取同一任务成功阶段和图片；375×812确认长编号换行、图片缩放，已恢复桌面模式。
- 队列满/FIFO由容量1加阻塞栅栏的真实HTTP/MySQL测试验证；没有伪称浏览器或运行脚本塞满默认16队列。
- 临时截图/tmp/material-studio-004.png与/tmp/material-studio-004-mobile.png；远端CI及真实TLS未执行。

详见[工作日志](../../docs/work-log.md)。005尚未实现，不把手动核对宣传为自动历史跟踪。

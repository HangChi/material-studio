# 011 · 执行顺序6～9验收

日期2026-10-30，单智能体串行；范围为[011规格](../specs/011-creative-library/spec.md)和[13项任务](../specs/011-creative-library/tasks.md)。实现提交：`fd7312b`文件生命周期、`aeca30d`批次、`acd0ff4`作品组织、`1ad8105`账号与恢复。当前文档和脚本收尾提交以Git日志为准。

## 容器检查与TDD

Java执行`docker compose --profile test run --rm backend-test`：78项、0失败/错误/跳过，mvn verify打包通过。前端执行既有锁文件依赖镜像挂载当前src：

```sh
docker run --rm -v "$PWD/frontend/src:/app/src:ro" material-studio-frontend-check sh -c 'npm run lint && npm run typecheck && npm test && npm run build'
```

23文件112项、lint/typecheck与生产构建通过；收尾中性身份文案更正后再次全量通过。日志为本机`/tmp/material-011-backend-final2.log`、`/tmp/material-011-front-delivery.log`，不随仓库提交。远端CI使用Compose默认入口从锁文件安装依赖，不将缓存检查称为本地全新安装。

业务RED：维护/批次/组织/账号接口最初404；前端缺批次、选择/标签和恢复码/迁移确认行为；追加恢复码重新生成先404，重音标签冲突先500，隔离文件改变后的旧清理快照先错误200。对应GREEN详见[工作日志](work-log.md)。MySQL外键排序规则不兼容、容器临时文件权限不匹配属于环境整合问题，不算业务RED。

## 独立卷与真实升级

使用项目`material-studio-011`、端口3111、新建MySQL和素材卷，浏览器用`127.0.0.1:3111`隔离原localhost Cookie。复用已验证Docker缓存，不声称重新下载全部依赖。

先用旧010镜像从空卷启动V1～V7，创建匿名身份、素材、成功作品`8b9cf64d-ca23-48f8-af5e-279428810655`和提交回执；随后同卷重建011生产镜像，成功迁移V8～V12。旧Cookie仍指向同owner，成功PNG可读，同旧key/载荷返回同任务ID。之后绑定账号仍保持原owner及这些记录。原3000未用于写验收数据或清理。

脚本通过实际Next→Java→MySQL/文件卷验证：三项批次2成功1指定失败、失败后不执行后续阶段、同key回放、他人404、取消未完成项；标签规范化/精确筛选、隐藏恢复、越权整批不变、ZIP两成员UUID文件名/失败作品拒绝；绑定保留归属、第二设备同owner、独立退出、显式访客迁移保留素材/批次/标签、活动源拒绝、恢复和重新生成码后旧码/旧会话失效。原子回滚/调度时机/限流/冲突另由真实MySQL接口测试覆盖。

首次升级脚本输出`legacyRestored:true`，批次`266fe85a-a79a-40bf-8885-8384095f8a89`；添加隔离环境确认保护后重跑新访客链路也通过（`legacyRestored:false`，并非重复宣称旧Cookie验证）。脚本只打印状态和测试ID，不打印凭据。

复现只对独立项目执行，会生成测试记录：

```sh
WEB_PORT=3111 docker compose -p material-studio-011 up --build -d --wait
WEB_PORT=3111 docker compose -p material-studio-011 exec -T -e VERIFY_ISOLATED=true frontend node --input-type=module < scripts/verify-011.mjs
```

旧镜像升级分支需要先在旧010环境创建回执及临时`/tmp/material-011-legacy.json`；默认脚本不凭空声称测试过旧版本。随机浏览器测试凭据仅写权限600的容器临时文件，不提交到仓库；清理环境时删除本机副本。

## 文件隔离与到期清理

只在上述独立卷创建UUID测试孤儿`11111111-2222-4333-8444-555555555555.png`，mtime设为两天前。盘点列入候选，确认快照后文件被隔离，审计`b801909a-0c3e-40e8-b326-a008a8b4671c`为QUARANTINED；旧快照重放409。仅把该测试审计时间设为八天前，模拟七天保留期，确认新purgeSnapshot后文件删除、审计为PURGED。没有真实等待七天，也没有回拨原环境或系统时间。

两个模式仅用于已准备好fixture的独立卷；不得直接复制到原3000项目：

```sh
WEB_PORT=3111 docker compose -p material-studio-011 exec -T -e VERIFY_ISOLATED=true -e VERIFY_MODE=quarantine frontend node --input-type=module < scripts/verify-011.mjs
# 仅将该测试fixture审计设为八天前，重新盘点后运行：
WEB_PORT=3111 docker compose -p material-studio-011 exec -T -e VERIFY_ISOLATED=true -e VERIFY_MODE=purge frontend node --input-type=module < scripts/verify-011.mjs
```

登记素材、活动结果、近期文件、符号链接和隔离失败补偿由StorageLifecycleTest验证。维护入口不加入Next代理。默认没有自动清理或磁盘配额；登记但暂未使用的素材继续保留，保护本机草稿。

## 浏览器与界面

登录随机测试账号，账号页显示当前用户名；批次表单逐项复用素材库，创建“浏览器批量验收”两项，返回等待/处理状态。进入历史页后继续更新，回批次页显示同一批次`4972f585-875a-48d8-8c76-0f81299a40ea`、2/2成功。选中成功作品并执行批量取消收藏，标题收藏标记消失、选择清空。没有拍摄密码或恢复码。

1280×900桌面和375×812小屏检查：批次、历史和账号页小屏均`innerWidth=scrollWidth=375`，桌面1280；四入口导航、批量按钮/输入与结果操作可用。临时视口已恢复。恢复码保存确认、显式迁移二次确认由组件测试验证，浏览器未执行密码变更。

截图：[批次桌面](011-batches-desktop.jpg)、[批次小屏](011-batches-mobile.jpg)、[管理桌面](011-history-desktop.jpg)、[管理小屏](011-history-mobile.jpg)、[账号桌面](011-account-desktop.jpg)、[账号小屏](011-account-mobile.jpg)。文件为工具原生JPEG字节。

## 交付状态与限制

原3000服务已使用保留卷Compose生产重建，MySQL/Java/Next均healthy；未向原卷写入验收fixture或执行维护清理。仍为单后端实例、单worker、全任务重启重试；无阶段断点、多实例租约、SSE、外部身份服务或邮件。ZIP最多20项/原图64MiB，批量管理50项，批次10项；本机草稿不自动跨设备同步。未绑定访客丢失Cookie无法恢复，密码和恢复码都丢失时不提供绕过找回。公网/TLS未验证。

首次远端[40920072716](https://github.com/HangChi/material-studio/actions/runs/40920072716)前端通过，Java78项中HistoryApiTest一项失败：真实后台扫描器把只读查询测试的裸QUEUED fixture改成PIPELINE_FAILED。为查询测试替换JobDispatcher，保留HTTP/MySQL及数据完全不变断言，并新增查询不触发调度断言；不修改业务或生产扫描器。该类3项回归及完整78项/打包通过（本机`/tmp/material-011-backend-delivery.log`），最终远端结果在修复提交后补充。

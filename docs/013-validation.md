# 013 · 多实例租约验收
2026-10-30，第10项第二独立增量，承接012。规格16/16通过，7项任务，严格串行；默认仍一个后台，可显式扩为多个共享MySQL/素材卷的后台。

## 测试先行与全量检查
- claim可编译空桩下12并发期望1实际0；同job发布路径相同会覆盖，均观察RED后实现。
- 启动恢复把有效租约RUNNING改成QUEUED、旧代次complete被接受，两项RED后增加状态fence及仅过期恢复。
- 取消嵌套事务回滚后断点文件已删，真实RED后延到最外层提交；登记清理使用REQUIRES_NEW。测试包含外层回滚及提交两种情况。
- 快节点Instant.now提前两小时，DB一小时后任务被提前领取，真实RED后领取/阶段可用/退避均改DB时间。

最终`docker compose --profile test run --rm backend-test`：90项、0失败/错误/跳过、mvn verify打包通过（`/tmp/material-013-backend-clock-green.log`）。旧固定id.png碰撞fixture不再适合随机路径，改为独立results目录被文件阻挡的真实I/O故障，仍验证三次耗尽、FINALIZE失败、无结果/私有路径不泄漏。此fixture适配不算目标缺失RED。前端无新变更，本地112项沿用012，远端默认入口会重新执行。

## 独立双实例与真实接管
material-studio-013端口3113、新卷V1～V14、两个backend、租约3000ms，使用既有镜像缓存。四项普通批次都成功，每项六个有序版本事件；两个慢任务同时进入FINALIZE。SQL核对running=2、不同workers=2、live_leases=2；租约相对首次阶段跨度最小4549.102ms，大于3秒，证明已续期。只SIGKILL backend-1且不重启，backend-2完成两项，attempts=[1,2]，每项GENERATE STARTED均仅1，恢复项含GENERATE/RESUMED，结果可读。

数据库时钟修正后重新构建双后台复核：普通批次347682ab-02ee-47ec-86b8-1340b7c38429、接管批次a18501c5-f7b5-4112-9c12-6b81c415a3de；再次读到running/workers/live_leases=2/2/2、最小续租跨度5180.192ms，然后强杀后台1。脚本最终passed，attempts=[1,2]、每项合成启动一次。脚本仅存权限600的临时Cookie，不打印；通过后撤销会话并删fixture。

```sh
WEB_PORT=3113 STUDIO_LEASE_MS=3000 docker compose -p material-studio-013 up --build -d --wait --scale backend=2
WEB_PORT=3113 docker compose -p material-studio-013 exec -T -e VERIFY_ISOLATED=true -e VERIFY_MODE=prepare frontend node --input-type=module < scripts/verify-013.mjs
# ready之后、慢任务结束前，仅杀独立测试后台1，不重启
docker kill --signal=SIGKILL material-studio-013-backend-1
WEB_PORT=3113 docker compose -p material-studio-013 exec -T -e VERIFY_ISOLATED=true frontend node --input-type=module < scripts/verify-013.mjs
```

生产默认STUDIO_LEASE_MS=15000，最小3000；每lease/3周期续期，过期不能复活；领取、续租、阶段统一job→runtime锁序。旧代次不能开始/完成、写断点、重排或失败；释放不清后继租约。随机最终文件防止失效线程覆盖胜者字节。终态和三次预算保留。

## 边界与交付
这保证当前代次提交权，不阻止失效线程继续消耗CPU，不承诺物理计算恰好一次或按实例数线性提速。需要共享文件卷，Compose示范不提供跨地域复制、生产负载均衡或前端高可用；后台退出时代理查询可能短暂502，读可重试、不重发制作。

原3000未强杀/写验收数据，仍保留011直到本轮全部验收后更新。012独立测试容器已停止保留卷；013临时环境交付后停止保留卷。远端CI在推送后据实补充，014 SSE独立立项。

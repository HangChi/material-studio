# 012 · 阶段断点验收
2026-10-30，用户第10项第一独立增量。规格16/16通过；使用现有三阶段、三次执行预算及共享文件卷，不引入运行依赖。源码增量b79171d规格、f20440f复用、fe4f55b回退/清理。

## TDD与容器检查
CheckpointTest首次RED为整理重试后合成期望一次、实际两次；终态清理RED为成功后两条断点未删除、取消后文件仍在；维护RED为.checkpoints旧孤儿应列出但为空。缺失、损坏、输入改变和符号链接回退、完成事件失败时标记/状态共同回滚亦有测试，不把原本通过的保护机制谎称RED。首次回归纠正素材丢失提前读取摘要时未保留ASSET_CHECK阶段的问题。

完整`docker compose --profile test run --rm backend-test`：83项、0失败/错误/跳过、mvn verify打包通过；日志`/tmp/material-012-backend-all.log`。前端既有锁定依赖镜像挂载当前src执行lint/typecheck/test/build，23文件112项与构建通过（`/tmp/material-012-front-all.log`）；只补恢复事件中文标签，无新交互，不强造UI RED。相关定向17项通过。

## 真实进程中断
独立项目material-studio-012端口3112、新MySQL/资产卷从V1～V13启动（复用Docker缓存，不声称全新下载）。测试脚本创建素材/任务，在GENERATE完成、FINALIZE STARTED后仅强杀独立后台。保留卷重新启动后，同编号`6c2cc629-700e-42eb-b2d6-91337ade4851`成功、attempt=2、GENERATE STARTED总计1、含RESUMED，总共9事件，PNG可读。脚本撤销自己的临时会话并删除权限600的临时fixture。

```sh
WEB_PORT=3112 docker compose -p material-studio-012 up --build -d --wait
WEB_PORT=3112 docker compose -p material-studio-012 exec -T -e VERIFY_ISOLATED=true -e VERIFY_MODE=prepare frontend node --input-type=module < scripts/verify-012.mjs
# 必须在上一步ready-for-SIGKILL之后、整理10秒延迟结束前执行
WEB_PORT=3112 docker compose -p material-studio-012 kill -s SIGKILL backend
WEB_PORT=3112 docker compose -p material-studio-012 up -d --wait backend
WEB_PORT=3112 docker compose -p material-studio-012 exec -T -e VERIFY_ISOLATED=true frontend node --input-type=module < scripts/verify-012.mjs
```

没有在原3000故障注入或清理。文件和数据库不是共同事务；未登记旧中间文件由只读盘点/确认隔离/保留7天后清理，所有登记断点保护。仅复用校验一致的产物，输入含模板/配方/有序素材与内容摘要；终态和替换旧产物清理。阶段内部仍从头做，不承诺百分比断点。

## 交付
交付7934dae7b0cbac6b9005e34c055a63ff8b366c61的[远端CI 40988656812](https://github.com/HangChi/material-studio/actions/runs/40988656812)completed/success，前后端均通过。012全部7/7任务完成。多实例领取与SSE分别在后续013/014评估实现，不能把012断点说成已经支持多实例。

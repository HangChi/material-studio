# Validation
1. 独立空卷：WEB_PORT=3101 docker compose -p material-studio-010-cold up --build -d --wait；在该项目frontend执行verify-008.mjs验证真实闭环。原项目卷不动，完成后down保留验收卷。
2. 公开仓库HangChi/material-studio已创建；不重复建仓。推送已检查的提交并观察CI前后端两项通过，公开前审查新增文件和历史敏感特征。
3. 两个127.0.0.1:3102/history标签验证身份一致，取消确认原身份不变；确认切换后两个页面同归新访客。系统高对比模式模拟验证select文字/箭头及操作。
4. 容器frontend-check运行lint/typecheck/test/build；backend-test运行mvn verify，测试先RED后GREEN。
5. docker compose exec -T frontend node --input-type=module < scripts/verify-010.mjs验证模板、排队、内部监控隔离。监控在backend容器curl http://localhost:8080/actuator/studio读取。
6. 真实验证与CI结果记录docs/010-validation.md；缺失结果保留待办，不伪报通过。

## 最终压力链路（独立数据卷）

```sh
WEB_PORT=3102 STUDIO_QUEUE_CAPACITY=1 STUDIO_MAX_PENDING=8 STUDIO_MAX_PENDING_PER_USER=6 STUDIO_SUBMISSIONS_PER_MINUTE=10 docker compose -p material-studio-010-final up --build -d --wait
docker compose -p material-studio-010-final exec -T frontend node --input-type=module < scripts/verify-010.mjs
docker compose -p material-studio-010-final exec -T backend curl -fsS http://localhost:8080/actuator/studio
```

该命令只创建本轮独立项目，不重置原项目卷。脚本假定上述限额，使用新访客并在结束撤销脚本身份，保留测试记录；全新数据库先读取监控应为0样本。浏览器用127.0.0.1:3102，避免与localhost Cookie共享；不能仅靠端口隔离身份。若3102被占用，修改WEB_PORT并对应修改浏览器地址，容器内脚本仍访问3000。

完成后`docker compose -p material-studio-010-final down`保留验收卷。最新CI及实测结果见[010验收记录](../../docs/010-validation.md)。

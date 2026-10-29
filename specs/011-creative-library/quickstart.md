# Validation
使用独立项目material-studio-011、WEB_PORT=3111；浏览器127.0.0.1:3111，避免localhost Cookie共享。全量命令沿用Compose frontend-test/backend-test；开发回归用既有frontend-check挂载src，Java独立test-mysql。
文件盘点/隔离/清理仅在独立测试卷，先GET快照后POST confirm，不在原3000卷执行。恢复/迁移账号均用随机测试用户名与临时凭据，不提交或打印恢复码。真实链路scripts/verify-011.mjs覆盖批次、组织、跨设备登录/恢复、访客迁移和越权。
最终更新README、roadmap、acceptance和docs/011-validation.md，推送公开仓库并观察两项CI。单智能体串行，不使用子智能体。

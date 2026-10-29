# Validation
1. 独立空卷：WEB_PORT=3101 docker compose -p material-studio-010-cold up --build -d --wait；在该项目frontend执行verify-008.mjs验证真实闭环。原项目卷不动，完成后down保留验收卷。
2. 公开前审查历史文件与敏感特征，gh repo create material-studio --public --source . --remote origin --push；观察CI两项通过。
3. 两个3101/history标签验证身份一致，取消确认原身份不变；确认切换后两个页面同归新访客。系统高对比模式模拟验证select文字/箭头及操作。
4. 容器frontend-check运行lint/typecheck/test/build；backend-test运行mvn verify，测试先RED后GREEN。
5. docker compose exec -T frontend node --input-type=module < scripts/verify-010.mjs验证模板、排队、内部监控隔离。监控在backend容器curl http://localhost:8080/actuator/studio读取。
6. 真实验证与CI结果记录docs/010-validation.md；缺失结果保留待办，不伪报通过。

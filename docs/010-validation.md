# 010实际验证记录

## 基线与交付
- 起始文档基线a03a782。公开仓库：https://github.com/HangChi/material-studio；用户明确授权创建公开仓库。
- 公开前审查49个历史提交：敏感配置文件名、常见私钥/GitHub/OpenAI/AWS凭据模式均0命中；无真实凭据加入仓库。
- `WEB_PORT=3101 docker compose -p material-studio-010-cold up --build -d --wait`从不存在的独立卷创建mysql-data/asset-data，三服务健康。使用已有Docker依赖层，未宣称无缓存全量下载。
- 独立cold项目frontend执行scripts/verify-008.mjs通过：素材分页、三模板真实PNG、编辑配方、重命名/收藏/隐藏恢复/搜索、排队取消、跨身份隐私；编辑任务74edd4e2。
- 浏览器两个3101/history标签显示相同访客609b26d9；切换后均显示6639c02e，真实storage联动通过，不操作原3000演示身份。
- 首次远端CI运行[40901483518](https://github.com/HangChi/material-studio/actions/runs/40901483518)，前端与后端两项均success；完整依赖安装/检查在GitHub runner容器执行。

## US2访客确认
- RED：容器session.test.tsx为4通过/1失败，取消用例断言confirm被调用实际0次，目标行为缺失。
- GREEN：原生confirm前置于身份变更/撤销，取消保持私有视图；lint/typecheck及session/history共13项通过。

## 待完成
- 确认功能更新后的真实取消/确认双标签验收、高对比模式实测。
- US3～US5、最终全量检查、最新提交远端CI。

## US3动态模板
- RED：容器template-filter.test.tsx三个测试均因动态选项/重试/abort缺失失败。
- GREEN：History独立读取Java模板接口，保留当前选择、错误重试/卸载abort，不阻塞历史；全前端20文件94项测试、lint/typecheck/生产构建通过。
- 整合时旧history测试桩把所有额外请求当分页，导致四个用例失败；修正桩明确处理/api/templates后恢复通过，不修改既有分页目标断言。

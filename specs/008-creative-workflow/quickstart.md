# Validation
Docker Compose默认前后端测试入口；scripts/verify-008.mjs验证全部接口。浏览器：从历史编辑作品→复用素材库→修改参数→刷新草稿→提交新作品→按名称筛选/收藏/隐藏/恢复→排队取消；检查375px。
重启验收：准备10秒任务，SIGKILL backend，up --wait backend，同ID最终成功且恢复事件存在；临时结果路径冲突解除后自动重试成功，不解除三次耗尽。只作用于本项目测试任务，不清理用户数据卷。

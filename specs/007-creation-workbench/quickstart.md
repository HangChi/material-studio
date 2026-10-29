# 验证

在项目根运行 docker compose --profile test run --rm backend-test 及 frontend-test。应用 docker compose up --build -d。

1. 明信片上传两张图片，调整标题/比例/配色/两图裁剪，提交；期间可继续创建，离开仍执行。
2. 重复同Idempotency-Key载荷（含并发）得到同编号；变更载荷409；刷新未确认提交后安全重试仍得同编号。
3. 展开事件，处理中随任务版本更新；失败显示原因；离线查询不改写执行状态。
4. 成功PNG下载比对尺寸及图片；再次制作得新编号，原记录不变。API指定GENERATE失败后重试新任务成功。
5. 换访客不可读原结果/配方/事件或重新制作。375px可操作，控件有标签及键盘焦点。

完整真实API链路：`docker compose exec -T frontend node --input-type=module < scripts/verify-007.mjs`。成功输出status=passed、1000×1000及结果摘要，不打印令牌；记录与文件保留，脚本身份会撤销。

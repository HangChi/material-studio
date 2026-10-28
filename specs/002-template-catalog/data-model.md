# 数据模型

## Category

id主键，name非空。种子creative（创意图片）、social（社交分享）。

## Template

id主键（稳定slug）、categoryId非空外键、title/description/coverFilename非空。
约束：requiredImageCount ∈ {1,2,3}；acceptedMimeTypes 为 image/jpeg、image/png；maxFileSizeBytes=5242880。
模板id/标题/封面一一对应：demo-portrait「日光肖像」1张，demo-postcard「旅行明信片」2张，demo-collage「周末拼贴」3张。
categoryId/id确定排序；coverFilename为白名单PNG名，不接受任意文件路径。
acceptedMimeTypes/maxFileSizeBytes本期固定，由Java响应构造；requiredImageCount由MySQL读取并约束。

## 查询状态

浏览器分类状态与列表加载状态独立，列表状态loading/success/error；success可为空数组。
请求附带AbortController与requestId；过时响应不能替换当前分类快照。
详情loading/success/not-found/error；不为未知模板展示假详情。

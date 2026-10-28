# 002 模板只读HTTP契约

无需身份，浏览器同源/api/*由Next转发到Java；Java业务从MySQL读取，不信任前端模板数组。
本期代理仅允许GET白名单模板路由，003扩展个人接口时另行定义cookie与写入透传测试。

- GET /api/template-categories → 200 {items:[{id,name}]}。
- GET /api/templates → 200 {items:[Template]}；可带categoryId，未知分类返回空数组。
- GET /api/templates/{id} → 200 Template；不存在404 {error:{code:"TEMPLATE_NOT_FOUND",message:"模板不存在"}}。
- GET /api/demo/{filename} → 白名单PNG字节，Content-Type:image/png，X-Content-Type-Options:nosniff；未知/非法文件名404。
- 其他代理路径404，非GET405；上游不可用502 {error:{code:"UPSTREAM_UNAVAILABLE",message:"暂时无法加载模板，请重试"}}。

Template={id,title,categoryId,coverUrl,description,requiredImageCount,acceptedMimeTypes,maxFileSizeBytes}。
coverUrl为/api/demo/{filename}同源路径。约束见data-model.md，最多5MiB、JPEG/PNG，详情显示为用户文案。
查询只读，确定性排序，无轮询。代理保留上游HTTP状态与Content-Type/nosniff，响应不缓存以便演示数据与失败恢复。
Java数据库等内部异常返回500通用错误，不暴露SQL/路径/堆栈；前端显示重试入口。

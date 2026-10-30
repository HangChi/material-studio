# Research
- Decision：SseEmitter复用Spring MVC异步；[官方异步指南](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-async.html)与[SseEmitter API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/mvc/method/annotation/SseEmitter.html)说明事件发送/回收入口。网页当前7.x，实际编译/集成验证项目Boot3.5所用6.x API，不升级框架。
- Decision：每跟踪器一源、最多50项；发送最新快照，版本去重和终态保护复用JobTracker。Alternative：每任务一源会耗浏览器连接；不引入WebSocket/消息代理。
- Decision：断线立即GET补查后沿用轮询，不让原生EventSource无限重连；生命周期重启或手动恢复可再尝试，心跳与20s watchdog识别被代理静默缓存的流。
- Decision：固定寿命/连接上限和原子清理限制资源；服务端每秒查询MySQL，不宣称数据库查询归零。租约与worker线程不承载网络写入。

# Research
- Decision: 原生confirm。Rationale: 有系统键盘/焦点/取消支持，现有界面无需新弹窗库。Alternative: 自建dialog需额外焦点管理。
- Decision: 持久QUEUED与既有scanner，受理数据库锁。Rationale: 单实例且已有恢复机制，避免内存满使任务失败；数据库锁和当前读保障并发限额。Alternative: 只用内存计数重启失真；消息队列不在范围。
- Decision: 任务创建时间滚动60秒限流。Rationale: 可审计、跨重启保留、无需Redis。Alternative: 固定窗口会产生边界突发。
- Decision: Java内部只读监控入口/actuator/studio。Rationale: 复用已有Web依赖与隔离网络，以MVC明确设置no-store，不开放全部Actuator指标，无浏览器全局数据入口。Alternative: 公共业务监控API引入权限体系。
- Decision: 统计先按现有事件聚合；无物化统计表。Rationale: 当前演示规模足够，标注成本与样本定义，后续数据增多再聚合归档。

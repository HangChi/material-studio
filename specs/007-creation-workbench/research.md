# 技术取舍

- Decision：同身份受理事务先锁本人demo_user行，再读操作表；(owner_id,request_key)唯一。Rationale：避免并发创建和重复调度，事务回滚不占用标识；重放先读操作结果不依赖当前素材可用性。Alternatives：仅内存锁无法跨进程持久；独立分布式锁无必要。
- Decision：请求摘要使用规范化参数/素材顺序/模拟配置/源任务序列化后SHA256。相同标识不同内容409。标识可选以兼容旧客户端，UI始终提供UUID。
- Decision：重试与再次制作共用recreate端点，服务端读取本人配方和素材，清除failStage，保留耗时和关联。不改写原记录。
- Decision：Java2D绘图，GENERATE生成内存图片，FINALIZE原子落盘；中文字体由Ubuntu fonts-wqy-zenhei包提供，渲染器显式选择文泉驿正黑。
- Decision：裁剪为cover比例×zoom，x/y为剩余可移动范围的0～1位置；前端object-fit:cover + object-position + 内层放大按同一几何公式呈现。
- Decision：保持已有轮询与事件API，只对展开详情按任务version更新；提供独立错误/重试，不新增后台轮询器。

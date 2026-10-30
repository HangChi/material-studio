# Research
- Decision：任务行锁串行化领取，代次与租约条件约束所有提交；不引入消息代理。Rationale：现有共享MySQL已是事实来源，短事务足够。Alternative：仅进程集合不能跨实例隔离。
- MySQL官方[锁定读](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)支持FOR UPDATE；选择按已知任务主键锁而非额外批量SKIP LOCKED调度。
- 续租以数据库时钟和仍未过期为条件；过期旧线程恢复后不能复活。租约是提交权限，不能阻止分区线程继续耗CPU。
- 唯一临时/最终文件名结合数据库结果指针fence；仅fence数据库而复用id.png仍会被旧线程改写字节，必须同时修改发布命名。

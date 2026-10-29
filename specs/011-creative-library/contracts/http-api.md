# HTTP Contracts
## Internal storage
GET /actuator/storage -> {snapshot,candidates:[{path,sizeBytes,modifiedAt}],purgeSnapshot,expired:[audit rows]}，只读。POST /actuator/storage/quarantine 或 /purge body {snapshot,confirm:true}；重扫摘要不符409 STALE_SNAPSHOT，缺确认422。成功返回当前盘点；审计GET /actuator/storage/audit只读最近100条。不加入Next代理。
## Batches
POST /api/batches，必需Idempotency-Key，body {name,items:[单项POST /jobs载荷]}，202 {batch}，同key同内容回放，异内容409；非法/超配额整批回滚且不调度。GET /api/batches?limit=20&cursor=本人批次UUID ->{items,nextCursor}；limit1～50。GET /api/batches/{id}->{batch:{id,name,createdAt,items:Job[],counts:{queued,running,succeeded,failed,cancelled}}}。POST /api/batches/{id}/cancel ->{batch}，只取消未终态，重复安全；他人404。
## Organization
GET /api/jobs/{id}/tags ->{items:string[]}；POST /api/works/bulk body {ids:1～50唯一UUID,favorite?,hidden?,tags?} ->{items:Job[]}，至少一个修改；全部先校验归属，错一条整批失败。GET /api/jobs增tag精确规范化筛选，保留其他筛选。POST /api/works/archive body{ids:1～20唯一UUID}->application/zip附件；全部本人成功且文件可读，总原图<=64MiB，否则422/404，无部分下载。均no-store。
## Accounts
POST /api/account/register body{username,password}需当前匿名Cookie，201 {user:{id,username,createdAt},recoveryCode}，绑定本人ID保留所有数据、轮换当前session。
POST /api/account/login body{username,password,mergeGuest:false|true}，200同user但不含recoveryCode，轮换当前Cookie；merge需显式true、仅匿名源，无活动源任务及无提交/批次key碰撞。两个账号间直接登录要求先退出409，源活动409 MIGRATION_BUSY，冲突409 MIGRATION_CONFLICT。
POST /api/account/recover body{username,recoveryCode,password}，200 {user,recoveryCode:新码}；成功轮换密码/恢复码、撤销所有旧会话并发新Cookie。错误认证401 AUTH_FAILED；5次失败/15min后429 AUTH_THROTTLED（Retry-After900），不透露用户名存在与否。字段不合法422。
GET/POST /api/session返回user增加可空username；DELETE只撤销当前session，账号记录保留。新session仅HttpOnly/SameSite=Lax，HTTPS由COOKIE_SECURE控制；恢复码不写日志或浏览器存储。

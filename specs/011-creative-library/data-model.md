# Data Model
V8 storage_audit(id UUID, relative_path, size_bytes, status QUARANTINED/DELETING/PURGED, created_at, purged_at)。候选冷却24h，隔离保留7天。
V9 creation_batch(id,owner_id,name,request_key,fingerprint,created_at)及batch_job(batch_id,job_id,slot_index)，批次key1～80 ASCII安全字符、1～10项、名称1～60码点。
V10 job_tag(job_id,tag)主键，每任务最多10项，V12将tag列改为utf8mb4_bin以精确区分重音字符；每项NFKC/去首尾/小写后1～20码点，禁止控制字符。
V11 local_account(user_id唯一,username唯一3～32[a-z0-9_],password_hash,salt,recovery_hash,created_at)；identity_session(token_hash唯一,user_id,expires_at,revoked_at,created_at)从旧身份回填365天；auth_attempt(username,failures,window_started)5次/15分钟。会话token32随机字节，密码12～128字符，salt16字节，恢复码32字节随机，仅哈希落库。
旧job/素材/配方标识不变，注册绑定相同user_id。迁移改变owner但不改jobID/配方/事件/标签；源不许有QUEUED/RUNNING，标识碰撞拒绝，不能合并两个账号。

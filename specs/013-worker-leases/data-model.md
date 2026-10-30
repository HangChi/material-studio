# Data Model
job_runtime新增lease_owner CHAR(36)可空、lease_generation BIGINT非空默认0且>=0、lease_until TIMESTAMP(6)可空。有效期判断CURRENT_TIMESTAMP(6)，默认15000ms、最小3000ms。Claim含jobId、owner、generation；每次领取递增。release只清期限，保留最后owner/gen。job/事件/断点提交事务先锁job再核对租约，过期无提交权。

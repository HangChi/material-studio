package com.materialstudio.job;

import com.materialstudio.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AdmissionPolicy {
    private final AdmissionMapper mapper;
    private final int maximumPending;
    private final int maximumPerUser;
    private final int submissionsPerMinute;

    public AdmissionPolicy(AdmissionMapper mapper,
            @Value("${studio.max-pending:100}") int maximumPending,
            @Value("${studio.max-pending-per-user:20}") int maximumPerUser,
            @Value("${studio.submissions-per-minute:10}") int submissionsPerMinute) {
        if (maximumPending < 1 || maximumPerUser < 1 || submissionsPerMinute < 1) {
            throw new IllegalArgumentException("Admission limits must be positive integers");
        }
        this.mapper = mapper;
        this.maximumPending = maximumPending;
        this.maximumPerUser = maximumPerUser;
        this.submissionsPerMinute = submissionsPerMinute;
    }

    // Called after idempotency replay, inside the same READ_COMMITTED transaction as insertion.
    public void check(String owner) {
        mapper.lock();
        if (mapper.pending() >= maximumPending) {
            throw new ApiException(429, "ADMISSION_LIMIT", "当前等待制作的任务较多，请稍后再提交");
        }
        if (mapper.pendingFor(owner) >= maximumPerUser) {
            throw new ApiException(429, "ADMISSION_LIMIT", "当前访客的未完成任务已达上限，请等待或取消部分任务");
        }
        if (mapper.recentFor(owner) >= submissionsPerMinute) {
            throw new ApiException(429, "RATE_LIMITED", "提交过于频繁，请一分钟后重试");
        }
    }
}

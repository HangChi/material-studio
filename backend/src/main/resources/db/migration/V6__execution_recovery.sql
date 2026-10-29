CREATE TABLE job_runtime (
 job_id CHAR(36) PRIMARY KEY, attempt_count INT NOT NULL DEFAULT 0, available_at TIMESTAMP(6),
 FOREIGN KEY(job_id) REFERENCES job(id), CHECK(attempt_count BETWEEN 0 AND 3)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

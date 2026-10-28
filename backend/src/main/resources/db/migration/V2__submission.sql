CREATE TABLE demo_user (
 id CHAR(36) PRIMARY KEY, token_hash CHAR(64) NOT NULL UNIQUE,
 created_at TIMESTAMP(6) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE asset (
 id CHAR(36) PRIMARY KEY, owner_id CHAR(36) NOT NULL, storage_filename VARCHAR(80) NOT NULL UNIQUE,
 mime_type VARCHAR(30) NOT NULL, size_bytes BIGINT NOT NULL, created_at TIMESTAMP(6) NOT NULL,
 FOREIGN KEY(owner_id) REFERENCES demo_user(id),
 CHECK(mime_type IN ('image/jpeg','image/png')), CHECK(size_bytes > 0 AND size_bytes <= 5242880)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE job (
 id CHAR(36) PRIMARY KEY, owner_id CHAR(36) NOT NULL, template_id VARCHAR(60) NOT NULL,
 template_title VARCHAR(100) NOT NULL, status VARCHAR(20) NOT NULL, stage VARCHAR(30), version BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMP(6) NOT NULL, updated_at TIMESTAMP(6) NOT NULL, finished_at TIMESTAMP(6),
 result_path VARCHAR(100), error_code VARCHAR(60), error_message VARCHAR(500),
 FOREIGN KEY(owner_id) REFERENCES demo_user(id), FOREIGN KEY(template_id) REFERENCES template(id),
 CHECK(status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')), CHECK(version >= 0),
 CHECK(stage IS NULL OR stage IN ('ASSET_CHECK','GENERATE','FINALIZE')),
 CHECK((status='QUEUED' AND stage IS NULL AND result_path IS NULL AND finished_at IS NULL AND error_code IS NULL AND error_message IS NULL)
 OR (status='RUNNING' AND stage IS NOT NULL AND result_path IS NULL AND finished_at IS NULL AND error_code IS NULL AND error_message IS NULL)
 OR (status='SUCCEEDED' AND result_path IS NOT NULL AND finished_at IS NOT NULL AND error_code IS NULL AND error_message IS NULL)
 OR (status='FAILED' AND result_path IS NULL AND finished_at IS NOT NULL AND error_code IS NOT NULL AND error_message IS NOT NULL)),
 INDEX ix_job_owner_time(owner_id,created_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE job_asset (
 job_id CHAR(36) NOT NULL, asset_id CHAR(36) NOT NULL, slot_index INT NOT NULL,
 PRIMARY KEY(job_id,slot_index), UNIQUE(job_id,asset_id), CHECK(slot_index >= 0),
 FOREIGN KEY(job_id) REFERENCES job(id), FOREIGN KEY(asset_id) REFERENCES asset(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE creation_batch (
 id CHAR(36) PRIMARY KEY,owner_id CHAR(36) NOT NULL,name VARCHAR(120) NOT NULL,
 request_key VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,fingerprint CHAR(64) NOT NULL,created_at TIMESTAMP(6) NOT NULL,
 UNIQUE(owner_id,request_key),FOREIGN KEY(owner_id) REFERENCES demo_user(id),INDEX ix_batch_owner_time(owner_id,created_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE batch_job (
 batch_id CHAR(36) NOT NULL,job_id CHAR(36) NOT NULL,slot_index INT NOT NULL,
 PRIMARY KEY(batch_id,slot_index),UNIQUE(job_id),FOREIGN KEY(batch_id) REFERENCES creation_batch(id),FOREIGN KEY(job_id) REFERENCES job(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

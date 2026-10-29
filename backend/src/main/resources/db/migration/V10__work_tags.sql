CREATE TABLE job_tag (
 job_id CHAR(36) NOT NULL,tag VARCHAR(40) NOT NULL,
 PRIMARY KEY(job_id,tag),FOREIGN KEY(job_id) REFERENCES job(id),INDEX ix_tag(tag,job_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

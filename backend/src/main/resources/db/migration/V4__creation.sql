CREATE TABLE job_request (
 owner_id CHAR(36) NOT NULL,
 request_key VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 fingerprint CHAR(64) NOT NULL, job_id CHAR(36) NOT NULL,
 PRIMARY KEY(owner_id,request_key),
 FOREIGN KEY(owner_id) REFERENCES demo_user(id), FOREIGN KEY(job_id) REFERENCES job(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE job_recipe (
 job_id CHAR(36) PRIMARY KEY, parameters_json JSON, source_job_id CHAR(36),
 FOREIGN KEY(job_id) REFERENCES job(id), FOREIGN KEY(source_job_id) REFERENCES job(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

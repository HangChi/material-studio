CREATE TABLE job_checkpoint (
 job_id CHAR(36) NOT NULL, stage VARCHAR(30) NOT NULL,
 input_hash CHAR(64) NOT NULL, artifact_path VARCHAR(80), artifact_hash CHAR(64), created_at TIMESTAMP(6) NOT NULL,
 PRIMARY KEY(job_id,stage), FOREIGN KEY(job_id) REFERENCES job(id),
 CHECK(stage IN ('ASSET_CHECK','GENERATE')),
 CHECK((stage='ASSET_CHECK' AND artifact_path IS NULL AND artifact_hash IS NULL) OR (stage='GENERATE' AND artifact_path IS NOT NULL AND artifact_hash IS NOT NULL))
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE job_event DROP CHECK job_event_chk_3;
ALTER TABLE job_event ADD CONSTRAINT job_event_kind CHECK(kind IN ('STARTED','COMPLETED','FAILED','INTERRUPTED','RESUMED'));

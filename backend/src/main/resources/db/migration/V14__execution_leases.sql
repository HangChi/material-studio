ALTER TABLE job_runtime ADD COLUMN lease_owner CHAR(36),
 ADD COLUMN lease_generation BIGINT NOT NULL DEFAULT 0,
 ADD COLUMN lease_until TIMESTAMP(6),
 ADD CONSTRAINT lease_generation_nonnegative CHECK(lease_generation>=0);

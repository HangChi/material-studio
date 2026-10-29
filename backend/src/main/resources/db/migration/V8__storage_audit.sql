CREATE TABLE storage_audit (
 id CHAR(36) PRIMARY KEY, relative_path VARCHAR(150) NOT NULL, size_bytes BIGINT NOT NULL,
 status VARCHAR(20) NOT NULL, created_at TIMESTAMP(6) NOT NULL, purged_at TIMESTAMP(6),
 CHECK(status IN ('QUARANTINED','DELETING','PURGED')), CHECK(size_bytes>=0)
);

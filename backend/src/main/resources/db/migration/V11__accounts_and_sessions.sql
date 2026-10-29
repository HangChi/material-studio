CREATE TABLE local_account (
 user_id CHAR(36) PRIMARY KEY,username VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 password_hash CHAR(64) NOT NULL,salt VARCHAR(32) NOT NULL,recovery_hash CHAR(64) NOT NULL,created_at TIMESTAMP(6) NOT NULL,
 FOREIGN KEY(user_id) REFERENCES demo_user(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE identity_session (
 token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,user_id CHAR(36) NOT NULL,
 created_at TIMESTAMP(6) NOT NULL,expires_at TIMESTAMP(6) NOT NULL,revoked_at TIMESTAMP(6),
 FOREIGN KEY(user_id) REFERENCES demo_user(id),INDEX ix_session_owner(user_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT INTO identity_session(token_hash,user_id,created_at,expires_at)
 SELECT token_hash,id,created_at,DATE_ADD(created_at,INTERVAL 365 DAY) FROM demo_user WHERE active=TRUE;
CREATE TABLE auth_attempt (
 username VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,failures INT NOT NULL DEFAULT 0,window_started TIMESTAMP(6) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

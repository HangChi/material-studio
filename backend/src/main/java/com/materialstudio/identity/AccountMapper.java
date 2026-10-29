package com.materialstudio.identity;
import org.apache.ibatis.annotations.*;
import java.time.Instant;
@Mapper
public interface AccountMapper {
 record Account(String userId,String username,String passwordHash,String salt,String recoveryHash,Instant createdAt){}
 record Attempt(String username,int failures,Instant windowStarted){}
 @Select("SELECT * FROM local_account WHERE username=#{name}") Account byName(String name);
 @Select("SELECT * FROM local_account WHERE user_id=#{id}") Account byUser(String id);
 @Select("SELECT * FROM local_account WHERE user_id=#{id} FOR UPDATE") Account lock(String id);
 @Insert("INSERT INTO local_account(user_id,username,password_hash,salt,recovery_hash,created_at) VALUES(#{userId},#{username},#{passwordHash},#{salt},#{recoveryHash},#{createdAt})") void insert(Account account);
 @Update("UPDATE local_account SET password_hash=#{passwordHash},salt=#{salt},recovery_hash=#{recoveryHash} WHERE user_id=#{userId}") void reset(Account account);
 @Insert("INSERT IGNORE INTO auth_attempt(username,failures,window_started) VALUES(#{name},0,CURRENT_TIMESTAMP(6))") void ensureAttempt(String name);
 @Select("SELECT * FROM auth_attempt WHERE username=#{name} FOR UPDATE") Attempt attempt(String name);
 @Update("UPDATE auth_attempt SET failures=0,window_started=CURRENT_TIMESTAMP(6) WHERE username=#{name}") void clearAttempts(String name);
 @Update("UPDATE auth_attempt SET failures=failures+1 WHERE username=#{name}") void failed(String name);
 @Select("SELECT COUNT(*) FROM job WHERE owner_id=#{source} AND status IN ('QUEUED','RUNNING')") int pending(String source);
 @Select("SELECT COUNT(*) FROM job_request s JOIN job_request t ON s.request_key=t.request_key WHERE s.owner_id=#{source} AND t.owner_id=#{target}") int receiptConflicts(@Param("source")String source,@Param("target")String target);
 @Select("SELECT COUNT(*) FROM creation_batch s JOIN creation_batch t ON s.request_key=t.request_key WHERE s.owner_id=#{source} AND t.owner_id=#{target}") int batchConflicts(@Param("source")String source,@Param("target")String target);
 @Update("UPDATE asset SET owner_id=#{target} WHERE owner_id=#{source}") void moveAssets(@Param("source")String source,@Param("target")String target);
 @Update("UPDATE job SET owner_id=#{target} WHERE owner_id=#{source}") void moveJobs(@Param("source")String source,@Param("target")String target);
 @Update("UPDATE creation_batch SET owner_id=#{target} WHERE owner_id=#{source}") void moveBatches(@Param("source")String source,@Param("target")String target);
 @Update("UPDATE job_request SET owner_id=#{target} WHERE owner_id=#{source}") void moveReceipts(@Param("source")String source,@Param("target")String target);
}

package com.materialstudio.job;
import org.apache.ibatis.annotations.*;
import java.time.Instant;
import java.util.List;
@Mapper
public interface ExecutionMapper {
 record Runtime(int attemptCount,Instant availableAt){}
 record Lease(String leaseOwner,long leaseGeneration,Instant leaseUntil,boolean alive){}
 @Select("SELECT lease_owner,lease_generation,lease_until,COALESCE(lease_until>CURRENT_TIMESTAMP(6),FALSE) AS alive FROM job_runtime WHERE job_id=#{id}") Lease lease(String id);
 @Update("UPDATE job_runtime SET lease_owner=#{owner},lease_generation=lease_generation+1,lease_until=TIMESTAMPADD(MICROSECOND,#{millis}*1000,CURRENT_TIMESTAMP(6)) WHERE job_id=#{id}") void claim(@Param("id") String id,@Param("owner") String owner,@Param("millis") long millis);
 @Update("UPDATE job_runtime SET lease_until=TIMESTAMPADD(MICROSECOND,#{millis}*1000,CURRENT_TIMESTAMP(6)) WHERE job_id=#{claim.id} AND lease_owner=#{claim.owner} AND lease_generation=#{claim.generation} AND lease_until>CURRENT_TIMESTAMP(6)") int renew(@Param("claim") LeaseGuard.Claim claim,@Param("millis") long millis);
 @Update("UPDATE job_runtime SET lease_until=NULL WHERE job_id=#{id} AND lease_owner=#{owner} AND lease_generation=#{generation}") void release(LeaseGuard.Claim claim);
 @Update("UPDATE job_runtime SET lease_until=NULL WHERE job_id=#{id} AND (lease_until IS NULL OR lease_until<=CURRENT_TIMESTAMP(6))") void clearExpired(String id);
 @Insert("INSERT IGNORE INTO job_runtime(job_id) VALUES(#{id})") void ensure(String id);
 @Select("SELECT attempt_count,available_at FROM job_runtime WHERE job_id=#{id}") Runtime runtime(String id);
 @Update("UPDATE job_runtime SET attempt_count=attempt_count+1,available_at=NULL WHERE job_id=#{id} AND attempt_count < 3") int begin(String id);
 @Update("UPDATE job_runtime SET available_at=#{time} WHERE job_id=#{id}") void defer(@Param("id") String id,@Param("time") Instant time);
 @Select("SELECT job.id FROM job LEFT JOIN job_runtime r ON r.job_id=job.id WHERE (r.lease_until IS NULL OR r.lease_until<=CURRENT_TIMESTAMP(6)) AND ((status='QUEUED' AND (r.available_at IS NULL OR r.available_at<=CURRENT_TIMESTAMP(6))) OR status='RUNNING') ORDER BY created_at,id LIMIT 64") List<String> ready();
}

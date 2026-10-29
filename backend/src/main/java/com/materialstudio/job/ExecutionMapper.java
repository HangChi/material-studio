package com.materialstudio.job;
import org.apache.ibatis.annotations.*;
import java.time.Instant;
import java.util.List;
@Mapper
public interface ExecutionMapper {
 record Runtime(int attemptCount,Instant availableAt){}
 @Insert("INSERT IGNORE INTO job_runtime(job_id) VALUES(#{id})") void ensure(String id);
 @Select("SELECT attempt_count,available_at FROM job_runtime WHERE job_id=#{id}") Runtime runtime(String id);
 @Update("UPDATE job_runtime SET attempt_count=attempt_count+1,available_at=NULL WHERE job_id=#{id} AND attempt_count < 3") int begin(String id);
 @Update("UPDATE job_runtime SET available_at=#{time} WHERE job_id=#{id}") void defer(@Param("id") String id,@Param("time") Instant time);
 @Select("SELECT job.id FROM job LEFT JOIN job_runtime r ON r.job_id=job.id WHERE status='QUEUED' AND (r.available_at IS NULL OR r.available_at <= CURRENT_TIMESTAMP(6)) ORDER BY created_at,id LIMIT 64") List<String> ready();
}

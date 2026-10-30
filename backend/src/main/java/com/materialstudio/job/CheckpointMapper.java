package com.materialstudio.job;
import org.apache.ibatis.annotations.*;
import java.time.Instant;
@Mapper
public interface CheckpointMapper {
 record Checkpoint(String jobId,String stage,String inputHash,String artifactPath,String artifactHash,Instant createdAt){}
 @Select("SELECT job_id,stage,input_hash,artifact_path,artifact_hash,created_at FROM job_checkpoint WHERE job_id=#{id} AND stage=#{stage}") Checkpoint find(@Param("id") String id,@Param("stage") String stage);
 @Insert("INSERT INTO job_checkpoint(job_id,stage,input_hash,artifact_path,artifact_hash,created_at) VALUES(#{jobId},#{stage},#{inputHash},#{artifactPath},#{artifactHash},#{createdAt}) ON DUPLICATE KEY UPDATE input_hash=VALUES(input_hash),artifact_path=VALUES(artifact_path),artifact_hash=VALUES(artifact_hash),created_at=VALUES(created_at)") void save(Checkpoint checkpoint);
 @Delete("DELETE FROM job_checkpoint WHERE job_id=#{id}") void delete(String id);
}

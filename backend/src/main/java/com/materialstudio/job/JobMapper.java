package com.materialstudio.job;
import org.apache.ibatis.annotations.*;
import java.time.Instant;
import java.util.List;
@Mapper
public interface JobMapper {
    String COLUMNS="id,owner_id,template_id,template_title,status,stage,version,created_at,updated_at,finished_at,result_path,error_code,error_message,(SELECT display_name FROM job_library WHERE job_id=job.id) AS display_name,COALESCE((SELECT favorite FROM job_library WHERE job_id=job.id),FALSE) AS favorite,COALESCE((SELECT hidden FROM job_library WHERE job_id=job.id),FALSE) AS hidden,CASE WHEN status='QUEUED' THEN (SELECT COUNT(*) FROM job ahead WHERE ahead.status IN ('QUEUED','RUNNING') AND (ahead.created_at < job.created_at OR (ahead.created_at=job.created_at AND ahead.id < job.id))) ELSE NULL END AS queue_ahead,COALESCE((SELECT attempt_count FROM job_runtime WHERE job_id=job.id),0) AS attempt,(SELECT available_at FROM job_runtime WHERE job_id=job.id) AS next_attempt_at";
    String XML_COLUMNS="id,owner_id,template_id,template_title,status,stage,version,created_at,updated_at,finished_at,result_path,error_code,error_message,(SELECT display_name FROM job_library WHERE job_id=job.id) AS display_name,COALESCE((SELECT favorite FROM job_library WHERE job_id=job.id),FALSE) AS favorite,COALESCE((SELECT hidden FROM job_library WHERE job_id=job.id),FALSE) AS hidden,CASE WHEN status='QUEUED' THEN (SELECT COUNT(*) FROM job ahead WHERE ahead.status IN ('QUEUED','RUNNING') AND (ahead.created_at &lt; job.created_at OR (ahead.created_at=job.created_at AND ahead.id &lt; job.id))) ELSE NULL END AS queue_ahead,COALESCE((SELECT attempt_count FROM job_runtime WHERE job_id=job.id),0) AS attempt,(SELECT available_at FROM job_runtime WHERE job_id=job.id) AS next_attempt_at";
    @Insert("INSERT INTO job(id,owner_id,template_id,template_title,status,version,created_at,updated_at) VALUES(#{id},#{ownerId},#{templateId},#{templateTitle},'QUEUED',0,#{createdAt},#{updatedAt})")
    void insert(JobRow row);
    @Insert("INSERT INTO job_asset(job_id,asset_id,slot_index) VALUES(#{jobId},#{assetId},#{slot})")
    void link(@Param("jobId") String jobId,@Param("assetId") String assetId,@Param("slot") int slot);
    @Select("SELECT "+COLUMNS+" FROM job WHERE id=#{id} AND owner_id=#{ownerId}")
    JobRow owned(@Param("id") String id,@Param("ownerId") String ownerId);
    @Select("SELECT "+COLUMNS+" FROM job WHERE owner_id=#{ownerId} ORDER BY created_at DESC,id DESC LIMIT 50")
    List<JobRow> recent(String ownerId);
    @Update("UPDATE job SET status='FAILED',version=version+1,updated_at=#{now},finished_at=#{now},error_code=#{code},error_message=#{message} WHERE id=#{id} AND status='QUEUED'")
    void failQueued(@Param("id") String id,@Param("code") String code,@Param("message") String message,@Param("now") Instant now);
    @Select({"<script>SELECT "+XML_COLUMNS+" FROM job WHERE owner_id=#{ownerId}",
        "<if test='time != null'> AND (created_at &lt; #{time} OR (created_at=#{time} AND id &lt; #{cursor}))</if>",
        "ORDER BY created_at DESC,id DESC LIMIT #{count}</script>"})
    List<JobRow> page(@Param("ownerId") String ownerId,@Param("time") Instant time,@Param("cursor") String cursor,@Param("count") int count);
    @Select("SELECT "+COLUMNS+" FROM job WHERE owner_id=#{ownerId} AND status IN ('QUEUED','RUNNING') ORDER BY created_at DESC,id DESC")
    List<JobRow> active(String ownerId);
}

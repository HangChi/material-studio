package com.materialstudio.job;
import org.apache.ibatis.annotations.*;
import java.time.Instant;
import java.util.List;
@Mapper
public interface JobMapper {
    String ROW_COLUMNS = "job.id,job.owner_id,job.template_id,job.template_title,job.status,job.stage,job.version,"
            + "job.created_at,job.updated_at,job.finished_at,job.result_path,job.error_code,job.error_message,";
    String QUEUE_COLUMNS = "CASE WHEN job.status='QUEUED' THEN (SELECT COUNT(*) FROM job ahead "
            + "WHERE ahead.status IN ('QUEUED','RUNNING') AND (job.created_at > ahead.created_at "
            + "OR (ahead.created_at=job.created_at AND job.id > ahead.id))) ELSE NULL END AS queue_ahead,";
    // The locking mapper keeps its original single-table lock boundary.
    String COLUMNS = ROW_COLUMNS
            + "(SELECT display_name FROM job_library WHERE job_id=job.id) AS display_name,"
            + "COALESCE((SELECT favorite FROM job_library WHERE job_id=job.id),FALSE) AS favorite,"
            + "COALESCE((SELECT hidden FROM job_library WHERE job_id=job.id),FALSE) AS hidden,"
            + QUEUE_COLUMNS
            + "COALESCE((SELECT attempt_count FROM job_runtime WHERE job_id=job.id),0) AS attempt,"
            + "(SELECT available_at FROM job_runtime WHERE job_id=job.id) AS next_attempt_at";
    String READ_COLUMNS = ROW_COLUMNS
            + "library.display_name,COALESCE(library.favorite,FALSE) AS favorite,"
            + "COALESCE(library.hidden,FALSE) AS hidden," + QUEUE_COLUMNS
            + "COALESCE(runtime.attempt_count,0) AS attempt,runtime.available_at AS next_attempt_at";
    String READ_FROM = " FROM job LEFT JOIN job_library library ON library.job_id=job.id"
            + " LEFT JOIN job_runtime runtime ON runtime.job_id=job.id ";
    @Insert("INSERT INTO job(id,owner_id,template_id,template_title,status,version,created_at,updated_at) VALUES(#{id},#{ownerId},#{templateId},#{templateTitle},'QUEUED',0,#{createdAt},#{updatedAt})")
    void insert(JobRow row);
    @Insert("INSERT INTO job_asset(job_id,asset_id,slot_index) VALUES(#{jobId},#{assetId},#{slot})")
    void link(@Param("jobId") String jobId,@Param("assetId") String assetId,@Param("slot") int slot);
    @Select("SELECT "+READ_COLUMNS+READ_FROM+"WHERE id=#{id} AND owner_id=#{ownerId}")
    JobRow owned(@Param("id") String id,@Param("ownerId") String ownerId);
    @Select("SELECT "+READ_COLUMNS+READ_FROM+"WHERE owner_id=#{ownerId} ORDER BY created_at DESC,id DESC LIMIT 50")
    List<JobRow> recent(String ownerId);
    @Update("UPDATE job SET status='FAILED',version=version+1,updated_at=#{now},finished_at=#{now},error_code=#{code},error_message=#{message} WHERE id=#{id} AND status='QUEUED'")
    void failQueued(@Param("id") String id,@Param("code") String code,@Param("message") String message,@Param("now") Instant now);
    @Select({"<script>SELECT "+READ_COLUMNS+READ_FROM+"WHERE owner_id=#{ownerId}",
        "<if test='time != null'> AND (created_at &lt; #{time} OR (created_at=#{time} AND id &lt; #{cursor}))</if>",
        "ORDER BY created_at DESC,id DESC LIMIT #{count}</script>"})
    List<JobRow> page(@Param("ownerId") String ownerId,@Param("time") Instant time,@Param("cursor") String cursor,@Param("count") int count);
    @Select("SELECT "+READ_COLUMNS+READ_FROM+"WHERE owner_id=#{ownerId} AND status IN ('QUEUED','RUNNING') ORDER BY created_at DESC,id DESC")
    List<JobRow> active(String ownerId);
    @Select({"<script>SELECT "+READ_COLUMNS+READ_FROM+"WHERE owner_id=#{owner} AND id IN <foreach collection='ids' item='id' open='(' separator=',' close=')'>#{id}</foreach> ORDER BY id</script>"})
    List<JobRow> ownedMany(@Param("owner") String owner,@Param("ids") List<String> ids);
}

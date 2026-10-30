package com.materialstudio.job;
import org.apache.ibatis.annotations.*;
import java.util.List;
import java.time.Instant;
@Mapper
public interface LibraryMapper {
 record Metadata(String jobId,String displayName,boolean favorite,boolean hidden){}
 @Select("SELECT job_id,display_name,favorite,hidden FROM job_library WHERE job_id=#{id}") Metadata find(String id);
 @Insert("INSERT INTO job_library(job_id,display_name,favorite,hidden) VALUES(#{jobId},#{displayName},#{favorite},#{hidden}) ON DUPLICATE KEY UPDATE display_name=VALUES(display_name),favorite=VALUES(favorite),hidden=VALUES(hidden)") void save(Metadata value);
 @Update("UPDATE job SET version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE id=#{id}") void touch(String id);
 @Select({"<script>SELECT "+JobMapper.READ_COLUMNS+JobMapper.READ_FROM+"WHERE owner_id=#{owner}",
  "AND COALESCE(library.hidden,FALSE)=#{filter.hidden}",
  "<if test='filter.tag != null'> AND EXISTS(SELECT 1 FROM job_tag jt WHERE jt.job_id=job.id AND jt.tag=#{filter.tag})</if>",
  "<if test='filter.q != null'> AND (LOCATE(#{filter.q},template_title) &gt; 0 OR LOCATE(#{filter.q},COALESCE(library.display_name,'')) &gt; 0)</if>",
  "<if test='filter.templateId != null'> AND template_id=#{filter.templateId}</if>",
  "<if test='filter.status != null and filter.status != &quot;CANCELLED&quot;'> AND status=#{filter.status}<if test='filter.status == &quot;FAILED&quot;'> AND error_code != 'JOB_CANCELLED'</if></if>",
  "<if test='filter.status == &quot;CANCELLED&quot;'> AND error_code='JOB_CANCELLED'</if>",
  "<if test='filter.favorite != null'> AND COALESCE(library.favorite,FALSE)=#{filter.favorite}</if>",
  "<if test='filter.from != null'> AND created_at &gt;= #{filter.from}</if><if test='filter.to != null'> AND created_at &lt; #{filter.to}</if>",
  "<if test='time != null'> AND (created_at &lt; #{time} OR (created_at=#{time} AND id &lt; #{cursor}))</if>",
  "ORDER BY created_at DESC,id DESC LIMIT #{count}</script>"})
 List<JobRow> page(@Param("owner") String owner,@Param("filter") HistoryService.Filter filter,@Param("time") Instant time,@Param("cursor") String cursor,@Param("count") int count);
}

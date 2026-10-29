package com.materialstudio.job;
import org.apache.ibatis.annotations.*;
import java.util.List;
@Mapper
public interface TagMapper {
 @Select("SELECT tag FROM job_tag WHERE job_id=#{id} ORDER BY tag") List<String> tags(String id);
 @Delete("DELETE FROM job_tag WHERE job_id=#{id}") void clear(String id);
 @Insert("INSERT INTO job_tag(job_id,tag) VALUES(#{id},#{tag})") void add(@Param("id")String id,@Param("tag")String tag);
}

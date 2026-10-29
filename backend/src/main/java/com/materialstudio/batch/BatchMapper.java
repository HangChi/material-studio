package com.materialstudio.batch;
import org.apache.ibatis.annotations.*;
import java.time.Instant;
import java.util.List;
@Mapper
public interface BatchMapper {
 record Row(String id,String ownerId,String name,String requestKey,String fingerprint,Instant createdAt){}
 @Insert("INSERT INTO creation_batch(id,owner_id,name,request_key,fingerprint,created_at) VALUES(#{id},#{ownerId},#{name},#{requestKey},#{fingerprint},#{createdAt})") void insert(Row row);
 @Insert("INSERT INTO batch_job(batch_id,job_id,slot_index) VALUES(#{batch},#{job},#{slot})") void link(@Param("batch")String batch,@Param("job")String job,@Param("slot")int slot);
 @Select("SELECT * FROM creation_batch WHERE id=#{id} AND owner_id=#{owner}") Row owned(@Param("id")String id,@Param("owner")String owner);
 @Select("SELECT * FROM creation_batch WHERE owner_id=#{owner} AND request_key=#{key}") Row receipt(@Param("owner")String owner,@Param("key")String key);
 @Select("SELECT job_id FROM batch_job WHERE batch_id=#{id} ORDER BY slot_index") List<String> children(String id);
 @Select({"<script>SELECT * FROM creation_batch WHERE owner_id=#{owner}","<if test='time != null'> AND (created_at &lt; #{time} OR (created_at=#{time} AND id &lt; #{cursor}))</if>","ORDER BY created_at DESC,id DESC LIMIT #{limit}</script>"}) List<Row> page(@Param("owner")String owner,@Param("time")Instant time,@Param("cursor")String cursor,@Param("limit")int limit);
}

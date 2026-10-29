package com.materialstudio.asset;
import org.apache.ibatis.annotations.*;
@Mapper
public interface AssetMapper {
    @Insert("INSERT INTO asset(id,owner_id,storage_filename,mime_type,size_bytes,created_at) VALUES(#{id},#{ownerId},#{storageFilename},#{mimeType},#{sizeBytes},#{createdAt})")
    void insert(AssetRow asset);
    @Select("SELECT id,owner_id,storage_filename,mime_type,size_bytes,created_at FROM asset WHERE id=#{id} AND owner_id=#{ownerId}")
    AssetRow findOwned(@Param("id") String id, @Param("ownerId") String ownerId);
    @Select({"<script>SELECT id,owner_id,storage_filename,mime_type,size_bytes,created_at FROM asset WHERE owner_id=#{owner}","<if test='time != null'> AND (created_at &lt; #{time} OR (created_at=#{time} AND id &lt; #{cursor}))</if>","ORDER BY created_at DESC,id DESC LIMIT #{count}</script>"})
    java.util.List<AssetRow> page(@Param("owner") String owner,@Param("time") java.time.Instant time,@Param("cursor") String cursor,@Param("count") int count);
}

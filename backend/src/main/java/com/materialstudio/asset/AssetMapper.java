package com.materialstudio.asset;
import org.apache.ibatis.annotations.*;
@Mapper
public interface AssetMapper {
    @Insert("INSERT INTO asset(id,owner_id,storage_filename,mime_type,size_bytes,created_at) VALUES(#{id},#{ownerId},#{storageFilename},#{mimeType},#{sizeBytes},#{createdAt})")
    void insert(AssetRow asset);
    @Select("SELECT id,owner_id,storage_filename,mime_type,size_bytes,created_at FROM asset WHERE id=#{id} AND owner_id=#{ownerId}")
    AssetRow findOwned(@Param("id") String id, @Param("ownerId") String ownerId);
}

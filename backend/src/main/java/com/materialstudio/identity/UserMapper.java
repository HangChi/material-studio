package com.materialstudio.identity;
import org.apache.ibatis.annotations.*;

@Mapper
public interface UserMapper {
    @Select("SELECT id,token_hash,created_at,active FROM demo_user WHERE token_hash=#{hash} AND active=TRUE")
    DemoUser find(String hash);
    @Insert("INSERT INTO demo_user(id,token_hash,created_at,active) VALUES(#{id},#{tokenHash},#{createdAt},TRUE)")
    void insert(DemoUser user);
    @Update("UPDATE demo_user SET active=FALSE WHERE token_hash=#{hash}")
    void revoke(String hash);
}

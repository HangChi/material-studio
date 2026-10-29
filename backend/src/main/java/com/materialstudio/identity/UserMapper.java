package com.materialstudio.identity;
import org.apache.ibatis.annotations.*;

@Mapper
public interface UserMapper {
    @Select("SELECT u.id,s.token_hash,u.created_at,u.active FROM identity_session s JOIN demo_user u ON u.id=s.user_id WHERE s.token_hash=#{hash} AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP(6) AND u.active=TRUE")
    DemoUser find(String hash);
    @Insert("INSERT INTO demo_user(id,token_hash,created_at,active) VALUES(#{id},#{tokenHash},#{createdAt},TRUE)")
    void insert(DemoUser user);
    @Update("UPDATE identity_session SET revoked_at=CURRENT_TIMESTAMP(6) WHERE token_hash=#{hash}")
    void revoke(String hash);
    @Insert("INSERT INTO identity_session(token_hash,user_id,created_at,expires_at) VALUES(#{hash},#{owner},CURRENT_TIMESTAMP(6),#{expires})")
    void addSession(@Param("hash")String hash,@Param("owner")String owner,@Param("expires")java.time.Instant expires);
    @Update("UPDATE identity_session SET revoked_at=CURRENT_TIMESTAMP(6) WHERE user_id=#{owner} AND revoked_at IS NULL") void revokeAll(String owner);
    @Update("UPDATE demo_user SET active=FALSE WHERE id=#{owner}") void disable(String owner);
}

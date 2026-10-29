package com.materialstudio.job;

import org.apache.ibatis.annotations.*;

@Mapper
public interface CreationMapper {
    record Receipt(String fingerprint,String jobId) {}
    record Recipe(String jobId,String parametersJson,String sourceJobId) {}
    @Select("SELECT id FROM demo_user WHERE id=#{owner} AND active=TRUE FOR UPDATE")
    String lockOwner(String owner);
    @Select("SELECT fingerprint,job_id FROM job_request WHERE owner_id=#{owner} AND request_key=#{key}")
    Receipt receipt(@Param("owner") String owner,@Param("key") String key);
    @Insert("INSERT INTO job_request(owner_id,request_key,fingerprint,job_id) VALUES(#{owner},#{key},#{fingerprint},#{job})")
    void remember(@Param("owner") String owner,@Param("key") String key,@Param("fingerprint") String fingerprint,@Param("job") String job);
    @Insert("INSERT INTO job_recipe(job_id,parameters_json,source_job_id) VALUES(#{jobId},#{parametersJson},#{sourceJobId})")
    void save(Recipe recipe);
    @Select("SELECT job_id,CAST(parameters_json AS CHAR) AS parameters_json,source_job_id FROM job_recipe WHERE job_id=#{id}")
    Recipe recipe(String id);
}

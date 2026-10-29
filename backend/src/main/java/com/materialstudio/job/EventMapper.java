package com.materialstudio.job;

import org.apache.ibatis.annotations.*;
import java.time.Instant;
import java.util.List;

@Mapper
public interface EventMapper {
    record Event(long version,String stage,String kind,Instant createdAt,String message) {}
    record Transition(String id,String status,String stage,long version,Instant now,Instant finishedAt,String resultPath,String errorCode,String errorMessage) {}
    @Insert("INSERT INTO job_execution(job_id,fail_stage,check_ms,generate_ms,finalize_ms) VALUES(#{jobId},#{failStage},#{checkMs},#{generateMs},#{finalizeMs})")
    void configure(Simulation.Execution execution);
    @Select("SELECT job_id,fail_stage,check_ms,generate_ms,finalize_ms FROM job_execution WHERE job_id=#{id}")
    Simulation.Execution configuration(String id);
    @Select("SELECT "+JobMapper.COLUMNS+" FROM job WHERE id=#{id}") JobRow find(String id);
    @Select("SELECT "+JobMapper.COLUMNS+" FROM job WHERE id=#{id} FOR UPDATE") JobRow lock(String id);
    @Select("SELECT id FROM job WHERE status IN ('QUEUED','RUNNING') ORDER BY created_at,id") List<String> unfinished();
    @Select("SELECT asset_id FROM job_asset WHERE job_id=#{id} ORDER BY slot_index") List<String> assetIds(String id);
    @Select("SELECT version,stage,kind,created_at,message FROM job_event WHERE job_id=#{id} ORDER BY version") List<Event> events(String id);
    @Update("UPDATE job SET status=#{status},stage=#{stage},version=#{version},updated_at=#{now},finished_at=#{finishedAt},result_path=#{resultPath},error_code=#{errorCode},error_message=#{errorMessage} WHERE id=#{id}")
    void update(Transition transition);
    @Insert("INSERT INTO job_event(job_id,version,stage,kind,created_at,message) VALUES(#{id},#{event.version},#{event.stage},#{event.kind},#{event.createdAt},#{event.message})")
    void append(@Param("id") String id,@Param("event") Event event);
}

package com.materialstudio.job;

import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface OperationsMapper {
    record Counts(long queued,long running,long succeeded,long failed,long cancelled) {}
    record Timing(long samples,double totalMs,double averageMs) {}
    record StageTiming(String stage,long samples,double totalMs,double averageMs) {}

    @Select("SELECT COUNT(CASE WHEN status='QUEUED' THEN 1 END) AS queued,"+
            "COUNT(CASE WHEN status='RUNNING' THEN 1 END) AS running,"+
            "COUNT(CASE WHEN status='SUCCEEDED' THEN 1 END) AS succeeded,"+
            "COUNT(CASE WHEN status='FAILED' AND error_code != 'JOB_CANCELLED' THEN 1 END) AS failed,"+
            "COUNT(CASE WHEN error_code='JOB_CANCELLED' THEN 1 END) AS cancelled FROM job")
    Counts counts();

    @Select("SELECT COUNT(*) AS samples,"+
            "COALESCE(SUM(GREATEST(0,TIMESTAMPDIFF(MICROSECOND,j.created_at,e.first_started)/1000.0)),0) AS total_ms,"+
            "COALESCE(AVG(GREATEST(0,TIMESTAMPDIFF(MICROSECOND,j.created_at,e.first_started)/1000.0)),0) AS average_ms "+
            "FROM job j JOIN (SELECT job_id,MIN(created_at) AS first_started FROM job_event "+
            "WHERE kind='STARTED' AND stage='ASSET_CHECK' GROUP BY job_id) e ON e.job_id=j.id")
    Timing queue();

    @Select("SELECT done.stage,COUNT(*) AS samples,"+
            "SUM(GREATEST(0,TIMESTAMPDIFF(MICROSECOND,started.created_at,done.created_at)/1000.0)) AS total_ms,"+
            "AVG(GREATEST(0,TIMESTAMPDIFF(MICROSECOND,started.created_at,done.created_at)/1000.0)) AS average_ms "+
            "FROM job_event done JOIN job_event started ON started.job_id=done.job_id "+
            "AND started.version=(SELECT MAX(previous.version) FROM job_event previous WHERE previous.job_id=done.job_id AND previous.version < done.version) "+
            "AND started.stage=done.stage AND started.kind='STARTED' WHERE done.kind='COMPLETED' "+
            "GROUP BY done.stage ORDER BY done.stage")
    List<StageTiming> stages();

    @Select("SELECT COALESCE(SUM(GREATEST(attempt_count-1,0)),0) FROM job_runtime")
    long retries();
}

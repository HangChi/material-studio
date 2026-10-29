package com.materialstudio.job;

import org.apache.ibatis.annotations.*;

@Mapper
public interface AdmissionMapper {
    @Select("SELECT id FROM admission_lock WHERE id=1 FOR UPDATE")
    int lock();

    @Select("SELECT COUNT(*) FROM job WHERE status IN ('QUEUED','RUNNING')")
    int pending();

    @Select("SELECT COUNT(*) FROM job WHERE owner_id=#{owner} AND status IN ('QUEUED','RUNNING')")
    int pendingFor(String owner);

    @Select("SELECT COUNT(*) FROM job WHERE owner_id=#{owner} AND created_at > DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 60 SECOND)")
    int recentFor(String owner);
}

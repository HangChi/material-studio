package com.materialstudio.storage;
import org.apache.ibatis.annotations.*;
import java.time.Instant;
import java.util.List;
@Mapper
public interface StorageMapper {
 record Audit(String id,String path,long sizeBytes,String status,Instant createdAt,Instant purgedAt){}
 String COLUMNS="id,relative_path AS path,size_bytes,status,created_at,purged_at";
 @Select("SELECT storage_filename FROM asset UNION SELECT CONCAT('results/',result_path) FROM job WHERE result_path IS NOT NULL UNION SELECT CONCAT('results/',id,'.png') FROM job WHERE status IN ('QUEUED','RUNNING') UNION SELECT CONCAT('.checkpoints/',artifact_path) FROM job_checkpoint WHERE artifact_path IS NOT NULL") List<String> protectedPaths();
 @Insert("INSERT INTO storage_audit(id,relative_path,size_bytes,status,created_at) VALUES(#{id},#{path},#{sizeBytes},'QUARANTINED',#{createdAt})") void insert(Audit audit);
 @Select("SELECT "+COLUMNS+" FROM storage_audit ORDER BY created_at DESC,id DESC LIMIT 100") List<Audit> audit();
 @Select("SELECT "+COLUMNS+" FROM storage_audit WHERE (status='QUARANTINED' AND created_at <= DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 7 DAY)) OR status='DELETING' ORDER BY id") List<Audit> expired();
 @Update("UPDATE storage_audit SET status='DELETING' WHERE id=#{id} AND status IN ('QUARANTINED','DELETING')") void deleting(String id);
 @Update("UPDATE storage_audit SET status='PURGED',purged_at=CURRENT_TIMESTAMP(6) WHERE id=#{id} AND status='DELETING'") void purged(String id);
}

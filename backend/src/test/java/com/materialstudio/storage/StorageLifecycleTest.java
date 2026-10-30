package com.materialstudio.storage;
import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.materialstudio.job.JobDispatcher;
import java.nio.file.*;
import java.nio.file.attribute.FileTime;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
class StorageLifecycleTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 private final List<Path> fixtures=new ArrayList<>();
 @org.junit.jupiter.api.AfterEach void removeFixtures()throws Exception{for(Path p:fixtures)Files.deleteIfExists(p);}
 Path oldFile(String relative)throws Exception{Path file=STORAGE.resolve(relative);Files.createDirectories(file.getParent());Files.write(file,new byte[]{1,2,3});fixtures.add(file);Files.setLastModifiedTime(file,FileTime.from(Instant.now().minusSeconds(172800)));return file;}
 com.fasterxml.jackson.databind.JsonNode report(){var r=call("/actuator/storage",HttpMethod.GET,null,null);assertThat(r.getStatusCode().value()).isEqualTo(200);return r.getBody();}
 @Test void onlyOldOrphansAreCandidatesAndInventoryDoesNotModifyFiles()throws Exception{
  String cookie=session(),asset=asset(cookie),name=jdbc.queryForObject("SELECT storage_filename FROM asset WHERE id=?",String.class,asset);Path registered=STORAGE.resolve(name);Files.setLastModifiedTime(registered,FileTime.from(Instant.now().minusSeconds(172800)));
  var job=call("/api/jobs",HttpMethod.POST,cookie,Map.of("templateId","demo-portrait","assetIds",List.of(asset))).getBody().path("job");Path active=oldFile("results/"+job.path("id").asText()+".png");
  Path orphan=oldFile(UUID.randomUUID()+".png"),fresh=STORAGE.resolve(UUID.randomUUID()+".png");Files.write(fresh,new byte[]{9});fixtures.add(fresh);Path link=STORAGE.resolve(UUID.randomUUID()+".png");Files.createSymbolicLink(link,orphan);fixtures.add(0,link);
  var r=report();assertThat(r.path("candidates").size()).isEqualTo(1);assertThat(r.path("candidates").get(0).path("path").asText()).isEqualTo(orphan.getFileName().toString());
  assertThat(Files.exists(orphan)).isTrue();assertThat(Files.exists(registered)).isTrue();assertThat(Files.exists(active)).isTrue();assertThat(Files.isSymbolicLink(link)).isTrue();
 }
 @Test void staleOrUnconfirmedSnapshotsDoNotMoveFiles()throws Exception{
  Path a=oldFile(UUID.randomUUID()+".png");var snapshot=report().path("snapshot").asText();oldFile(UUID.randomUUID()+".png");
  assertThat(call("/actuator/storage/quarantine",HttpMethod.POST,null,Map.of("snapshot",snapshot,"confirm",true)).getStatusCode().value()).isEqualTo(409);
  assertThat(call("/actuator/storage/quarantine",HttpMethod.POST,null,Map.of("snapshot",report().path("snapshot").asText(),"confirm",false)).getStatusCode().value()).isEqualTo(422);assertThat(Files.exists(a)).isTrue();
 }
 @Test void quarantineRetainsBytesAndOnlyExpiredAuditCanBePurged()throws Exception{
  Path file=oldFile(UUID.randomUUID()+".png");var initial=report();
  assertThat(call("/actuator/storage/quarantine",HttpMethod.POST,null,Map.of("snapshot",initial.path("snapshot").asText(),"confirm",true)).getStatusCode().value()).isEqualTo(200);assertThat(Files.exists(file)).isFalse();
  var audit=call("/actuator/storage/audit",HttpMethod.GET,null,null).getBody().path("items");String id=java.util.stream.StreamSupport.stream(audit.spliterator(),false).filter(x->x.path("path").asText().equals(file.getFileName().toString())).findFirst().orElseThrow().path("id").asText();Path isolated=STORAGE.resolve(".quarantine/"+id);assertThat(Files.readAllBytes(isolated)).containsExactly(1,2,3);
  assertThat(report().path("expired").size()).isZero();jdbc.update("UPDATE storage_audit SET created_at=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 8 DAY) WHERE id=?",id);
  var expired=report();assertThat(call("/actuator/storage/purge",HttpMethod.POST,null,Map.of("snapshot",expired.path("purgeSnapshot").asText(),"confirm",true)).getStatusCode().value()).isEqualTo(200);
  assertThat(Files.exists(isolated)).isFalse();assertThat(jdbc.queryForObject("SELECT status FROM storage_audit WHERE id=?",String.class,id)).isEqualTo("PURGED");
 }
 @Test void rejectsPurgeSnapshotWhenQuarantinedBytesChanged()throws Exception{
  Path file=oldFile(UUID.randomUUID()+".png");var r=report();call("/actuator/storage/quarantine",HttpMethod.POST,null,Map.of("snapshot",r.path("snapshot").asText(),"confirm",true));String id=jdbc.queryForObject("SELECT id FROM storage_audit WHERE relative_path=?",String.class,file.getFileName().toString());jdbc.update("UPDATE storage_audit SET created_at=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 8 DAY) WHERE id=?",id);var before=report();Path isolated=STORAGE.resolve(".quarantine/"+id);Files.write(isolated,new byte[]{9,8});
  assertThat(call("/actuator/storage/purge",HttpMethod.POST,null,Map.of("snapshot",before.path("purgeSnapshot").asText(),"confirm",true)).getStatusCode().value()).isEqualTo(409);assertThat(Files.readAllBytes(isolated)).containsExactly(9,8);
  Files.deleteIfExists(isolated);jdbc.update("UPDATE storage_audit SET status='PURGED' WHERE id=?",id);
 }
 @Test void failedAuditInsertionRestoresMovedFile()throws Exception{
  Path file=oldFile(UUID.randomUUID()+".png");var snapshot=report().path("snapshot").asText();
  jdbc.execute("CREATE TRIGGER reject_storage_audit BEFORE INSERT ON storage_audit FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='audit outage'");
  try{assertThat(call("/actuator/storage/quarantine",HttpMethod.POST,null,Map.of("snapshot",snapshot,"confirm",true)).getStatusCode().value()).isEqualTo(500);assertThat(Files.exists(file)).isTrue();}
  finally{jdbc.execute("DROP TRIGGER IF EXISTS reject_storage_audit");}
 }
 @Test void checkpointInventoryProtectsRegisteredFilesAndListsOnlyOldOrphans()throws Exception{
  String cookie=session(),asset=asset(cookie),id=call("/api/jobs",HttpMethod.POST,cookie,Map.of("templateId","demo-portrait","assetIds",List.of(asset))).getBody().path("job").path("id").asText();
  Path registered=oldFile(".checkpoints/"+UUID.randomUUID()+".png"),orphan=oldFile(".checkpoints/"+UUID.randomUUID()+".png"),temporary=oldFile(".checkpoints/checkpoint-12345.part");
  jdbc.update("INSERT INTO job_checkpoint(job_id,stage,input_hash,artifact_path,artifact_hash,created_at) VALUES(?,'GENERATE',?,?,?,CURRENT_TIMESTAMP(6))",id,"0".repeat(64),registered.getFileName().toString(),"0".repeat(64));
  var paths=new ArrayList<String>();report().path("candidates").forEach(row->paths.add(row.path("path").asText()));
  assertThat(paths).contains(STORAGE.relativize(orphan).toString(),STORAGE.relativize(temporary).toString()).doesNotContain(STORAGE.relativize(registered).toString());
 }
}

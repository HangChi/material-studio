package com.materialstudio.job;

import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

class HistoryApiTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 private String owner(String cookie){return call("/api/session",HttpMethod.GET,cookie,null).getBody().path("user").path("id").asText();}
 private String seed(String owner,String status,Instant time){
  String id=UUID.randomUUID().toString();boolean terminal=status.equals("FAILED");boolean running=status.equals("RUNNING");
  jdbc.update("INSERT INTO job(id,owner_id,template_id,template_title,status,stage,version,created_at,updated_at,finished_at,error_code,error_message) VALUES(?,?,'demo-portrait','日光肖像',?,?,0,?,?,?,?,?)",
   id,owner,status,running?"ASSET_CHECK":null,Timestamp.from(time),Timestamp.from(time),terminal?Timestamp.from(time):null,terminal?"SIMULATED_FAILURE":null,terminal?"模拟失败":null);
  return id;
 }
 @Test void paginatesAllOwnedRecordsWithStableTiesAndNoDuplicatesAfterNewInsert(){
  String cookie=session(),owner=owner(cookie);Instant time=Instant.parse("2026-10-29T00:00:00Z");
  for(int n=0;n<55;n++)seed(owner,"FAILED",time);
  seed(owner(session()),"FAILED",time.plusSeconds(100));
  var expected=jdbc.queryForList("SELECT id FROM job WHERE owner_id=? ORDER BY created_at DESC,id DESC",String.class,owner);
  var first=call("/api/jobs?limit=7",HttpMethod.GET,cookie,null);
  assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);assertThat(first.getBody().path("items").size()).isEqualTo(7);
  assertThat(first.getHeaders().getCacheControl()).contains("no-store");
  List<String> seen=new ArrayList<>();first.getBody().path("items").forEach(job->seen.add(job.path("id").asText()));
  seed(owner,"FAILED",time.plusSeconds(60));
  String cursor=first.getBody().path("nextCursor").asText();int pages=1;
  while(cursor!=null){
   var page=call("/api/jobs?limit=7&cursor="+cursor,HttpMethod.GET,cookie,null).getBody();
   page.path("items").forEach(job->seen.add(job.path("id").asText()));cursor=page.path("nextCursor").isNull()?null:page.path("nextCursor").asText();
   assertThat(++pages).isLessThan(12);
  }
  assertThat(seen).containsExactlyElementsOf(expected).doesNotHaveDuplicates();
  assertThat(call("/api/jobs",HttpMethod.GET,cookie,null).getBody().path("items").size()).isEqualTo(20);
  assertThat(call("/api/jobs?limit=50",HttpMethod.GET,cookie,null).getBody().path("items").size()).isEqualTo(50);
 }
 @Test void validatesCursorLimitsAndIdentityWithoutLeakingOtherOwners(){
  String cookie=session(),foreign=seed(owner(session()),"FAILED",Instant.now());
  for(String query:List.of("limit=0","limit=51","limit=-1","limit=abc","limit=1.5","cursor=bad","cursor="+UUID.randomUUID(),"cursor="+foreign))
   assertThat(call("/api/jobs?"+query,HttpMethod.GET,cookie,null).getStatusCode().value()).as(query).isEqualTo(400);
  var empty=call("/api/jobs",HttpMethod.GET,cookie,null).getBody();assertThat(empty.path("items").isEmpty()).isTrue();assertThat(empty.path("nextCursor").isNull()).isTrue();
  assertThat(call("/api/jobs",HttpMethod.GET,null,null).getStatusCode().value()).isEqualTo(401);
 }
 @Test void activeIncludesOldUnfinishedJobsOnlyForOwnerAndQueriesNeverMutate(){
  String cookie=session(),owner=owner(cookie);Instant old=Instant.parse("2026-01-01T00:00:00Z");
  String queued=seed(owner,"QUEUED",old),running=seed(owner,"RUNNING",old.plusSeconds(1));
  for(int n=0;n<25;n++)seed(owner,"FAILED",old.plusSeconds(100+n));seed(owner(session()),"QUEUED",old);
  var before=jdbc.queryForList("SELECT * FROM job WHERE owner_id=? ORDER BY id",owner);
  var response=call("/api/jobs/active",HttpMethod.GET,cookie,null);assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
  List<String> ids=new ArrayList<>();response.getBody().path("items").forEach(job->ids.add(job.path("id").asText()));
  assertThat(ids).containsExactly(running,queued);assertThat(response.getBody().toString()).doesNotContain("ownerId","resultPath","token");
  for(int n=0;n<10;n++)call("/api/jobs/active",HttpMethod.GET,cookie,null);
  assertThat(jdbc.queryForList("SELECT * FROM job WHERE owner_id=? ORDER BY id",owner)).isEqualTo(before);
  verifyNoInteractions(dispatcher);
  assertThat(call("/api/jobs/active",HttpMethod.GET,null,null).getStatusCode().value()).isEqualTo(401);
 }
}

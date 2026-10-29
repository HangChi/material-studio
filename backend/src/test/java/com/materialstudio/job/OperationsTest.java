package com.materialstudio.job;

import com.materialstudio.ApiTestSupport;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.Mockito.*;

class OperationsTest extends ApiTestSupport {
 @MockitoBean PipelineWorker worker;
 JsonNode snapshot(){var response=call("/actuator/studio",HttpMethod.GET,null,null);assertThat(response.getStatusCode().value()).isEqualTo(200);assertThat(response.getHeaders().getFirst("Cache-Control")).contains("no-store");return response.getBody();}
 String seed(String owner,String status,String code,Instant time){
  String id=UUID.randomUUID().toString();jdbc.update("INSERT INTO job(id,owner_id,template_id,template_title,status,stage,version,created_at,updated_at,finished_at,result_path,error_code,error_message) VALUES(?,?,'demo-portrait','肖像',?,'FINALIZE',6,?,?,?,?,?,?)",id,owner,status,Timestamp.from(time),Timestamp.from(time.plusSeconds(7)),Timestamp.from(time.plusSeconds(7)),status.equals("SUCCEEDED")?id+".png":null,code,code==null?null:"测试原因");return id;
 }
 JsonNode stage(JsonNode snapshot,String stage){for(var row:snapshot.path("stages"))if(stage.equals(row.path("stage").asText()))return row;return com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();}
 @Test void aggregatesPersistedCountsCompletedStageDurationsAndAdditionalAttempts() {
  var before=snapshot();String cookie=session(),owner=call("/api/session",HttpMethod.GET,cookie,null).getBody().path("user").path("id").asText();Instant time=Instant.parse("2026-01-01T00:00:00Z");
  String id=seed(owner,"SUCCEEDED",null,time);seed(owner,"FAILED","SIMULATED_FAILURE",time);seed(owner,"FAILED","JOB_CANCELLED",time);
  String[] stages={"ASSET_CHECK","ASSET_CHECK","GENERATE","GENERATE","FINALIZE","FINALIZE"};int[] seconds={2,3,3,6,6,7};
  for(int n=0;n<6;n++)jdbc.update("INSERT INTO job_event(job_id,version,stage,kind,created_at,message) VALUES(?,?,?,?,?,'阶段样本')",id,n+1,stages[n],n%2==0?"STARTED":"COMPLETED",Timestamp.from(time.plusSeconds(seconds[n])));
  jdbc.update("INSERT INTO job_runtime(job_id,attempt_count) VALUES(?,3)",id);
  var after=snapshot();for(String key:List.of("succeeded","failed","cancelled"))assertThat(after.path("counts").path(key).asLong()-before.path("counts").path(key).asLong()).isEqualTo(1);
  assertThat(after.path("queue").path("samples").asLong()-before.path("queue").path("samples").asLong()).isEqualTo(1);
  assertThat(after.path("queue").path("totalMs").asDouble()-before.path("queue").path("totalMs").asDouble()).isCloseTo(2000,within(0.01));
  assertThat(stage(after,"GENERATE").path("totalMs").asDouble()-stage(before,"GENERATE").path("totalMs").asDouble()).isCloseTo(3000,within(0.01));
  assertThat(stage(after,"GENERATE").path("samples").asLong()-stage(before,"GENERATE").path("samples").asLong()).isEqualTo(1);
  assertThat(after.path("retries").asLong()-before.path("retries").asLong()).isEqualTo(2);
  double successes=after.path("counts").path("succeeded").asDouble(),failures=after.path("counts").path("failed").asDouble();
  assertThat(after.path("failureRate").asDouble()).isCloseTo(failures/(successes+failures),within(0.000001));
  assertThat(after.toString()).doesNotContain(id,owner,"ownerId","token","storageFilename");
 }
 @Test void measuresCompletedStagesAcrossMetadataVersionGapsAndExcludesUnfinishedSamples(){
  var before=snapshot();String cookie=session(),owner=call("/api/session",HttpMethod.GET,cookie,null).getBody().path("user").path("id").asText();Instant time=Instant.parse("2026-01-02T00:00:00Z");
  String id=seed(owner,"SUCCEEDED",null,time);
  jdbc.update("INSERT INTO job_event(job_id,version,stage,kind,created_at,message) VALUES(?,1,'GENERATE','STARTED',?,'开始')",id,Timestamp.from(time));
  jdbc.update("INSERT INTO job_event(job_id,version,stage,kind,created_at,message) VALUES(?,3,'GENERATE','COMPLETED',?,'完成')",id,Timestamp.from(time.plusSeconds(2)));
  String failed=seed(owner,"FAILED","SIMULATED_FAILURE",time);
  jdbc.update("INSERT INTO job_event(job_id,version,stage,kind,created_at,message) VALUES(?,1,'GENERATE','STARTED',?,'开始')",failed,Timestamp.from(time));
  jdbc.update("INSERT INTO job_event(job_id,version,stage,kind,created_at,message) VALUES(?,2,'GENERATE','FAILED',?,'失败')",failed,Timestamp.from(time.plusSeconds(1)));
  var after=snapshot();assertThat(stage(after,"GENERATE").path("samples").asLong()-stage(before,"GENERATE").path("samples").asLong()).isEqualTo(1);
  assertThat(stage(after,"GENERATE").path("totalMs").asDouble()-stage(before,"GENERATE").path("totalMs").asDouble()).isCloseTo(2000,within(0.01));
 }
 @Test void countsScannerFailuresAndContinuesAfterDatabaseRecovery() throws Exception {
  var execution=mock(ExecutionMapper.class);
  var dispatcher=new BackgroundJobDispatcher(mock(PipelineWorker.class),mock(PipelineState.class),execution,1,new QueueScanMonitor());
  try{
   dispatcher.run(null);
   doThrow(new org.springframework.dao.TransientDataAccessResourceException("injected scanner outage")).doReturn(List.of()).when(execution).ready();
   var scan=BackgroundJobDispatcher.class.getDeclaredMethod("scan");scan.setAccessible(true);
   scan.invoke(dispatcher);assertThat(dispatcher.scanSnapshot().failures()).isEqualTo(1);
   scan.invoke(dispatcher);assertThat(dispatcher.scanSnapshot().failures()).isEqualTo(1);assertThat(dispatcher.scanSnapshot().lastSuccessAt()).isNotNull();
  }finally{dispatcher.close();}
 }
}

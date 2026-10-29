package com.materialstudio.job;
import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.http.HttpMethod;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
@TestPropertySource(properties="studio.retry-backoff-ms=0")
class RecoveryTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 @MockitoSpyBean ResultStore results;
 @MockitoSpyBean EventMapper events;
 @Autowired PipelineWorker worker;
 String submit(String owner,boolean fail) throws Exception {
  var simulation=new HashMap<String,Object>();simulation.put("stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0));if(fail)simulation.put("failStage","GENERATE");
  return call("/api/jobs",HttpMethod.POST,owner,Map.of("templateId","demo-portrait","assetIds",List.of(asset(owner)),"simulation",simulation)).getBody().path("job").path("id").asText();
 }
 @Test void transientPublicationFailureRequeuesThenSucceedsWithSameId() throws Exception {
  String owner=session(),id=submit(owner,false);
  doThrow(new java.io.IOException("temporary disk error")).doCallRealMethod().when(results).publish(eq(id),any(java.awt.image.BufferedImage.class));
  worker.execute(id);var retry=call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job");assertThat(retry.path("status").asText()).isEqualTo("QUEUED");assertThat(retry.path("attempt").asInt()).isEqualTo(1);
  worker.execute(id);var done=call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job");assertThat(done.path("status").asText()).isEqualTo("SUCCEEDED");assertThat(done.path("attempt").asInt()).isEqualTo(2);
 }
 @Test void automaticRetriesStopAfterThreeExecutionsButSimulatedFailureDoesNotRetry() throws Exception {
  String owner=session(),id=submit(owner,false);doThrow(new java.io.IOException("persistent disk error")).when(results).publish(eq(id),any(java.awt.image.BufferedImage.class));
  for(int i=0;i<3;i++)worker.execute(id);var failed=call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job");assertThat(failed.path("status").asText()).isEqualTo("FAILED");assertThat(failed.path("attempt").asInt()).isEqualTo(3);worker.execute(id);assertThat(call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job")).isEqualTo(failed);
  String simulation=submit(owner,true);worker.execute(simulation);var fixed=call("/api/jobs/"+simulation,HttpMethod.GET,owner,null).getBody().path("job");assertThat(fixed.path("status").asText()).isEqualTo("FAILED");assertThat(fixed.path("attempt").asInt()).isEqualTo(1);
 }

 @Test void transientDatabaseErrorsBeforeClaimAlsoConsumeTheRetryBudget() throws Exception {
  String owner=session(),id=submit(owner,false);
  doThrow(new org.springframework.dao.TransientDataAccessResourceException("temporary database read error")).when(events).configuration(id);
  for(int i=0;i<3;i++)worker.execute(id);
  var failed=call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job");assertThat(failed.path("status").asText()).isEqualTo("FAILED");assertThat(failed.path("attempt").asInt()).isEqualTo(3);
 }
}

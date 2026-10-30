package com.materialstudio.job;

import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import java.util.*;
import java.nio.file.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@TestPropertySource(properties="studio.retry-backoff-ms=0")
class CheckpointTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 @MockitoSpyBean ResultStore results;
 @MockitoSpyBean TemplateRenderer renderer;
 @Autowired PipelineWorker worker;
 @MockitoSpyBean PipelineState state;
 @Autowired CheckpointStore checkpoints;
 String submit(String cookie) throws Exception {
  return call("/api/jobs",HttpMethod.POST,cookie,Map.of("templateId","demo-portrait","assetIds",List.of(asset(cookie)),"simulation",Map.of("stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0)))).getBody().path("job").path("id").asText();
 }
 @Test void resumesCompletedGenerationAfterTemporaryFinalizeFailureWithoutRecomputing() throws Exception {
  String cookie=session(),id=submit(cookie);
  doThrow(new java.io.IOException("temporary finalization failure")).doCallRealMethod().when(results).publish(eq(id),any(java.awt.image.BufferedImage.class));
  worker.execute(id);
  assertThat(call("/api/jobs/"+id,HttpMethod.GET,cookie,null).getBody().path("job").path("status").asText()).isEqualTo("QUEUED");
  worker.execute(id);
  var done=call("/api/jobs/"+id,HttpMethod.GET,cookie,null).getBody().path("job");
  assertThat(done.path("status").asText()).isEqualTo("SUCCEEDED");assertThat(done.path("attempt").asInt()).isEqualTo(2);
  verify(renderer,times(1)).render(eq("demo-portrait"),anyString(),anyList());
  assertThat(call("/api/jobs/"+id+"/events",HttpMethod.GET,cookie,null).getBody().toString()).contains("RESUMED");
  assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job_checkpoint WHERE job_id=?",Integer.class,id)).isZero();
 }
 Path artifact(String id){return STORAGE.resolve(".checkpoints").resolve(jdbc.queryForObject("SELECT artifact_path FROM job_checkpoint WHERE job_id=? AND stage='GENERATE'",String.class,id));}
 void pause(String id) throws Exception {doThrow(new java.io.IOException("temporary finalization failure")).doCallRealMethod().when(results).publish(eq(id),any(java.awt.image.BufferedImage.class));worker.execute(id);}
 @Test void missingCorruptedChangedInputAndSymlinkCheckpointsRecomputeSafely() throws Exception {
  for(String scenario:List.of("missing","corrupt","input","symlink")){
   clearInvocations(renderer);String cookie=session(),id=submit(cookie);pause(id);Path file=artifact(id);
   if(scenario.equals("missing"))Files.delete(file);
   if(scenario.equals("corrupt"))Files.writeString(file,"broken checkpoint");
   String assetId=jdbc.queryForObject("SELECT asset_id FROM job_asset WHERE job_id=?",String.class,id);
   Path original=STORAGE.resolve(jdbc.queryForObject("SELECT storage_filename FROM asset WHERE id=?",String.class,assetId));
   if(scenario.equals("input")){var replacement=new java.awt.image.BufferedImage(8,8,java.awt.image.BufferedImage.TYPE_INT_RGB);replacement.setRGB(0,0,0xffffff);javax.imageio.ImageIO.write(replacement,"png",original.toFile());jdbc.update("UPDATE asset SET size_bytes=? WHERE id=?",Files.size(original),assetId);}
   if(scenario.equals("symlink")){Files.delete(file);Files.createSymbolicLink(file,original);}
   worker.execute(id);assertThat(call("/api/jobs/"+id,HttpMethod.GET,cookie,null).getBody().path("job").path("status").asText()).as(scenario).isEqualTo("SUCCEEDED");
   verify(renderer,times(2)).render(eq("demo-portrait"),anyString(),anyList());assertThat(Files.isRegularFile(original)).isTrue();
  }
 }
 @Test void cancellationClearsRegisteredIntermediateArtifactsImmediately() throws Exception {
  String cookie=session(),id=submit(cookie);pause(id);Path file=artifact(id);assertThat(Files.exists(file)).isTrue();
  assertThat(call("/api/jobs/"+id+"/cancel",HttpMethod.POST,cookie,null).getStatusCode().value()).isEqualTo(200);
  assertThat(Files.exists(file,LinkOption.NOFOLLOW_LINKS)).isFalse();
  assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job_checkpoint WHERE job_id=?",Integer.class,id)).isZero();
 }
 @Test void completionEventFailureRollsBackCheckpointAndStateTogether() throws Exception {
  String cookie=session(),id=submit(cookie);String owner=jdbc.queryForObject("SELECT owner_id FROM job WHERE id=?",String.class,id);
  assertThat(state.start(id,Simulation.Stage.ASSET_CHECK)).isTrue();assertThat(state.complete(id,Simulation.Stage.ASSET_CHECK,null)).isTrue();assertThat(state.start(id,Simulation.Stage.GENERATE)).isTrue();
  var image=new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB);var row=checkpoints.generated(id,"0".repeat(64),image);image.flush();
  jdbc.execute("CREATE TRIGGER reject_checkpoint_completion_test BEFORE INSERT ON job_event FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='injected checkpoint event failure'");
  try{
   org.assertj.core.api.Assertions.assertThatThrownBy(()->state.complete(id,Simulation.Stage.GENERATE,null,row)).isInstanceOf(org.springframework.dao.DataAccessException.class);
   assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job_checkpoint WHERE job_id=?",Integer.class,id)).isZero();
   assertThat(jdbc.queryForObject("SELECT kind FROM job_event WHERE job_id=? ORDER BY version DESC LIMIT 1",String.class,id)).isEqualTo("STARTED");
  }finally{jdbc.execute("DROP TRIGGER IF EXISTS reject_checkpoint_completion_test");checkpoints.discard(row);state.cancel(id,owner);}
 }
 @Test void lostCommitAcknowledgementDoesNotDeleteAnAlreadyRegisteredSuccessfulResult()throws Exception{
  String cookie=session(),id=submit(cookie);
  doAnswer(invocation->{boolean committed=(boolean)invocation.callRealMethod();if(committed)throw new org.springframework.dao.TransientDataAccessResourceException("commit acknowledgement lost");return false;}).when(state).complete(eq(id),eq(Simulation.Stage.FINALIZE),anyString(),isNull());
  worker.execute(id);assertThat(call("/api/jobs/"+id,HttpMethod.GET,cookie,null).getBody().path("job").path("status").asText()).isEqualTo("SUCCEEDED");
  var headers=new org.springframework.http.HttpHeaders();headers.set("Cookie",cookie);var response=http.exchange("/api/jobs/"+id+"/result",HttpMethod.GET,new org.springframework.http.HttpEntity<>(headers),byte[].class);assertThat(response.getStatusCode().value()).isEqualTo(200);
 }
}

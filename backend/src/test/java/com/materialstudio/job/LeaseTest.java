package com.materialstudio.job;
import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.TestPropertySource;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;
@TestPropertySource(properties="studio.retry-backoff-ms=0")
class LeaseTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 @Autowired LeaseGuard leases;
 @Autowired PipelineState state;
 @Autowired ExecutionMapper execution;
 @Autowired CheckpointStore checkpoints;
 @Autowired org.springframework.transaction.PlatformTransactionManager transactionManager;
 String submit()throws Exception{String cookie=session();return call("/api/jobs",HttpMethod.POST,cookie,Map.of("templateId","demo-portrait","assetIds",List.of(asset(cookie)),"simulation",Map.of("stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0)))).getBody().path("job").path("id").asText();}
 @Test void twelveConcurrentClaimantsProduceExactlyOneLease()throws Exception{
  String id=submit();var start=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(12);
  try{var futures=new ArrayList<Future<LeaseGuard.Claim>>();for(int n=0;n<12;n++)futures.add(pool.submit(()->{start.await();return leases.claim(id);}));start.countDown();var claims=new ArrayList<LeaseGuard.Claim>();for(var future:futures){var claim=future.get(10,TimeUnit.SECONDS);if(claim!=null)claims.add(claim);}assertThat(claims).hasSize(1);assertThat(claims.getFirst().generation()).isEqualTo(1);}finally{pool.shutdownNow();}
 }
 @Test void liveLeaseIsNotResetWhenAnotherInstanceStartsRecovery()throws Exception{
  String id=submit();var claim=leases.claim(id);assertThat(claim).isNotNull();
  try(var scope=leases.enter(claim)){
   assertThat(state.start(id,Simulation.Stage.ASSET_CHECK)).isTrue();long version=jdbc.queryForObject("SELECT version FROM job WHERE id=?",Long.class,id);
   state.recoverUnfinished();assertThat(jdbc.queryForObject("SELECT status FROM job WHERE id=?",String.class,id)).isEqualTo("RUNNING");assertThat(jdbc.queryForObject("SELECT version FROM job WHERE id=?",Long.class,id)).isEqualTo(version);
  }
 }
 @Test void expiredLeaseCannotRenewAndOldReleaseCannotClearSuccessor()throws Exception{
  String id=submit();var first=leases.claim(id);assertThat(leases.renew(first)).isTrue();
  jdbc.update("UPDATE job_runtime SET lease_until=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 1 SECOND) WHERE job_id=?",id);
  assertThat(leases.renew(first)).isFalse();var next=leases.claim(id);assertThat(next).isNotNull();assertThat(next.generation()).isEqualTo(first.generation()+1);leases.release(first);
  assertThat(execution.lease(id).alive()).isTrue();assertThat(execution.lease(id).leaseGeneration()).isEqualTo(next.generation());leases.release(next);
 }
 @Test void expiredGenerationCannotCompleteFailRetryStartOrSaveCheckpoint()throws Exception{
  String id=submit();var first=leases.claim(id);assertThat(first).isNotNull();
  try(var old=leases.enter(first)){assertThat(state.start(id,Simulation.Stage.ASSET_CHECK)).isTrue();}
  state.recoverUnfinished();var next=leases.claim(id);assertThat(next).isNotNull();
  try(var winner=leases.enter(next)){
   assertThat(state.start(id,Simulation.Stage.ASSET_CHECK)).isTrue();var before=jdbc.queryForList("SELECT * FROM job WHERE id=?",id);
   boolean completed,started;
   try(var stale=leases.enter(first)){
    completed=state.complete(id,Simulation.Stage.ASSET_CHECK,null,new CheckpointMapper.Checkpoint(id,"ASSET_CHECK","0".repeat(64),null,null,java.time.Instant.now()));
    state.fail(id,"PIPELINE_FAILED","late old failure");state.retry(id,"TEMPORARY_FAILURE","late old retry");started=state.start(id,Simulation.Stage.GENERATE);
   }
   assertThat(completed).isFalse();assertThat(started).isFalse();assertThat(jdbc.queryForList("SELECT * FROM job WHERE id=?",id)).isEqualTo(before);
   assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job_checkpoint WHERE job_id=?",Integer.class,id)).isZero();
   assertThat(execution.lease(id).alive()).isTrue();assertThat(state.complete(id,Simulation.Stage.ASSET_CHECK,null)).isTrue();
   String owner=jdbc.queryForObject("SELECT owner_id FROM job WHERE id=?",String.class,id);state.cancel(id,owner);assertThat(state.start(id,Simulation.Stage.GENERATE)).isFalse();
  }
 }
 @Test void rolledBackOuterCancellationPreservesCheckpointArtifact()throws Exception{
  String id=submit(),owner=jdbc.queryForObject("SELECT owner_id FROM job WHERE id=?",String.class,id);
  state.start(id,Simulation.Stage.ASSET_CHECK);state.complete(id,Simulation.Stage.ASSET_CHECK,null);state.start(id,Simulation.Stage.GENERATE);
  var image=new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB);var row=checkpoints.generated(id,"0".repeat(64),image);image.flush();assertThat(state.complete(id,Simulation.Stage.GENERATE,null,row)).isTrue();
  var tx=new org.springframework.transaction.support.TransactionTemplate(transactionManager);
  try{tx.executeWithoutResult(status->{state.cancel(id,owner);status.setRollbackOnly();});assertThat(jdbc.queryForObject("SELECT status FROM job WHERE id=?",String.class,id)).isEqualTo("RUNNING");assertThat(java.nio.file.Files.exists(STORAGE.resolve(".checkpoints/"+row.artifactPath()))).isTrue();
   tx.executeWithoutResult(status->state.cancel(id,owner));assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job_checkpoint WHERE job_id=?",Integer.class,id)).isZero();assertThat(java.nio.file.Files.exists(STORAGE.resolve(".checkpoints/"+row.artifactPath()))).isFalse();
  }
  finally{state.cancel(id,owner);}
 }
 @Test void aFastNodeClockCannotClaimWorkBeforeDatabaseDueTime()throws Exception{
  String id=submit();execution.ensure(id);execution.defer(id,java.time.Instant.now().plusSeconds(3600));var fast=java.time.Instant.now().plusSeconds(7200);
  try(var clock=org.mockito.Mockito.mockStatic(java.time.Instant.class,org.mockito.Mockito.CALLS_REAL_METHODS)){
   clock.when(java.time.Instant::now).thenReturn(fast);assertThat(leases.claim(id)).isNull();assertThat(execution.lease(id).leaseGeneration()).isZero();
  }
 }
}

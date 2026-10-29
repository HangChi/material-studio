package com.materialstudio.job;

import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.*;
import org.springframework.http.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.nio.file.Files;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.anyString;

class JobSubmissionTest extends ApiTestSupport {
    @MockitoBean JobDispatcher dispatcher;
    @BeforeEach void resetDispatcher() { reset(dispatcher); }
    private ResponseEntity<com.fasterxml.jackson.databind.JsonNode> submit(String cookie, String template, List<String> ids) {
        return call("/api/jobs", HttpMethod.POST, cookie, Map.of("templateId",template,"assetIds",ids));
    }
    @Test void commitsBeforeDispatchAndReturnsWhileWorkerIsBlocked() throws Exception {
        String owner=session(), asset=asset(owner);
        CountDownLatch started=new CountDownLatch(1), release=new CountDownLatch(1);
        AtomicBoolean committed=new AtomicBoolean(), insideTransaction=new AtomicBoolean(true);
        AtomicReference<CompletableFuture<Void>> worker=new AtomicReference<>();
        doAnswer(invocation -> {
            String id=invocation.getArgument(0);
            insideTransaction.set(TransactionSynchronizationManager.isActualTransactionActive());
            worker.set(CompletableFuture.runAsync(() -> {
                committed.set(jdbc.queryForObject("SELECT COUNT(*) FROM job WHERE id=?",Integer.class,id)==1);
                started.countDown();
                try { release.await(5,TimeUnit.SECONDS); } catch(InterruptedException e) { Thread.currentThread().interrupt(); }
            }));
            return null;
        }).when(dispatcher).dispatch(anyString());
        try {
            var response=submit(owner,"demo-portrait",List.of(asset));
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
            assertThat(started.await(5,TimeUnit.SECONDS)).isTrue();
            assertThat(committed.get()).isTrue(); assertThat(insideTransaction.get()).isFalse();
            assertThat(worker.get().isDone()).isFalse();
            assertThat(response.getBody().path("job").path("status").asText()).isEqualTo("QUEUED");
            assertThat(response.getHeaders().getFirst("Location")).startsWith("/api/jobs/");
        } finally { release.countDown(); if(worker.get()!=null) worker.get().get(5,TimeUnit.SECONDS); }
    }
    @Test void preservesSlotOrderAndCreatesDistinctTasks() throws Exception {
        String owner=session(); List<String> ids=List.of(asset(owner),asset(owner));
        var first=submit(owner,"demo-postcard",ids);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        String id=first.getBody().path("job").path("id").asText();
        assertThat(jdbc.queryForList("SELECT asset_id FROM job_asset WHERE job_id=? ORDER BY slot_index",String.class,id)).isEqualTo(ids);
        var second=submit(owner,"demo-postcard",ids);
        assertThat(second.getBody().path("job").path("id").asText()).isNotEqualTo(id);
    }
    @Test void invalidOrForeignAssetsDoNotCreateTasks() throws Exception {
        String owner=session(), mine=asset(owner), foreign=asset(session());
        int before=jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class);
        assertThat(submit(owner,"demo-postcard",List.of(mine)).getStatusCode().value()).isEqualTo(422);
        assertThat(submit(owner,"demo-postcard",List.of(mine,mine)).getStatusCode().value()).isEqualTo(422);
        assertThat(submit(owner,"demo-portrait",List.of(foreign)).getStatusCode().value()).isEqualTo(404);
        assertThat(submit(owner,"missing",List.of(mine)).getStatusCode().value()).isEqualTo(404);
        assertThat(submit(owner,"demo-portrait",List.of("missing")).getStatusCode().value()).isEqualTo(404);
        assertThat(call("/api/jobs",HttpMethod.POST,owner,Map.of("templateId","demo-portrait","assetIds",List.of(mine),"ownerId","forged")).getStatusCode().value()).isEqualTo(400);
        assertThat(submit(null,"demo-portrait",List.of(mine)).getStatusCode().value()).isEqualTo(401);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class)).isEqualTo(before);
        verifyNoInteractions(dispatcher);
    }
    @Test void physicallyMissingOrModifiedFilesAreRejected() throws Exception {
        String owner=session(), id=asset(owner);
        String filename=jdbc.queryForObject("SELECT storage_filename FROM asset WHERE id=?",String.class,id);
        Files.write(STORAGE.resolve(filename),new byte[]{1,2,3});
        assertThat(submit(owner,"demo-portrait",List.of(id)).getStatusCode().value()).isEqualTo(422);
        Files.delete(STORAGE.resolve(filename));
        assertThat(submit(owner,"demo-portrait",List.of(id)).getBody().path("error").path("code").asText()).isEqualTo("ASSET_UNAVAILABLE");
        verifyNoInteractions(dispatcher);
    }
    @Test void associationFailureRollsBackTheTaskAndNeverDispatches() throws Exception {
        String owner=session(), asset=asset(owner);
        int before=jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class);
        jdbc.execute("CREATE TRIGGER reject_job_asset_test BEFORE INSERT ON job_asset FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='injected storage failure'");
        try {
            var response=submit(owner,"demo-portrait",List.of(asset));
            assertThat(response.getStatusCode().value()).isEqualTo(500);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class)).isEqualTo(before);
            verifyNoInteractions(dispatcher);
        } finally { jdbc.execute("DROP TRIGGER IF EXISTS reject_job_asset_test"); }
    }
    @Test void rejectionIsPersistedAsATerminalFailureAndQueriesAreReadOnly() throws Exception {
        doThrow(new RejectedExecutionException("internal details")).when(dispatcher).dispatch(anyString());
        String owner=session(); var response=submit(owner,"demo-portrait",List.of(asset(owner)));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        var job=response.getBody().path("job"); String id=job.path("id").asText();
        assertThat(job.path("status").asText()).isEqualTo("FAILED");
        assertThat(job.path("errorCode").asText()).isEqualTo("QUEUE_REJECTED");
        assertThat(job.path("stage").isNull()).isTrue(); assertThat(job.path("finishedAt").isNull()).isFalse();
        var read=call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job");
        assertThat(read).isEqualTo(job); assertThat(read.toString()).doesNotContain("internal details", "ownerId", "storageFilename");
    }
    @Test void onlyOwnerCanReconcileRecentlyAcceptedRecords() throws Exception {
        String owner=session(), stranger=session();
        var response=submit(owner,"demo-portrait",List.of(asset(owner)));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        String id=response.getBody().path("job").path("id").asText();
        assertThat(call("/api/jobs",HttpMethod.GET,owner,null).getBody().path("items").get(0).path("id").asText()).isEqualTo(id);
        assertThat(call("/api/jobs",HttpMethod.GET,stranger,null).getBody().path("items").size()).isZero();
        assertThat(call("/api/jobs/"+id,HttpMethod.GET,stranger,null).getStatusCode().value()).isEqualTo(404);
    }
}

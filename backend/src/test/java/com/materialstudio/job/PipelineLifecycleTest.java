package com.materialstudio.job;

import com.materialstudio.ApiTestSupport;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.anyString;

@TestPropertySource(properties="studio.queue-capacity=1")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_CLASS)
class PipelineLifecycleTest extends ApiTestSupport {
    @MockitoBean PipelineWorker worker;
    @Autowired BackgroundJobDispatcher dispatcher;
    private JsonNode submit(String owner,String asset) {
        var response=call("/api/jobs",HttpMethod.POST,owner,Map.of("templateId","demo-portrait","assetIds",List.of(asset)));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);return response.getBody().path("job");
    }
    @Test @Order(1) void boundedMemoryQueueRetainsOverflowForScannerAndPreservesFifo() throws Exception {
        String owner=session(),asset=asset(owner);var started=new CountDownLatch(1);var release=new CountDownLatch(1);var done=new CountDownLatch(3);
        var order=new CopyOnWriteArrayList<String>();var threads=new CopyOnWriteArrayList<String>();
        doAnswer(invocation->{
            order.add(invocation.getArgument(0));threads.add(Thread.currentThread().getName());started.countDown();
            try { release.await(5,TimeUnit.SECONDS); }finally { jdbc.update("UPDATE job SET status='SUCCEEDED',stage='FINALIZE',result_path='test.png',finished_at=CURRENT_TIMESTAMP(6) WHERE id=?",invocation.getArgument(0,String.class));done.countDown(); }return null;
        }).when(worker).execute(anyString());
        try {
            String first=submit(owner,asset).path("id").asText();assertThat(started.await(3,TimeUnit.SECONDS)).isTrue();
            String second=submit(owner,asset).path("id").asText();var rejected=submit(owner,asset);
            assertThat(rejected.path("status").asText()).isEqualTo("QUEUED");assertThat(rejected.path("errorCode").isNull()).isTrue();
            assertThat(order).containsExactly(first);release.countDown();assertThat(done.await(3,TimeUnit.SECONDS)).isTrue();
            assertThat(order).containsExactly(first,second,rejected.path("id").asText());assertThat(threads).containsOnly("material-pipeline");
        } finally { release.countDown(); }
    }
    @Test @Order(2) void startupRequeuesUnfinishedJobsAndPreservesTerminalRecords() throws Exception {
        reset(worker);String owner=session(),asset=asset(owner);
        String queued=submit(owner,asset).path("id").asText(),running=submit(owner,asset).path("id").asText();
        // Deterministic persisted state from an earlier process; no worker is executing real stages here.
        jdbc.update("UPDATE job SET status='RUNNING',stage='GENERATE',version=3 WHERE id=?",running);
        String terminal=submit(owner,asset).path("id").asText();
        jdbc.update("UPDATE job SET status='SUCCEEDED',stage='FINALIZE',version=6,result_path='preset.png',finished_at=CURRENT_TIMESTAMP(6) WHERE id=?",terminal);
        var before=call("/api/jobs/"+terminal,HttpMethod.GET,owner,null).getBody();
        dispatcher.run(null);
        for(String id:List.of(queued,running)) {
            var job=call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job");
            assertThat(job.path("status").asText()).isEqualTo("QUEUED");assertThat(job.path("errorCode").isNull()).isTrue();
            var events=call("/api/jobs/"+id+"/events",HttpMethod.GET,owner,null).getBody().path("items");
            if(id.equals(running)){assertThat(events.size()).isEqualTo(1);assertThat(events.get(0).path("kind").asText()).isEqualTo("INTERRUPTED");}else assertThat(events.size()).isZero();
        }
        assertThat(call("/api/jobs/"+terminal,HttpMethod.GET,owner,null).getBody()).isEqualTo(before);
        dispatcher.run(null);assertThat(jdbc.queryForObject("SELECT version FROM job WHERE id=?",Long.class,queued)).isEqualTo(0L);
    }
    @Test @Order(3) void shutdownPreservesWaitingJobsAndDurablyAcceptsForRestart() throws Exception {
        reset(worker);String owner=session(),asset=asset(owner);String id=submit(owner,asset).path("id").asText();
        dispatcher.close();
        var job=call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job");
        assertThat(job.path("status").asText()).isEqualTo("QUEUED");assertThat(job.path("errorCode").isNull()).isTrue();
        assertThat(submit(owner,asset).path("status").asText()).isEqualTo("QUEUED");
    }
}

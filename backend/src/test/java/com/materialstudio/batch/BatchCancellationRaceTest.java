package com.materialstudio.batch;

import com.materialstudio.ApiTestSupport;
import com.materialstudio.job.EventMapper;
import com.materialstudio.job.JobDispatcher;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.beans.factory.annotation.Autowired;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;

class BatchCancellationRaceTest extends ApiTestSupport {
    @MockitoBean JobDispatcher dispatcher;
    @MockitoSpyBean EventMapper events;
    @Autowired SqlSessionTemplate sql;

    @Test void finishingAChildDuringCancellationPreservesOtherCancellations() throws Exception {
        String cookie = session();
        String assetId = asset(cookie);
        var headers = new org.springframework.http.HttpHeaders();
        headers.set("Cookie", cookie);
        headers.set("Idempotency-Key", "cancel-race");
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        var item = Map.of("templateId", "demo-portrait", "assetIds", List.of(assetId));
        var created = http.exchange("/api/batches", HttpMethod.POST,
                new org.springframework.http.HttpEntity<>(Map.of("name", "并发取消", "items", List.of(item, item)), headers),
                com.fasterxml.jackson.databind.JsonNode.class);
        assertThat(created.getStatusCode().value()).isEqualTo(202);
        var batch = created.getBody().path("batch");
        String first = batch.path("items").get(0).path("id").asText();
        String second = batch.path("items").get(1).path("id").asText();

        // Finish after the batch snapshot is read but before cancellation locks this child.
        doAnswer(invocation -> {
            CompletableFuture.runAsync(() -> jdbc.update("""
                    UPDATE job SET status='FAILED',error_code='CONCURRENT_FINISH',error_message='已结束',
                    version=version+1,finished_at=CURRENT_TIMESTAMP(6) WHERE id=?
                    """, second)).get(5, TimeUnit.SECONDS);
            return sql.getMapper(EventMapper.class).lock(second);
        }).when(events).lock(second);

        var cancelled = call("/api/batches/" + batch.path("id").asText() + "/cancel", HttpMethod.POST, cookie, null);
        assertThat(cancelled.getStatusCode().value()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT error_code FROM job WHERE id=?", String.class, first)).isEqualTo("JOB_CANCELLED");
        assertThat(jdbc.queryForObject("SELECT error_code FROM job WHERE id=?", String.class, second)).isEqualTo("CONCURRENT_FINISH");
        assertThat(cancelled.getBody().path("batch").path("counts").path("cancelled").asInt()).isEqualTo(1);
        assertThat(call("/api/jobs/" + second + "/cancel", HttpMethod.POST, cookie, null).getStatusCode().value()).isEqualTo(409);
    }
}

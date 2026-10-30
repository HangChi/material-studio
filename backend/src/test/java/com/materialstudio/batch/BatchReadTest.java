package com.materialstudio.batch;

import com.materialstudio.ApiTestSupport;
import com.materialstudio.job.JobDispatcher;
import com.materialstudio.job.JobMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import java.util.List;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class BatchReadTest extends ApiTestSupport {
    @MockitoBean JobDispatcher dispatcher;
    @MockitoSpyBean JobMapper jobs;
    @MockitoSpyBean BatchMapper batches;

    private com.fasterxml.jackson.databind.JsonNode create(String cookie, String key, List<?> items) {
        var headers = new HttpHeaders();
        headers.set("Cookie", cookie);
        headers.set("Idempotency-Key", key);
        headers.setContentType(MediaType.APPLICATION_JSON);
        var response = http.exchange("/api/batches", HttpMethod.POST,
                new HttpEntity<>(Map.of("name", key, "items", items), headers), com.fasterxml.jackson.databind.JsonNode.class);
        assertThat(response.getStatusCode().value()).isEqualTo(202);
        return response.getBody().path("batch");
    }

    @Test void readsChildrenInOneQueryWhilePreservingOwnerSlotOrderAndMetadata() throws Exception {
        String cookie = session(), assetId = asset(cookie);
        var item = Map.of("templateId", "demo-portrait", "assetIds", List.of(assetId));
        var older = create(cookie, "older-batch", List.of(item, item));
        var newer = create(cookie, "newer-batch", List.of(item, item, item));
        String stranger = session(), otherAsset = asset(stranger);
        create(stranger, "other-owner", List.of(Map.of("templateId", "demo-portrait", "assetIds", List.of(otherAsset))));
        String editedId = newer.path("items").get(1).path("id").asText();
        call("/api/jobs/" + editedId + "/library", HttpMethod.PATCH, cookie,
                Map.of("displayName", "已整理", "favorite", true, "hidden", true));
        clearInvocations(jobs);
        clearInvocations(batches);

        var response = call("/api/batches?limit=20", HttpMethod.GET, cookie, null);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        var rows = response.getBody().path("items");
        assertThat(rows.size()).isEqualTo(2);
        assertThat(rows.get(0).path("id")).isEqualTo(newer.path("id"));
        assertThat(rows.get(1).path("id")).isEqualTo(older.path("id"));
        for (int slot = 0; slot < 3; slot++) {
            assertThat(rows.get(0).path("items").get(slot).path("id")).isEqualTo(newer.path("items").get(slot).path("id"));
        }
        var edited = rows.get(0).path("items").get(1);
        assertThat(edited.path("displayName").asText()).isEqualTo("已整理");
        assertThat(edited.path("favorite").asBoolean()).isTrue();
        assertThat(edited.path("hidden").asBoolean()).isTrue();
        assertThat(rows.get(0).path("counts").path("queued").asInt()).isEqualTo(3);
        verify(jobs, never()).owned(anyString(), anyString());
        verify(jobs, times(1)).ownedMany(anyString(), anyList());
        verify(batches, times(1)).page(anyString(), isNull(), isNull(), eq(21));
        verify(batches, times(1)).childrenFor(anyList());
        verify(batches, never()).children(anyString());

        var first = call("/api/batches?limit=1", HttpMethod.GET, cookie, null).getBody();
        var next = call("/api/batches?limit=1&cursor=" + first.path("nextCursor").asText(), HttpMethod.GET, cookie, null).getBody();
        assertThat(next.path("items").get(0).path("id")).isEqualTo(older.path("id"));
        assertThat(next.path("nextCursor").isNull()).isTrue();
    }
}

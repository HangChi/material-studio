package com.materialstudio.job;

import com.materialstudio.ApiTestSupport;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.*;
import org.springframework.http.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class CreationApiTest extends ApiTestSupport {
    @MockitoBean JobDispatcher dispatcher;
    @BeforeEach void resetMock() { reset(dispatcher); }
    private ResponseEntity<JsonNode> keyed(String owner,String key,Object body) {
        var headers=new HttpHeaders();headers.setContentType(MediaType.APPLICATION_JSON);headers.set("Cookie",owner);headers.set("Idempotency-Key",key);
        return http.exchange("/api/jobs",HttpMethod.POST,new HttpEntity<>(body,headers),JsonNode.class);
    }
    @Test void concurrentReplayCreatesAndDispatchesOnceAndDifferentPayloadConflicts() throws Exception {
        String owner=session(),key=UUID.randomUUID().toString();
        var body=Map.of("templateId","demo-portrait","assetIds",List.of(asset(owner)));
        try(var pool=Executors.newFixedThreadPool(4)) {
            var futures=new ArrayList<Future<ResponseEntity<JsonNode>>>();
            for(int i=0;i<4;i++)futures.add(pool.submit(()->keyed(owner,key,body)));
            Set<String> ids=new HashSet<>();
            for(var future:futures){var response=future.get(10,TimeUnit.SECONDS);assertThat(response.getStatusCode().value()).isEqualTo(202);ids.add(response.getBody().path("job").path("id").asText());}
            assertThat(ids).hasSize(1);verify(dispatcher,times(1)).dispatch(ids.iterator().next());
        }
        var changed=Map.of("templateId","demo-portrait","assetIds",List.of(asset(owner)));
        assertThat(keyed(owner,key,changed).getStatusCode().value()).isEqualTo(409);
        String stranger=session();
        assertThat(keyed(stranger,key,Map.of("templateId","demo-portrait","assetIds",List.of(asset(stranger)))).getStatusCode().value()).isEqualTo(202);
    }
    @Test void invalidKeysAreRejectedAndValidationDoesNotConsumeKey() throws Exception {
        String owner=session(),key=UUID.randomUUID().toString();String asset=asset(owner);
        var body=Map.of("templateId","demo-portrait","assetIds",List.of(asset));
        assertThat(keyed(owner,"invalid key",body).getStatusCode().value()).isEqualTo(400);
        assertThat(keyed(owner,"a".repeat(81),body).getStatusCode().value()).isEqualTo(400);
        assertThat(keyed(owner,key,Map.of("templateId","missing","assetIds",List.of(asset))).getStatusCode().value()).isEqualTo(404);
        assertThat(keyed(owner,key,body).getStatusCode().value()).isEqualTo(202);
    }
}

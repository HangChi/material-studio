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

    @org.springframework.beans.factory.annotation.Autowired PipelineWorker worker;
    private ResponseEntity<JsonNode> recreate(String owner,String id,String key) {
        var headers=new HttpHeaders();headers.set("Cookie",owner);if(key!=null)headers.set("Idempotency-Key",key);
        return http.exchange("/api/jobs/"+id+"/recreate",HttpMethod.POST,new HttpEntity<>(null,headers),JsonNode.class);
    }
    @Test void failedRetryCreatesLinkedTaskWithoutFailureAndReplaysAfterAssetLoss() throws Exception {
        String owner=session(),asset=asset(owner);
        var body=Map.of("templateId","demo-portrait","assetIds",List.of(asset),"simulation",Map.of("failStage","GENERATE","stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0)));
        String old=keyed(owner,"original",body).getBody().path("job").path("id").asText();
        assertThat(recreate(owner,old,"busy").getStatusCode().value()).isEqualTo(409);
        worker.execute(old);var original=call("/api/jobs/"+old,HttpMethod.GET,owner,null).getBody();
        assertThat(original.path("job").path("status").asText()).isEqualTo("FAILED");
        var response=recreate(owner,old,"retry");assertThat(response.getStatusCode().value()).isEqualTo(202);
        String next=response.getBody().path("job").path("id").asText();assertThat(next).isNotEqualTo(old);
        worker.execute(next);
        assertThat(call("/api/jobs/"+next,HttpMethod.GET,owner,null).getBody().path("job").path("status").asText()).isEqualTo("SUCCEEDED");
        assertThat(call("/api/jobs/"+next+"/recipe",HttpMethod.GET,owner,null).getBody().path("sourceJobId").asText()).isEqualTo(old);
        assertThat(call("/api/jobs/"+old,HttpMethod.GET,owner,null).getBody()).isEqualTo(original);
        String filename=jdbc.queryForObject("SELECT storage_filename FROM asset WHERE id=?",String.class,asset);java.nio.file.Files.delete(STORAGE.resolve(filename));
        assertThat(recreate(owner,old,"retry").getBody().path("job").path("id").asText()).isEqualTo(next);
        assertThat(recreate(owner,old,"new-retry").getStatusCode().value()).isEqualTo(422);
        assertThat(recreate(owner,old,null).getStatusCode().value()).isEqualTo(400);
        String stranger=session();assertThat(recreate(stranger,old,"foreign").getStatusCode().value()).isEqualTo(404);
        assertThat(call("/api/jobs/"+old+"/recipe",HttpMethod.GET,stranger,null).getStatusCode().value()).isEqualTo(404);
    }
    @Test void successfulRemakeAndPrivateDownloadPreserveOriginalBytes() throws Exception {
        String owner=session();
        String old=keyed(owner,"success",Map.of("templateId","demo-portrait","assetIds",List.of(asset(owner)),"simulation",Map.of("stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0)))).getBody().path("job").path("id").asText();worker.execute(old);
        var headers=new HttpHeaders();headers.set("Cookie",owner);
        var download=http.exchange("/api/jobs/"+old+"/download",HttpMethod.GET,new HttpEntity<>(headers),byte[].class);
        var preview=http.exchange("/api/jobs/"+old+"/result",HttpMethod.GET,new HttpEntity<>(headers),byte[].class);
        assertThat(download.getStatusCode().value()).isEqualTo(200);assertThat(download.getHeaders().getFirst("Content-Disposition")).contains("attachment","material-"+old+".png");
        assertThat(download.getBody()).isEqualTo(preview.getBody());
        assertThat(recreate(owner,old,"remake").getStatusCode().value()).isEqualTo(202);
        assertThat(call("/api/jobs/"+old+"/download",HttpMethod.GET,session(),null).getStatusCode().value()).isEqualTo(404);
    }

}

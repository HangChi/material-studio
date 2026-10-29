package com.materialstudio.batch;
import com.materialstudio.ApiTestSupport;
import com.materialstudio.job.JobDispatcher;
import org.junit.jupiter.api.*;
import org.springframework.http.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
@org.springframework.test.context.TestPropertySource(properties="studio.max-pending-per-user=2")
class BatchApiTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 @BeforeEach void resetMock(){reset(dispatcher);}
 Map<String,Object> item(String asset){return Map.of("templateId","demo-portrait","assetIds",List.of(asset));}
 ResponseEntity<com.fasterxml.jackson.databind.JsonNode> create(String cookie,String key,List<?> items){var h=new HttpHeaders();h.set("Cookie",cookie);h.setContentType(MediaType.APPLICATION_JSON);h.set("Idempotency-Key",key);return http.exchange("/api/batches",HttpMethod.POST,new HttpEntity<>(Map.of("name","一组作品","items",items),h),com.fasterxml.jackson.databind.JsonNode.class);}
 @Test void commitsWholeBatchBeforeDispatchAndReplaysWithoutDuplicates()throws Exception{
  String owner=session(),asset=asset(owner);AtomicBoolean visible=new AtomicBoolean(true);
  doAnswer(inv->{String id=inv.getArgument(0);var read=java.util.concurrent.CompletableFuture.supplyAsync(()->jdbc.queryForObject("SELECT COUNT(*) FROM batch_job WHERE job_id=?",Integer.class,id)).get();if(read!=1)visible.set(false);return null;}).when(dispatcher).dispatch(anyString());
  var response=create(owner,"batch-key",List.of(item(asset),item(asset)));assertThat(response.getStatusCode().value()).isEqualTo(202);var batch=response.getBody().path("batch");assertThat(batch.path("items").size()).isEqualTo(2);assertThat(visible).isTrue();verify(dispatcher,times(2)).dispatch(anyString());
  var replay=create(owner,"batch-key",List.of(item(asset),item(asset)));assertThat(replay.getBody().path("batch").path("id")).isEqualTo(batch.path("id"));verify(dispatcher,times(2)).dispatch(anyString());
  assertThat(create(owner,"batch-key",List.of(item(asset))).getStatusCode().value()).isEqualTo(409);
 }
 @Test void invalidChildRollsBackAllJobsAndNeverSchedules()throws Exception{
  String owner=session(),asset=asset(owner);int before=jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class);
  assertThat(create(owner,"invalid",List.of(item(asset),item("missing"))).getStatusCode().value()).isEqualTo(404);assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class)).isEqualTo(before);verifyNoInteractions(dispatcher);
 }
 @Test void quotaFailureRollsBackEveryChildAndItsBatchReceipt()throws Exception{
  String owner=session(),asset=asset(owner);call("/api/jobs",HttpMethod.POST,owner,item(asset));reset(dispatcher);int before=jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class);
  assertThat(create(owner,"quota-batch",List.of(item(asset),item(asset))).getStatusCode().value()).isEqualTo(429);
  assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class)).isEqualTo(before);verifyNoInteractions(dispatcher);
  assertThat(create(owner,"quota-batch",List.of(item(asset))).getStatusCode().value()).isEqualTo(202);
 }
 @Test void ownershipPaginationAndRepeatedCancellationAreIsolated()throws Exception{
  String owner=session(),asset=asset(owner),stranger=session();var batch=create(owner,"cancel",List.of(item(asset),item(asset))).getBody().path("batch");String id=batch.path("id").asText();
  assertThat(call("/api/batches/"+id,HttpMethod.GET,stranger,null).getStatusCode().value()).isEqualTo(404);
  assertThat(call("/api/batches?limit=1",HttpMethod.GET,owner,null).getBody().path("items").size()).isEqualTo(1);
  for(int n=0;n<2;n++){var cancelled=call("/api/batches/"+id+"/cancel",HttpMethod.POST,owner,null);assertThat(cancelled.getStatusCode().value()).isEqualTo(200);assertThat(cancelled.getBody().path("batch").path("counts").path("cancelled").asInt()).isEqualTo(2);}
  assertThat(call("/api/batches?cursor="+id,HttpMethod.GET,stranger,null).getStatusCode().value()).isEqualTo(400);
 }
}

package com.materialstudio.job;
import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;
@TestPropertySource(properties={"studio.max-pending=3","studio.max-pending-per-user=2","studio.submissions-per-minute=3"})
class AdmissionPolicyTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 Map<String,Object> body(String asset){return Map.of("templateId","demo-portrait","assetIds",List.of(asset));}
 ResponseEntity<com.fasterxml.jackson.databind.JsonNode> submit(String cookie,String asset){return call("/api/jobs",HttpMethod.POST,cookie,body(asset));}
 void cancel(String cookie,String id){assertThat(call("/api/jobs/"+id+"/cancel",HttpMethod.POST,cookie,null).getStatusCode().value()).isEqualTo(200);}
 @Test void limitsPendingThenRollingRateWithoutCreatingRejectedRows() throws Exception {
  String cookie=session(),asset=asset(cookie);var a=submit(cookie,asset);var b=submit(cookie,asset);
  int before=jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class);
  var limited=submit(cookie,asset);assertThat(limited.getStatusCode().value()).isEqualTo(429);assertThat(limited.getBody().path("error").path("code").asText()).isEqualTo("ADMISSION_LIMIT");assertThat(limited.getHeaders().getFirst("Retry-After")).isEqualTo("60");
  assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class)).isEqualTo(before);
  cancel(cookie,a.getBody().path("job").path("id").asText());var c=submit(cookie,asset);assertThat(c.getStatusCode().value()).isEqualTo(202);
  cancel(cookie,b.getBody().path("job").path("id").asText());cancel(cookie,c.getBody().path("job").path("id").asText());
  var rate=submit(cookie,asset);assertThat(rate.getStatusCode().value()).isEqualTo(429);assertThat(rate.getBody().path("error").path("code").asText()).isEqualTo("RATE_LIMITED");
  jdbc.update("UPDATE job SET created_at=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 61 SECOND) WHERE id=?",a.getBody().path("job").path("id").asText());
  assertThat(submit(cookie,asset).getStatusCode().value()).isEqualTo(202);
 }
 @Test void serializesDifferentVisitorsAtGlobalLimit() throws Exception {
  var cookies=new ArrayList<String>();var assets=new ArrayList<String>();for(int n=0;n<6;n++){String c=session();cookies.add(c);assets.add(asset(c));}
  var pool=Executors.newFixedThreadPool(6);var start=new CountDownLatch(1);var futures=new ArrayList<Future<Integer>>();
  try{
   for(int n=0;n<6;n++){final int i=n;futures.add(pool.submit(()->{start.await();return submit(cookies.get(i),assets.get(i)).getStatusCode().value();}));}
   start.countDown();var results=new ArrayList<Integer>();for(var f:futures)results.add(f.get(10,TimeUnit.SECONDS));
   assertThat(results.stream().filter(v->v==202).count()).isEqualTo(3);assertThat(results.stream().filter(v->v==429).count()).isEqualTo(3);
   assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job WHERE status IN ('QUEUED','RUNNING')",Integer.class)).isEqualTo(3);
  }finally{pool.shutdownNow();}
 }
 @Test void replaysExistingKeyBeforeQuotaAndNeverCreatesAnotherReceipt() throws Exception {
  String cookie=session(),asset=asset(cookie);var headers=new HttpHeaders();headers.set("Cookie",cookie);headers.setContentType(MediaType.APPLICATION_JSON);headers.set("Idempotency-Key","quota-replay");
  var first=http.exchange("/api/jobs",HttpMethod.POST,new HttpEntity<>(body(asset),headers),com.fasterxml.jackson.databind.JsonNode.class);
  assertThat(submit(cookie,asset).getStatusCode().value()).isEqualTo(202);
  int before=jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class);
  var replay=http.exchange("/api/jobs",HttpMethod.POST,new HttpEntity<>(body(asset),headers),com.fasterxml.jackson.databind.JsonNode.class);
  assertThat(replay.getStatusCode().value()).isEqualTo(202);assertThat(replay.getBody().path("job").path("id")).isEqualTo(first.getBody().path("job").path("id"));assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class)).isEqualTo(before);
 }
}

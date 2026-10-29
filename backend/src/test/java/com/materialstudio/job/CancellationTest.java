package com.materialstudio.job;
import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
class CancellationTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 @Autowired PipelineState state;
 @Test void cancelQueuedAndRunningTasksIsPrivateIdempotentAndPreventsCompletion() throws Exception {
  String owner=session();var body=Map.of("templateId","demo-portrait","assetIds",List.of(asset(owner)));
  String first=call("/api/jobs",HttpMethod.POST,owner,body).getBody().path("job").path("id").asText();
  String second=call("/api/jobs",HttpMethod.POST,owner,body).getBody().path("job").path("id").asText();
  assertThat(call("/api/jobs/"+second,HttpMethod.GET,owner,null).getBody().path("job").path("queueAhead").asInt()).isGreaterThanOrEqualTo(1);
  assertThat(call("/api/jobs/"+first+"/cancel",HttpMethod.POST,session(),null).getStatusCode().value()).isEqualTo(404);
  assertThat(state.start(first,Simulation.Stage.ASSET_CHECK)).isTrue();
  var cancelled=call("/api/jobs/"+first+"/cancel",HttpMethod.POST,owner,null);assertThat(cancelled.getStatusCode().value()).isEqualTo(200);assertThat(cancelled.getBody().path("job").path("errorCode").asText()).isEqualTo("JOB_CANCELLED");
  assertThat(state.complete(first,Simulation.Stage.ASSET_CHECK,null)).isFalse();assertThat(state.start(first,Simulation.Stage.GENERATE)).isFalse();
  assertThat(call("/api/jobs/"+first+"/cancel",HttpMethod.POST,owner,null).getBody()).isEqualTo(cancelled.getBody());
  assertThat(call("/api/jobs/"+second+"/cancel",HttpMethod.POST,owner,null).getStatusCode().value()).isEqualTo(200);assertThat(state.start(second,Simulation.Stage.ASSET_CHECK)).isFalse();
  assertThat(call("/api/jobs?status=CANCELLED",HttpMethod.GET,owner,null).getBody().path("items").size()).isEqualTo(2);
 }
}

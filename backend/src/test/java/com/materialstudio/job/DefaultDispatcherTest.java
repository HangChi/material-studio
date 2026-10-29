package com.materialstudio.job;
import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
class DefaultDispatcherTest extends ApiTestSupport {
 @Test void unavailableWorkerNeverLeavesAnUnexecutableQueuedTask() throws Exception {
  String owner=session();
  var response=call("/api/jobs",HttpMethod.POST,owner,Map.of("templateId","demo-portrait","assetIds",List.of(asset(owner))));
  assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
  var job=response.getBody().path("job");
  assertThat(job.path("status").asText()).isEqualTo("FAILED");
  assertThat(job.path("errorCode").asText()).isEqualTo("PROCESSOR_NOT_AVAILABLE");
  assertThat(job.path("stage").isNull()).isTrue();
  assertThat(call("/api/jobs/"+job.path("id").asText(),HttpMethod.GET,owner,null).getBody().path("job")).isEqualTo(job);
 }
}

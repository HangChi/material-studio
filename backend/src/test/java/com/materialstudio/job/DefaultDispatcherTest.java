package com.materialstudio.job;
import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
class DefaultDispatcherTest extends ApiTestSupport {
 @Test void defaultDispatcherExecutesTheRealPipeline() throws Exception {
  String owner=session();
  var response=call("/api/jobs",HttpMethod.POST,owner,Map.of("templateId","demo-portrait","assetIds",List.of(asset(owner)),
          "simulation",Map.of("stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0))));
  assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
  String id=response.getBody().path("job").path("id").asText();
  for(int n=0;n<100;n++) {
   var job=call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job");
   if(job.path("status").asText().equals("SUCCEEDED")) { assertThat(job.path("resultUrl").asText()).endsWith("/result");return; }
   Thread.sleep(20);
  }
  throw new AssertionError("default background dispatcher did not finish");
 }
}

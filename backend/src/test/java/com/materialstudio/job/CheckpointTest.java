package com.materialstudio.job;

import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@TestPropertySource(properties="studio.retry-backoff-ms=0")
class CheckpointTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 @MockitoSpyBean ResultStore results;
 @MockitoSpyBean TemplateRenderer renderer;
 @Autowired PipelineWorker worker;
 String submit(String cookie) throws Exception {
  return call("/api/jobs",HttpMethod.POST,cookie,Map.of("templateId","demo-portrait","assetIds",List.of(asset(cookie)),"simulation",Map.of("stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0)))).getBody().path("job").path("id").asText();
 }
 @Test void resumesCompletedGenerationAfterTemporaryFinalizeFailureWithoutRecomputing() throws Exception {
  String cookie=session(),id=submit(cookie);
  doThrow(new java.io.IOException("temporary finalization failure")).doCallRealMethod().when(results).publish(eq(id),any(java.awt.image.BufferedImage.class));
  worker.execute(id);
  assertThat(call("/api/jobs/"+id,HttpMethod.GET,cookie,null).getBody().path("job").path("status").asText()).isEqualTo("QUEUED");
  worker.execute(id);
  var done=call("/api/jobs/"+id,HttpMethod.GET,cookie,null).getBody().path("job");
  assertThat(done.path("status").asText()).isEqualTo("SUCCEEDED");assertThat(done.path("attempt").asInt()).isEqualTo(2);
  verify(renderer,times(1)).render(eq("demo-portrait"),anyString(),anyList());
  assertThat(call("/api/jobs/"+id+"/events",HttpMethod.GET,cookie,null).getBody().toString()).contains("RESUMED");
 }
}

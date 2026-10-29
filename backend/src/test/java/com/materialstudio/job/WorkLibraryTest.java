package com.materialstudio.job;
import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
class WorkLibraryTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 @Test void managesWorksAndFiltersFullHistoryWithoutExposingOtherOwners() throws Exception {
  String owner=session();var body=Map.of("templateId","demo-portrait","assetIds",List.of(asset(owner)));String id=call("/api/jobs",HttpMethod.POST,owner,body).getBody().path("job").path("id").asText();
  var renamed=call("/api/jobs/"+id+"/library",HttpMethod.PATCH,owner,Map.of("displayName","海边旅行","favorite",true));assertThat(renamed.getStatusCode().value()).isEqualTo(200);assertThat(renamed.getBody().path("job").path("displayName").asText()).isEqualTo("海边旅行");
  assertThat(call("/api/jobs?q=旅行&favorite=true",HttpMethod.GET,owner,null).getBody().path("items").size()).isEqualTo(1);
  assertThat(call("/api/jobs?q=不存在",HttpMethod.GET,owner,null).getBody().path("items").size()).isZero();
  assertThat(call("/api/jobs?templateId=demo-postcard",HttpMethod.GET,owner,null).getBody().path("items").size()).isZero();
  assertThat(call("/api/jobs?from=2099-01-01T00:00:00Z",HttpMethod.GET,owner,null).getBody().path("items").size()).isZero();
  assertThat(call("/api/jobs?from=invalid",HttpMethod.GET,owner,null).getStatusCode().value()).isEqualTo(400);
  call("/api/jobs/"+id+"/library",HttpMethod.PATCH,owner,Map.of("hidden",true));assertThat(call("/api/jobs",HttpMethod.GET,owner,null).getBody().path("items").size()).isZero();assertThat(call("/api/jobs?hidden=true",HttpMethod.GET,owner,null).getBody().path("items").size()).isEqualTo(1);
  call("/api/jobs/"+id+"/library",HttpMethod.PATCH,owner,Map.of("hidden",false));assertThat(call("/api/jobs",HttpMethod.GET,owner,null).getBody().path("items").size()).isEqualTo(1);
  assertThat(call("/api/jobs/"+id+"/library",HttpMethod.PATCH,session(),Map.of("favorite",false)).getStatusCode().value()).isEqualTo(404);
  assertThat(call("/api/jobs/"+id+"/library",HttpMethod.PATCH,owner,Map.of("displayName"," ")).getStatusCode().value()).isEqualTo(422);
 }
}

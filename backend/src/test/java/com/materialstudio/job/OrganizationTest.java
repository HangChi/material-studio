package com.materialstudio.job;
import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.nio.file.*;
import java.util.*;
import java.util.zip.ZipInputStream;
import java.io.ByteArrayInputStream;
import static org.assertj.core.api.Assertions.assertThat;
class OrganizationTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 String job(String cookie)throws Exception{String id=call("/api/jobs",HttpMethod.POST,cookie,Map.of("templateId","demo-portrait","assetIds",List.of(asset(cookie)))).getBody().path("job").path("id").asText();jdbc.update("UPDATE job SET status='SUCCEEDED',stage='FINALIZE',result_path=?,finished_at=CURRENT_TIMESTAMP(6) WHERE id=?",id+".png",id);Files.createDirectories(STORAGE.resolve("results"));Files.write(STORAGE.resolve("results/"+id+".png"),image("png"));return id;}
 @Test void normalizesTagsAndFiltersTheWholeOwnedHistory()throws Exception{
  String cookie=session(),id=job(cookie);var response=call("/api/works/bulk",HttpMethod.POST,cookie,Map.of("ids",List.of(id),"tags",List.of(" 旅行 ","旅行","A"),"favorite",true));assertThat(response.getStatusCode().value()).isEqualTo(200);
  var unchanged=call("/api/works/bulk",HttpMethod.POST,cookie,Map.of("ids",List.of(id),"tags",List.of("旅行","A")));assertThat(unchanged.getBody().path("items").get(0).path("displayName").isNull()).isTrue();
  var tags=call("/api/jobs/"+id+"/tags",HttpMethod.GET,cookie,null).getBody().path("items");assertThat(tags.toString()).isEqualTo("[\"a\",\"旅行\"]");
  assertThat(call("/api/jobs?tag=旅行",HttpMethod.GET,cookie,null).getBody().path("items").size()).isEqualTo(1);
  assertThat(call("/api/jobs?tag=missing",HttpMethod.GET,cookie,null).getBody().path("items").size()).isZero();
 }
 @Test void distinguishesAccentedTagsAfterNormalization()throws Exception{
  String cookie=session(),id=job(cookie);var r=call("/api/works/bulk",HttpMethod.POST,cookie,Map.of("ids",List.of(id),"tags",List.of("cafe","café")));assertThat(r.getStatusCode().value()).isEqualTo(200);assertThat(call("/api/jobs/"+id+"/tags",HttpMethod.GET,cookie,null).getBody().path("items").size()).isEqualTo(2);
 }
 @Test void rejectsWholeBulkForForeignOrInvalidSelection()throws Exception{
  String cookie=session(),mine=job(cookie),foreign=job(session());
  assertThat(call("/api/works/bulk",HttpMethod.POST,cookie,Map.of("ids",List.of(mine,foreign),"favorite",true)).getStatusCode().value()).isEqualTo(404);
  assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job_library WHERE job_id=? AND favorite=TRUE",Integer.class,mine)).isZero();
  assertThat(call("/api/works/bulk",HttpMethod.POST,cookie,Map.of("ids",List.of(mine,mine),"hidden",true)).getStatusCode().value()).isEqualTo(422);
  assertThat(call("/api/works/bulk",HttpMethod.POST,cookie,Map.of("ids",List.of(mine),"tags",List.of("a".repeat(21)))).getStatusCode().value()).isEqualTo(422);
 }
 @Test void archiveContainsExactlySelectedOwnedPngsAndRejectsForeignFiles()throws Exception{
  String cookie=session(),a=job(cookie),b=job(cookie),foreign=job(session());HttpHeaders h=new HttpHeaders();h.set("Cookie",cookie);h.setContentType(MediaType.APPLICATION_JSON);
  var result=http.exchange("/api/works/archive",HttpMethod.POST,new HttpEntity<>(Map.of("ids",List.of(a,b)),h),byte[].class);assertThat(result.getStatusCode().value()).isEqualTo(200);assertThat(result.getHeaders().getFirst("Content-Type")).contains("application/zip");
  var names=new ArrayList<String>();try(var zip=new ZipInputStream(new ByteArrayInputStream(result.getBody()))){java.util.zip.ZipEntry e;while((e=zip.getNextEntry())!=null){names.add(e.getName());assertThat(zip.readAllBytes()).isEqualTo(image("png"));}}
  assertThat(names).containsExactly(a+".png",b+".png");assertThat(call("/api/works/archive",HttpMethod.POST,cookie,Map.of("ids",List.of(a,foreign))).getStatusCode().value()).isEqualTo(404);
 }
}

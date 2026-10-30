package com.materialstudio.job;

import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.net.URI;
import java.net.http.*;
import java.io.*;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;

@TestPropertySource(properties={"studio.stream-interval-ms=50","studio.stream-duration-ms=3000","studio.stream-max=3","studio.stream-per-user=2"})
@Timeout(15)
class JobStreamApiTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 @Autowired JobStreamService streams;
 @Autowired com.fasterxml.jackson.databind.ObjectMapper json;
 @LocalServerPort int port;
 private final HttpClient client=HttpClient.newHttpClient();
 String submit(String cookie)throws Exception{return call("/api/jobs",HttpMethod.POST,cookie,Map.of("templateId","demo-portrait","assetIds",List.of(asset(cookie)))).getBody().path("job").path("id").asText();}
 HttpResponse<InputStream> open(String cookie,String ids)throws Exception{var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/jobs/stream?ids="+ids)).header("Accept","text/event-stream").timeout(java.time.Duration.ofSeconds(5));if(cookie!=null)builder.header("Cookie",cookie);return client.send(builder.build(),HttpResponse.BodyHandlers.ofInputStream());}
 HttpResponse<InputStream> live(String cookie,String ids)throws Exception{var r=open(cookie,ids);if(r.statusCode()!=200){r.body().close();assertThat(r.statusCode()).isEqualTo(200);}return r;}
 record Frame(String event,String data){}
 Frame frame(BufferedReader reader)throws Exception{String event="",data="";for(int n=0;n<200;n++){String line=reader.readLine();if(line==null)throw new AssertionError("Unexpected stream EOF");if(line.isEmpty())return new Frame(event,data);if(line.startsWith("event:"))event=line.substring(6).strip();if(line.startsWith("data:"))data+=line.substring(5).strip();}throw new AssertionError("Oversized frame");}
 Frame next(BufferedReader reader,String wanted)throws Exception{for(int n=0;n<20;n++){var f=frame(reader);if(f.event().equals(wanted))return f;}throw new AssertionError("Expected "+wanted);}
 void released()throws Exception{for(int n=0;n<100&&streams.activeCount()!=0;n++)Thread.sleep(50);assertThat(streams.activeCount()).isZero();}
 @Test void emitsCurrentSnapshotsUpdatesVersionsAndClosesAtTerminalWithoutMutating()throws Exception{
  String cookie=session(),id=submit(cookie);var before=jdbc.queryForList("SELECT * FROM job WHERE id=?",id);var response=live(cookie,id);
  assertThat(response.headers().firstValue("content-type").orElse("")).contains("text/event-stream");assertThat(response.headers().firstValue("cache-control").orElse("")).contains("no-store");assertThat(response.headers().firstValue("x-accel-buffering").orElse("")).isEqualTo("no");
  try(var input=response.body();var reader=new BufferedReader(new InputStreamReader(input,java.nio.charset.StandardCharsets.UTF_8))){
   var first=next(reader,"jobs");assertThat(json.readTree(first.data()).path("items").get(0).path("id").asText()).isEqualTo(id);assertThat(first.data()).doesNotContain("ownerId","token","lease_owner","resultPath");assertThat(jdbc.queryForList("SELECT * FROM job WHERE id=?",id)).isEqualTo(before);
   jdbc.update("UPDATE job SET status='RUNNING',stage='ASSET_CHECK',version=1 WHERE id=?",id);assertThat(json.readTree(next(reader,"jobs").data()).path("items").get(0).path("version").asInt()).isEqualTo(1);
   jdbc.update("UPDATE job SET status='SUCCEEDED',stage='FINALIZE',version=2,result_path=CONCAT(id,'.png'),finished_at=CURRENT_TIMESTAMP(6) WHERE id=?",id);assertThat(next(reader,"jobs").data()).contains("SUCCEEDED");assertThat(reader.read()).isEqualTo(-1);
  }released();
 }
 @Test void rejectsUnauthenticatedForeignDuplicateAndOversizedSubscriptions()throws Exception{
  String cookie=session(),id=submit(cookie),foreign=submit(session());
  var anonymous=open(null,id);try(var input=anonymous.body()){assertThat(anonymous.statusCode()).isEqualTo(401);}
  for(var sample:Map.of(foreign,404,UUID.randomUUID().toString(),404,"invalid",400,id+","+id,400,String.join(",",java.util.stream.IntStream.range(0,51).mapToObj(n->UUID.randomUUID().toString()).toList()),400).entrySet()){
   var r=open(cookie,sample.getKey());try(var input=r.body()){assertThat(r.statusCode()).as(sample.getKey()).isEqualTo(sample.getValue());assertThat(r.headers().firstValue("content-type").orElse("")).contains("application/json");}
  }assertThat(streams.activeCount()).isZero();
 }
 @Test void enforcesPerOwnerAndProcessLimitsAndReleasesDisconnectedReaders()throws Exception{
  String a=session(),b=session(),one=submit(a),two=submit(b);var responses=new ArrayList<HttpResponse<InputStream>>();
  try{
   responses.add(live(a,one));responses.add(live(a,one));var rejected=open(a,one);try(var input=rejected.body()){assertThat(rejected.statusCode()).isEqualTo(429);assertThat(rejected.headers().firstValue("retry-after").orElse("")).isEqualTo("60");}
   responses.add(live(b,two));var full=open(b,two);try(var input=full.body()){assertThat(full.statusCode()).isEqualTo(429);}assertThat(streams.activeCount()).isEqualTo(3);
   assertThat(call("/api/jobs/"+one,HttpMethod.GET,a,null).getStatusCode().value()).isEqualTo(200);
  }finally{for(var response:responses)response.body().close();}released();
 }
 @Test void revocationSendsExpiredAndClosesWithoutFurtherSnapshots()throws Exception{
  String cookie=session(),id=submit(cookie);var response=live(cookie,id);
  try(var input=response.body();var reader=new BufferedReader(new InputStreamReader(input,java.nio.charset.StandardCharsets.UTF_8))){next(reader,"jobs");assertThat(call("/api/session",HttpMethod.DELETE,cookie,null).getStatusCode().value()).isEqualTo(204);var expired=next(reader,"expired");assertThat(expired.data()).doesNotContain(id);assertThat(reader.read()).isEqualTo(-1);}released();
 }
}

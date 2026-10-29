package com.materialstudio.job;

import com.materialstudio.ApiTestSupport;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import java.nio.file.*;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;

class PipelineApiTest extends ApiTestSupport {
    private JsonNode submit(String owner, Object simulation) throws Exception {
        var body=new LinkedHashMap<String,Object>();body.put("templateId","demo-portrait");body.put("assetIds",List.of(asset(owner)));
        if(simulation!=null) body.put("simulation",simulation);
        var response=call("/api/jobs",HttpMethod.POST,owner,body);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        return response.getBody().path("job");
    }
    private Map<String,Object> fast() { return Map.of("stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0)); }
    private JsonNode waitDatabase(String id) throws Exception {
        long deadline=System.nanoTime()+java.util.concurrent.TimeUnit.SECONDS.toNanos(8);
        while(System.nanoTime()<deadline) {
            String status=jdbc.queryForObject("SELECT status FROM job WHERE id=?",String.class,id);
            if(List.of("SUCCEEDED","FAILED").contains(status)) return null;
            Thread.sleep(20);
        }
        throw new AssertionError("worker did not finish without HTTP queries");
    }
    @Test void executesWithoutQueriesAndPublishesSixOrderedEventsAndPrivatePng() throws Exception {
        String owner=session(),stranger=session();String id=submit(owner,null).path("id").asText();
        waitDatabase(id);
        var job=call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job");
        assertThat(job.path("status").asText()).isEqualTo("SUCCEEDED");assertThat(job.path("version").asLong()).isEqualTo(6);
        assertThat(job.path("stage").asText()).isEqualTo("FINALIZE");
        var events=call("/api/jobs/"+id+"/events",HttpMethod.GET,owner,null);
        assertThat(events.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<String> sequence=new ArrayList<>();events.getBody().path("items").forEach(e->sequence.add(e.path("stage").asText()+":"+e.path("kind").asText()));
        assertThat(sequence).containsExactly("ASSET_CHECK:STARTED","ASSET_CHECK:COMPLETED","GENERATE:STARTED","GENERATE:COMPLETED","FINALIZE:STARTED","FINALIZE:COMPLETED");
        var headers=new HttpHeaders();headers.set("Cookie",owner);
        var result=http.exchange("/api/jobs/"+id+"/result",HttpMethod.GET,new HttpEntity<>(headers),byte[].class);
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);assertThat(result.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_PNG);
        assertThat(result.getHeaders().getCacheControl()).contains("no-store");assertThat(result.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(result.getBody()))).isNotNull();
        for(String path:List.of("/events","/result")) {
            assertThat(call("/api/jobs/"+id+path,HttpMethod.GET,stranger,null).getStatusCode().value()).isEqualTo(404);
            assertThat(call("/api/jobs/"+id+path,HttpMethod.GET,null,null).getStatusCode().value()).isEqualTo(401);
        }
        for(int i=0;i<10;i++) assertThat(call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job")).isEqualTo(job);
        assertThat(jdbc.queryForMap("SELECT check_ms,generate_ms,finalize_ms FROM job_execution WHERE job_id=?",id).values()).containsOnly(2000);
    }
    @Test void filePublicationFailureIsTerminalAndDoesNotExposeResult() throws Exception {
        String owner=session();
        var config=Map.of("stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",800));
        String id=submit(owner,config).path("id").asText();
        Path collision=STORAGE.resolve("results").resolve(id+".png");Files.createDirectories(collision);
        try {
            waitDatabase(id);
            var job=call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job");
            assertThat(job.path("status").asText()).isEqualTo("FAILED");assertThat(job.path("stage").asText()).isEqualTo("FINALIZE");
            assertThat(job.path("resultUrl").isNull()).isTrue();assertThat(job.path("errorMessage").asText()).doesNotContain(STORAGE.toString());
            assertThat(call("/api/jobs/"+id+"/result",HttpMethod.GET,owner,null).getStatusCode().value()).isEqualTo(404);
        } finally { Files.deleteIfExists(collision); }
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"ASSET_CHECK","GENERATE","FINALIZE"})
    void specifiedFailureStopsLaterStages(String stage) throws Exception {
        String owner=session();var config=new HashMap<String,Object>(fast());config.put("failStage",stage);
        String id=submit(owner,config).path("id").asText();waitDatabase(id);
        var job=call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job");
        assertThat(job.path("status").asText()).isEqualTo("FAILED");assertThat(job.path("stage").asText()).isEqualTo(stage);
        assertThat(job.path("errorCode").asText()).isEqualTo("SIMULATED_FAILURE");assertThat(job.path("resultUrl").isNull()).isTrue();
        var events=call("/api/jobs/"+id+"/events",HttpMethod.GET,owner,null).getBody().path("items");
        int expected=2*(List.of("ASSET_CHECK","GENERATE","FINALIZE").indexOf(stage)+1);
        assertThat(events.size()).isEqualTo(expected);assertThat(events.get(expected-1).path("kind").asText()).isEqualTo("FAILED");
        for(int n=0;n<10;n++) assertThat(call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job")).isEqualTo(job);
    }
    @Test void simulationIsValidatedBeforeAdmissionAndAllowsBoundaries() throws Exception {
        String owner=session(),asset=asset(owner);int before=jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class);
        for(int delay:List.of(-1,10001)) {
            var body=Map.of("templateId","demo-portrait","assetIds",List.of(asset),"simulation",Map.of("stageDurationsMs",Map.of("GENERATE",delay)));
            assertThat(call("/api/jobs",HttpMethod.POST,owner,body).getStatusCode().value()).isEqualTo(422);
        }
        for(Object config:List.of(Map.of("failStage","BOGUS"),Map.of("failStage",0),Map.of("stageDurationsMs",Map.of("GENERATE",1.5)),Map.of("stageDurationsMs",Map.of("GENERATE","20")),Map.of("extra",true),Map.of("stageDurationsMs",Map.of("BOGUS",0)))) {
            assertThat(call("/api/jobs",HttpMethod.POST,owner,Map.of("templateId","demo-portrait","assetIds",List.of(asset),"simulation",config)).getStatusCode().value()).isEqualTo(400);
        }
        var nullDelay=new HashMap<String,Object>();nullDelay.put("GENERATE",null);
        assertThat(call("/api/jobs",HttpMethod.POST,owner,Map.of("templateId","demo-portrait","assetIds",List.of(asset),"simulation",Map.of("stageDurationsMs",nullDelay))).getStatusCode().value()).isEqualTo(422);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class)).isEqualTo(before);
        String id=submit(owner,Map.of("failStage","ASSET_CHECK","stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",10000))).path("id").asText();waitDatabase(id);
        assertThat(jdbc.queryForObject("SELECT generate_ms FROM job_execution WHERE job_id=?",Integer.class,id)).isEqualTo(10000);
    }
    @Test void tasksQueueInOrderAndDoNotShareSimulationConfiguration() throws Exception {
        String owner=session();
        String first=submit(owner,Map.of("failStage","GENERATE","stageDurationsMs",Map.of("ASSET_CHECK",500,"GENERATE",0,"FINALIZE",0))).path("id").asText();
        String second=submit(owner,fast()).path("id").asText();waitDatabase(first);waitDatabase(second);
        assertThat(jdbc.queryForObject("SELECT status FROM job WHERE id=?",String.class,first)).isEqualTo("FAILED");
        assertThat(jdbc.queryForObject("SELECT status FROM job WHERE id=?",String.class,second)).isEqualTo("SUCCEEDED");
        var finished=jdbc.queryForObject("SELECT finished_at FROM job WHERE id=?",java.sql.Timestamp.class,first);
        var started=jdbc.queryForObject("SELECT MIN(created_at) FROM job_event WHERE job_id=?",java.sql.Timestamp.class,second);
        assertThat(started).isAfterOrEqualTo(finished);
    }
}

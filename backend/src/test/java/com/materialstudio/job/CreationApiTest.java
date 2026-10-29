package com.materialstudio.job;

import com.materialstudio.ApiTestSupport;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.*;
import org.springframework.http.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class CreationApiTest extends ApiTestSupport {
    @MockitoBean JobDispatcher dispatcher;
    @BeforeEach void resetMock() { reset(dispatcher); }
    private ResponseEntity<JsonNode> keyed(String owner,String key,Object body) {
        var headers=new HttpHeaders();headers.setContentType(MediaType.APPLICATION_JSON);headers.set("Cookie",owner);headers.set("Idempotency-Key",key);
        return http.exchange("/api/jobs",HttpMethod.POST,new HttpEntity<>(body,headers),JsonNode.class);
    }
    @Test void concurrentReplayCreatesAndDispatchesOnceAndDifferentPayloadConflicts() throws Exception {
        String owner=session(),key=UUID.randomUUID().toString();
        var body=Map.of("templateId","demo-portrait","assetIds",List.of(asset(owner)));
        try(var pool=Executors.newFixedThreadPool(4)) {
            var futures=new ArrayList<Future<ResponseEntity<JsonNode>>>();
            for(int i=0;i<4;i++)futures.add(pool.submit(()->keyed(owner,key,body)));
            Set<String> ids=new HashSet<>();
            for(var future:futures){var response=future.get(10,TimeUnit.SECONDS);assertThat(response.getStatusCode().value()).isEqualTo(202);ids.add(response.getBody().path("job").path("id").asText());}
            assertThat(ids).hasSize(1);verify(dispatcher,times(1)).dispatch(ids.iterator().next());
        }
        var changed=Map.of("templateId","demo-portrait","assetIds",List.of(asset(owner)));
        assertThat(keyed(owner,key,changed).getStatusCode().value()).isEqualTo(409);
        String stranger=session();
        assertThat(keyed(stranger,key,Map.of("templateId","demo-portrait","assetIds",List.of(asset(stranger)))).getStatusCode().value()).isEqualTo(202);
    }
    @Test void invalidKeysAreRejectedAndValidationDoesNotConsumeKey() throws Exception {
        String owner=session(),key=UUID.randomUUID().toString();String asset=asset(owner);
        var body=Map.of("templateId","demo-portrait","assetIds",List.of(asset));
        assertThat(keyed(owner,"invalid key",body).getStatusCode().value()).isEqualTo(400);
        assertThat(keyed(owner,"a".repeat(81),body).getStatusCode().value()).isEqualTo(400);
        assertThat(keyed(owner,key,Map.of("templateId","missing","assetIds",List.of(asset))).getStatusCode().value()).isEqualTo(404);
        assertThat(keyed(owner,key,body).getStatusCode().value()).isEqualTo(202);
    }

    @org.springframework.beans.factory.annotation.Autowired PipelineWorker worker;
    private ResponseEntity<JsonNode> recreate(String owner,String id,String key) {
        var headers=new HttpHeaders();headers.set("Cookie",owner);if(key!=null)headers.set("Idempotency-Key",key);
        return http.exchange("/api/jobs/"+id+"/recreate",HttpMethod.POST,new HttpEntity<>(null,headers),JsonNode.class);
    }
    @Test void failedRetryCreatesLinkedTaskWithoutFailureAndReplaysAfterAssetLoss() throws Exception {
        String owner=session(),asset=asset(owner);
        var body=Map.of("templateId","demo-portrait","assetIds",List.of(asset),"simulation",Map.of("failStage","GENERATE","stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0)));
        String old=keyed(owner,"original",body).getBody().path("job").path("id").asText();
        assertThat(recreate(owner,old,"busy").getStatusCode().value()).isEqualTo(409);
        worker.execute(old);var original=call("/api/jobs/"+old,HttpMethod.GET,owner,null).getBody();
        assertThat(original.path("job").path("status").asText()).isEqualTo("FAILED");
        var response=recreate(owner,old,"retry");assertThat(response.getStatusCode().value()).isEqualTo(202);
        String next=response.getBody().path("job").path("id").asText();assertThat(next).isNotEqualTo(old);
        worker.execute(next);
        assertThat(call("/api/jobs/"+next,HttpMethod.GET,owner,null).getBody().path("job").path("status").asText()).isEqualTo("SUCCEEDED");
        assertThat(call("/api/jobs/"+next+"/recipe",HttpMethod.GET,owner,null).getBody().path("sourceJobId").asText()).isEqualTo(old);
        assertThat(call("/api/jobs/"+old,HttpMethod.GET,owner,null).getBody()).isEqualTo(original);
        String filename=jdbc.queryForObject("SELECT storage_filename FROM asset WHERE id=?",String.class,asset);java.nio.file.Files.delete(STORAGE.resolve(filename));
        assertThat(recreate(owner,old,"retry").getBody().path("job").path("id").asText()).isEqualTo(next);
        assertThat(recreate(owner,old,"new-retry").getStatusCode().value()).isEqualTo(422);
        assertThat(recreate(owner,old,null).getStatusCode().value()).isEqualTo(400);
        String stranger=session();assertThat(recreate(stranger,old,"foreign").getStatusCode().value()).isEqualTo(404);
        assertThat(call("/api/jobs/"+old+"/recipe",HttpMethod.GET,stranger,null).getStatusCode().value()).isEqualTo(404);
    }
    @Test void successfulRemakeAndPrivateDownloadPreserveOriginalBytes() throws Exception {
        String owner=session();
        String old=keyed(owner,"success",Map.of("templateId","demo-portrait","assetIds",List.of(asset(owner)),"simulation",Map.of("stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0)))).getBody().path("job").path("id").asText();worker.execute(old);
        var headers=new HttpHeaders();headers.set("Cookie",owner);
        var download=http.exchange("/api/jobs/"+old+"/download",HttpMethod.GET,new HttpEntity<>(headers),byte[].class);
        var preview=http.exchange("/api/jobs/"+old+"/result",HttpMethod.GET,new HttpEntity<>(headers),byte[].class);
        assertThat(download.getStatusCode().value()).isEqualTo(200);assertThat(download.getHeaders().getFirst("Content-Disposition")).contains("attachment","material-"+old+".png");
        assertThat(download.getBody()).isEqualTo(preview.getBody());
        assertThat(recreate(owner,old,"remake").getStatusCode().value()).isEqualTo(202);
        assertThat(call("/api/jobs/"+old+"/download",HttpMethod.GET,session(),null).getStatusCode().value()).isEqualTo(404);
    }

    private Map<String,Object> parameters(String title,String format,double x) {
        return Map.of("title",title,"palette","OCEAN","format",format,"crops",List.of(Map.of("x",x,"y",0.5,"zoom",2),Map.of("x",0.5,"y",0.5,"zoom",1)));
    }
    private String coloredAsset(String owner,boolean split) throws Exception {
        var image=new java.awt.image.BufferedImage(200,100,java.awt.image.BufferedImage.TYPE_INT_RGB);
        var g=image.createGraphics();g.setColor(java.awt.Color.RED);g.fillRect(0,0,200,100);
        if(split){g.setColor(java.awt.Color.BLUE);g.fillRect(100,0,100,100);}else{g.setColor(java.awt.Color.GREEN);g.fillRect(0,0,200,100);}g.dispose();
        var out=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",out);
        return upload(owner,out.toByteArray(),"image/png").getBody().path("id").asText();
    }
    private java.awt.image.BufferedImage postcard(String owner,List<String> assets,Map<String,Object> params) throws Exception {
        var response=keyed(owner,UUID.randomUUID().toString(),Map.of("templateId","demo-postcard","assetIds",assets,"parameters",params,"simulation",Map.of("stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0))));
        assertThat(response.getStatusCode().value()).isEqualTo(202);String id=response.getBody().path("job").path("id").asText();worker.execute(id);
        assertThat(call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job").path("status").asText()).isEqualTo("SUCCEEDED");
        assertThat(call("/api/jobs/"+id+"/recipe",HttpMethod.GET,owner,null).getBody().path("parameters").path("title").asText()).isEqualTo(params.get("title"));
        assertThat(call("/api/jobs/"+id+"/events",HttpMethod.GET,owner,null).getBody().path("items").get(2).path("message").asText()).contains("图片合成");
        var remake=recreate(owner,id,UUID.randomUUID().toString());String next=remake.getBody().path("job").path("id").asText();
        assertThat(call("/api/jobs/"+next+"/recipe",HttpMethod.GET,owner,null).getBody().path("parameters")).isEqualTo(call("/api/jobs/"+id+"/recipe",HttpMethod.GET,owner,null).getBody().path("parameters"));
        var headers=new HttpHeaders();headers.set("Cookie",owner);
        byte[] bytes=http.exchange("/api/jobs/"+id+"/result",HttpMethod.GET,new HttpEntity<>(headers),byte[].class).getBody();
        return javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(bytes));
    }
    @Test void postcardRendersActualAssetsCropPaletteFormatAndChineseTitle() throws Exception {
        String owner=session();var assets=List.of(coloredAsset(owner,true),coloredAsset(owner,false));
        var left=postcard(owner,assets,parameters("旅途来信","LANDSCAPE",0));
        var right=postcard(owner,assets,parameters("旅途来信","SQUARE",1));
        assertThat(left.getWidth()).isEqualTo(1200);assertThat(left.getHeight()).isEqualTo(800);
        assertThat(right.getWidth()).isEqualTo(1000);assertThat(right.getHeight()).isEqualTo(1000);
        assertThat(left.getRGB(150,300)&0xffffff).isEqualTo(0xff0000);assertThat(right.getRGB(150,300)&0xffffff).isEqualTo(0x0000ff);
        assertThat(left.getRGB(800,300)&0xffffff).isEqualTo(0x00ff00);
        assertThat(new java.awt.Font("WenQuanYi Zen Hei",java.awt.Font.PLAIN,40).canDisplayUpTo("旅途来信")).isEqualTo(-1);
        var moved=postcard(owner,assets,parameters("旅途来信","LANDSCAPE",1));
        assertThat(moved.getRGB(150,300)&0xffffff).isEqualTo(0x0000ff);
        var titled=postcard(owner,assets,parameters("A different title","LANDSCAPE",0));
        boolean textDiffers=false;for(int y=640;y<720;y++)for(int x=50;x<1150;x++)if(titled.getRGB(x,y)!=left.getRGB(x,y))textDiffers=true;
        assertThat(textDiffers).isTrue();assertThat(titled.getRGB(150,300)).isEqualTo(left.getRGB(150,300));
        var cream=new HashMap<String,Object>(parameters("Another title","LANDSCAPE",0));cream.put("palette","CREAM");
        var other=postcard(owner,assets,cream);assertThat(other.getRGB(0,0)).isNotEqualTo(left.getRGB(0,0));
        boolean titleDiffers=false;for(int y=640;y<760;y++)for(int x=50;x<1150;x++)if(other.getRGB(x,y)!=left.getRGB(x,y))titleDiffers=true;
        assertThat(titleDiffers).isTrue();
    }
    @Test void invalidPostcardParametersDoNotCreateTasks() throws Exception {
        String owner=session();var assets=List.of(asset(owner),asset(owner));int before=jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class);
        var invalids=new ArrayList<Map<String,Object>>();invalids.add(parameters("x".repeat(41),"SQUARE",0));invalids.add(parameters("Title","SQUARE",-0.1));invalids.add(parameters("Title\nline","SQUARE",0));
        var missing=new HashMap<String,Object>(parameters("Title","SQUARE",0));missing.remove("crops");invalids.add(missing);
        for(var params:invalids)assertThat(keyed(owner,UUID.randomUUID().toString(),Map.of("templateId","demo-postcard","assetIds",assets,"parameters",params)).getStatusCode().value()).isEqualTo(422);
        assertThat(keyed(owner,"not-postcard",Map.of("templateId","demo-portrait","assetIds",List.of(assets.getFirst()),"parameters",parameters("Title","SQUARE",0))).getStatusCode().value()).isEqualTo(422);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job",Integer.class)).isEqualTo(before);
    }
}

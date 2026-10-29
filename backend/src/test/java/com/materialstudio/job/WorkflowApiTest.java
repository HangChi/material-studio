package com.materialstudio.job;
import com.materialstudio.ApiTestSupport;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
class WorkflowApiTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 @org.springframework.beans.factory.annotation.Autowired PipelineWorker worker;
 JsonNode create(String owner,String template,List<String> assets,Map<String,Object> extra) {
  var body=new HashMap<String,Object>(extra);body.put("templateId",template);body.put("assetIds",assets);body.put("simulation",Map.of("stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0)));
  var response=call("/api/jobs",HttpMethod.POST,owner,body);assertThat(response.getStatusCode().value()).isEqualTo(202);return response.getBody().path("job");
 }
 @Test void editedWorkCreatesNewLinkedTaskAndChecksSourceOwnershipAndTemplate() throws Exception {
  String owner=session();var assets=List.of(asset(owner),asset(owner));String old=create(owner,"demo-postcard",assets,Map.of()).path("id").asText();worker.execute(old);
  String next=create(owner,"demo-postcard",assets,Map.of("sourceJobId",old,"parameters",Map.of("title","新的来信","palette","OCEAN","format","SQUARE","crops",List.of(Map.of("x",0.5,"y",0.5,"zoom",1),Map.of("x",0.5,"y",0.5,"zoom",1))))).path("id").asText();
  assertThat(next).isNotEqualTo(old);assertThat(call("/api/jobs/"+next+"/recipe",HttpMethod.GET,owner,null).getBody().path("sourceJobId").asText()).isEqualTo(old);
  assertThat(call("/api/jobs/"+old+"/recipe",HttpMethod.GET,owner,null).getBody().path("parameters").path("title").asText()).isEqualTo("旅途来信");
  assertThat(call("/api/jobs",HttpMethod.POST,owner,Map.of("templateId","demo-portrait","assetIds",List.of(assets.getFirst()),"sourceJobId",old)).getStatusCode().value()).isEqualTo(422);
  String stranger=session();assertThat(call("/api/jobs",HttpMethod.POST,stranger,Map.of("templateId","demo-postcard","assetIds",List.of(asset(stranger),asset(stranger)),"sourceJobId",old)).getStatusCode().value()).isEqualTo(404);
 }

 String colorAsset(String owner,int color) throws Exception {
  var image=new java.awt.image.BufferedImage(80,80,java.awt.image.BufferedImage.TYPE_INT_RGB);var g=image.createGraphics();g.setColor(new java.awt.Color(color));g.fillRect(0,0,80,80);g.dispose();var out=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",out);return upload(owner,out.toByteArray(),"image/png").getBody().path("id").asText();
 }
 java.awt.image.BufferedImage result(String owner,String id) throws Exception {
  var headers=new HttpHeaders();headers.set("Cookie",owner);var response=http.exchange("/api/jobs/"+id+"/result",HttpMethod.GET,new HttpEntity<>(headers),byte[].class);assertThat(response.getStatusCode().value()).isEqualTo(200);return javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(response.getBody()));
 }
 @Test void portraitAndCollageUseActualUploadedPixelsInSlotOrder() throws Exception {
  String owner=session();String red=colorAsset(owner,0xff0000),green=colorAsset(owner,0x00ff00),blue=colorAsset(owner,0x0000ff);
  String portrait=create(owner,"demo-portrait",List.of(red),Map.of()).path("id").asText();worker.execute(portrait);var image=result(owner,portrait);assertThat(image.getWidth()).isEqualTo(1000);assertThat(image.getRGB(500,300)&0xffffff).isEqualTo(0xff0000);
  String collage=create(owner,"demo-collage",List.of(red,green,blue),Map.of()).path("id").asText();worker.execute(collage);image=result(owner,collage);assertThat(image.getWidth()).isEqualTo(1200);
  assertThat(image.getRGB(200,400)&0xffffff).isEqualTo(0xff0000);assertThat(image.getRGB(600,400)&0xffffff).isEqualTo(0x00ff00);assertThat(image.getRGB(1000,400)&0xffffff).isEqualTo(0x0000ff);
 }
}

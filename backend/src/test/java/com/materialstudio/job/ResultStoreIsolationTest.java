package com.materialstudio.job;
import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.UUID;
import java.nio.file.Files;
import static org.assertj.core.api.Assertions.assertThat;
class ResultStoreIsolationTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 @Autowired ResultStore results;
 @Test void latePublishForSameJobCannotReplaceAnEarlierPublishedFile()throws Exception{
  String id=UUID.randomUUID().toString();var image=new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB);String first=results.publish(id,image);byte[] winner=Files.readAllBytes(STORAGE.resolve("results/"+first));image.setRGB(0,0,0xffffff);String late=results.publish(id,image);image.flush();
  try{assertThat(late).isNotEqualTo(first);assertThat(Files.readAllBytes(STORAGE.resolve("results/"+first))).isEqualTo(winner);}finally{results.cleanup(first);results.cleanup(late);}
 }
}

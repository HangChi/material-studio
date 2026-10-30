package com.materialstudio.job;
import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;
class LeaseTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 @Autowired LeaseGuard leases;
 String submit()throws Exception{String cookie=session();return call("/api/jobs",HttpMethod.POST,cookie,Map.of("templateId","demo-portrait","assetIds",List.of(asset(cookie)),"simulation",Map.of("stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0)))).getBody().path("job").path("id").asText();}
 @Test void twelveConcurrentClaimantsProduceExactlyOneLease()throws Exception{
  String id=submit();var start=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(12);
  try{var futures=new ArrayList<Future<LeaseGuard.Claim>>();for(int n=0;n<12;n++)futures.add(pool.submit(()->{start.await();return leases.claim(id);}));start.countDown();var claims=new ArrayList<LeaseGuard.Claim>();for(var future:futures){var claim=future.get(10,TimeUnit.SECONDS);if(claim!=null)claims.add(claim);}assertThat(claims).hasSize(1);assertThat(claims.getFirst().generation()).isEqualTo(1);}finally{pool.shutdownNow();}
 }
}

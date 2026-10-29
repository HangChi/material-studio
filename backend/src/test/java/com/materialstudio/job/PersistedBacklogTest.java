package com.materialstudio.job;
import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
@TestPropertySource(properties={"studio.queue-capacity=1","studio.retry-backoff-ms=0"})
class PersistedBacklogTest extends ApiTestSupport {
 @Autowired JobMapper jobs;@Autowired EventMapper events;@Autowired PlatformTransactionManager manager;
 @Test void drainsPersistedBacklogLargerThanMemoryQueueWithoutDuplicateExecution() throws Exception {
  String cookie=session(),owner=call("/api/session",HttpMethod.GET,cookie,null).getBody().path("user").path("id").asText(),asset=asset(cookie);var ids=new ArrayList<String>();
  new TransactionTemplate(manager).executeWithoutResult(tx->{
   for(int i=0;i<6;i++){String id=UUID.randomUUID().toString();ids.add(id);Instant now=Instant.now().plusMillis(i);jobs.insert(new JobRow(id,owner,"demo-portrait","肖像","QUEUED",null,0,now,now,null,null,null,null));jobs.link(id,asset,0);events.configure(new Simulation(null,Map.of(Simulation.Stage.ASSET_CHECK,0,Simulation.Stage.GENERATE,0,Simulation.Stage.FINALIZE,0)).resolve(id));}
  });
  long deadline=System.nanoTime()+java.util.concurrent.TimeUnit.SECONDS.toNanos(10);
  while(System.nanoTime()<deadline){if(ids.stream().allMatch(id->"SUCCEEDED".equals(jdbc.queryForObject("SELECT status FROM job WHERE id=?",String.class,id))))break;Thread.sleep(25);}
  for(String id:ids){assertThat(jdbc.queryForObject("SELECT status FROM job WHERE id=?",String.class,id)).isEqualTo("SUCCEEDED");assertThat(jdbc.queryForObject("SELECT attempt_count FROM job_runtime WHERE job_id=?",Integer.class,id)).isEqualTo(1);assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job_event WHERE job_id=?",Integer.class,id)).isEqualTo(6);}
 }
}

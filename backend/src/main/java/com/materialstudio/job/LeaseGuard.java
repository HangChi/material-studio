package com.materialstudio.job;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import java.util.*;
import java.util.concurrent.*;
@Service
public class LeaseGuard implements ApplicationRunner {
 public record Claim(String id,String owner,long generation){}
 private final ExecutionMapper execution;private final EventMapper events;private final TransactionTemplate tx;private final long millis;
 private final String owner=UUID.randomUUID().toString();private final ThreadLocal<Claim> context=new ThreadLocal<>();private final ConcurrentMap<String,Claim> active=new ConcurrentHashMap<>();
 private final ScheduledExecutorService heartbeat=Executors.newSingleThreadScheduledExecutor(r->new Thread(r,"material-lease-renewal"));
 public LeaseGuard(ExecutionMapper execution,EventMapper events,PlatformTransactionManager manager,@Value("${studio.lease-ms:15000}") long millis){if(millis<3000)throw new IllegalArgumentException("studio.lease-ms must be at least 3000");this.execution=execution;this.events=events;this.millis=millis;tx=new TransactionTemplate(manager);tx.setIsolationLevel(org.springframework.transaction.TransactionDefinition.ISOLATION_READ_COMMITTED);}
 public Claim claim(String id){return tx.execute(status->{var job=events.lock(id);if(job==null||!job.status().equals("QUEUED"))return null;execution.ensure(id);var lease=execution.lease(id);if(lease.alive())return null;var runtime=execution.runtime(id);if(runtime.availableAt()!=null&&runtime.availableAt().isAfter(java.time.Instant.now()))return null;execution.claim(id,owner,millis);return new Claim(id,owner,lease.leaseGeneration()+1);});}
 public boolean allowed(String id){var lease=execution.lease(id);var claim=context.get();if(claim==null)return lease==null||lease.leaseGeneration()==0;return claim.id().equals(id)&&lease!=null&&lease.alive()&&claim.owner().equals(lease.leaseOwner())&&claim.generation()==lease.leaseGeneration();}
 public boolean renew(Claim claim){return Boolean.TRUE.equals(tx.execute(status->{var job=events.lock(claim.id());return job!=null&&Set.of("QUEUED","RUNNING").contains(job.status())&&execution.renew(claim,millis)>0;}));}
 public void release(Claim claim){execution.release(claim);}
 public Scope enter(Claim claim){return new Scope(claim);}
 public final class Scope implements AutoCloseable {
  private final Claim claim,previous;
  private Scope(Claim claim){this.claim=claim;previous=context.get();context.set(claim);active.put(claim.id(),claim);}
  @Override public void close(){active.remove(claim.id(),claim);try{release(claim);}finally{if(Objects.equals(context.get(),claim)){if(previous==null)context.remove();else context.set(previous);}}}
 }
 @Override public void run(ApplicationArguments args){heartbeat.scheduleWithFixedDelay(()->{for(var claim:active.values())try{if(!renew(claim))active.remove(claim.id(),claim);}catch(org.springframework.dao.DataAccessException ignored){/* A later fence checks database expiry; errors never extend a lease locally. */}},millis/3,millis/3,TimeUnit.MILLISECONDS);}
 @jakarta.annotation.PreDestroy public void close(){heartbeat.shutdownNow();}
}

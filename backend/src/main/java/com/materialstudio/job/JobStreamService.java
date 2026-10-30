package com.materialstudio.job;

import com.materialstudio.common.ApiException;
import com.materialstudio.identity.SessionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.http.MediaType;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

@Service
public class JobStreamService {
 private final SessionService sessions;private final JobMapper jobs;private final long interval,duration;private final int maximum,perUser;
 private final ConcurrentMap<Long,Subscription> active=new ConcurrentHashMap<>();private final AtomicLong sequence=new AtomicLong();
 private final ScheduledExecutorService scheduler=Executors.newScheduledThreadPool(2,r->new Thread(r,"material-status-stream"));
 private static final class Subscription {
  final long id,created=System.nanoTime();final String owner,token;final List<String> ids;final SseEmitter emitter;final AtomicBoolean closed=new AtomicBoolean();
  volatile ScheduledFuture<?> task;List<JobView> last;long lastSignal=created;
  Subscription(long id,String owner,String token,List<String> ids,SseEmitter emitter,List<JobView> last){this.id=id;this.owner=owner;this.token=token;this.ids=ids;this.emitter=emitter;this.last=last;}
 }
 public JobStreamService(SessionService sessions,JobMapper jobs,@Value("${studio.stream-interval-ms:1000}") long interval,@Value("${studio.stream-duration-ms:55000}") long duration,@Value("${studio.stream-max:64}") int maximum,@Value("${studio.stream-per-user:2}") int perUser){if(interval<50||duration<1000||maximum<1||perUser<1)throw new IllegalArgumentException("Invalid stream bounds");this.sessions=sessions;this.jobs=jobs;this.interval=interval;this.duration=duration;this.maximum=maximum;this.perUser=perUser;}
 private List<String> parse(String text){
  if(text==null||text.length()>1900)throw invalid();var ids=Arrays.asList(text.split(",",-1));
  if(ids.isEmpty()||ids.size()>50||new HashSet<>(ids).size()!=ids.size()||ids.stream().anyMatch(id->!id.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")))throw invalid();return ids.stream().sorted().toList();
 }
 private ApiException invalid(){return new ApiException(400,"INVALID_REQUEST","请选择1～50个不重复的有效任务");}
 private List<JobView> snapshot(String owner,List<String> ids){var rows=jobs.ownedMany(owner,ids);if(rows.size()!=ids.size())throw new ApiException(404,"RESOURCE_NOT_FOUND","任务不存在或不可访问");return rows.stream().map(JobView::from).toList();}
 private boolean terminal(List<JobView> items){return items.stream().noneMatch(job->Set.of("QUEUED","RUNNING").contains(job.status()));}
 public synchronized SseEmitter open(String token,String text){
  String owner=sessions.require(token).id();var ids=parse(text);var initial=snapshot(owner,ids);
  if(active.size()>=maximum||active.values().stream().filter(s->s.owner.equals(owner)).count()>=perUser)throw new ApiException(429,"STREAM_LIMITED","实时连接已满，仍可使用状态查询");
  var emitter=new SseEmitter(duration+5000);var sub=new Subscription(sequence.incrementAndGet(),owner,token,ids,emitter,initial);
  emitter.onCompletion(()->finish(sub,false));emitter.onError(error->finish(sub,false));emitter.onTimeout(()->finish(sub,false));active.put(sub.id,sub);
  try{send(sub,"jobs",Map.of("items",initial));if(terminal(initial)){finish(sub,true);return emitter;}}
  catch(IOException|IllegalStateException error){finish(sub,true);throw new ApiException(503,"STREAM_UNAVAILABLE","实时状态暂时不可用，请使用状态查询");}
  sub.task=scheduler.scheduleWithFixedDelay(()->tick(sub),interval,interval,TimeUnit.MILLISECONDS);if(sub.closed.get())sub.task.cancel(false);return emitter;
 }
 private void send(Subscription sub,String event,Object data)throws IOException{sub.emitter.send(SseEmitter.event().name(event).data(data,MediaType.APPLICATION_JSON));sub.lastSignal=System.nanoTime();}
 private void tick(Subscription sub){
  if(sub.closed.get())return;
  try{
   if(System.nanoTime()-sub.created>=TimeUnit.MILLISECONDS.toNanos(duration)){finish(sub,true);return;}
   var user=sessions.current(sub.token);if(user==null||!user.id().equals(sub.owner)){send(sub,"expired",Map.of("reason","SESSION_EXPIRED"));finish(sub,true);return;}
   var current=snapshot(sub.owner,sub.ids);if(!current.equals(sub.last)){send(sub,"jobs",Map.of("items",current));sub.last=current;}
   if(terminal(current)){finish(sub,true);return;}
   if(System.nanoTime()-sub.lastSignal>=TimeUnit.MILLISECONDS.toNanos(Math.min(10000,duration/3)))send(sub,"heartbeat",Map.of("kind","keepalive"));
  }catch(IOException|IllegalStateException closed){finish(sub,false);}
  catch(RuntimeException unavailable){try{send(sub,"unavailable",Map.of("reason","STATUS_UNAVAILABLE"));}catch(IOException|IllegalStateException ignored){}finish(sub,true);}
 }
 private void finish(Subscription sub,boolean complete){if(!sub.closed.compareAndSet(false,true))return;active.remove(sub.id,sub);var task=sub.task;if(task!=null)task.cancel(false);if(complete)sub.emitter.complete();}
 public int activeCount(){return active.size();}
 @jakarta.annotation.PreDestroy public void close(){for(var sub:active.values())finish(sub,true);scheduler.shutdownNow();}
}

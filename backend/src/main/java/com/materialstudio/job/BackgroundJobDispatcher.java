package com.materialstudio.job;

import org.springframework.stereotype.Component;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import jakarta.annotation.PreDestroy;
import java.util.*;
import java.util.concurrent.*;

@Component
public class BackgroundJobDispatcher implements JobDispatcher,ApplicationRunner {
 private final PipelineWorker worker;private final PipelineState state;private final ExecutionMapper execution;
 private final ThreadPoolExecutor executor;private final ScheduledExecutorService scanner;
 private final Set<String> scheduled=new HashSet<>();private volatile boolean ready;
 public BackgroundJobDispatcher(PipelineWorker worker,PipelineState state,ExecutionMapper execution,@Value("${studio.queue-capacity:16}") int capacity){
  this.worker=worker;this.state=state;this.execution=execution;
  executor=new ThreadPoolExecutor(1,1,0,TimeUnit.MILLISECONDS,new ArrayBlockingQueue<>(capacity),r->new Thread(r,"material-pipeline"),new ThreadPoolExecutor.AbortPolicy());
  scanner=Executors.newSingleThreadScheduledExecutor(r->new Thread(r,"material-recovery-scan"));
 }
 @Override public synchronized void run(ApplicationArguments args){
  ready=false;state.recoverUnfinished();ready=true;
  if(args!=null)scanner.scheduleWithFixedDelay(this::scan,0,250,TimeUnit.MILLISECONDS);
 }
 @Override public synchronized void dispatch(String id){
  if(!ready)throw new RejectedExecutionException("Pipeline not ready");
  if(!scheduled.add(id))return;
  try{executor.execute(()->{try{worker.execute(id);}finally{synchronized(this){scheduled.remove(id);}}});}
  catch(RuntimeException error){scheduled.remove(id);throw error;}
 }
 private synchronized void scan(){
  if(!ready)return;
  try{for(String id:execution.ready()){
   if(scheduled.contains(id))continue;
   try{dispatch(id);}catch(RejectedExecutionException full){break;}
  }}catch(org.springframework.dao.DataAccessException unavailable){/* Persisted queued tasks are retried on the next scan. */}
 }
 @PreDestroy public void close(){
  synchronized(this){ready=false;scanner.shutdownNow();executor.shutdownNow();}
  try{executor.awaitTermination(2,TimeUnit.SECONDS);}catch(InterruptedException error){Thread.currentThread().interrupt();}
 }
}

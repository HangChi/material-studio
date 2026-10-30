package com.materialstudio.job;

import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import java.util.Objects;
import static com.materialstudio.job.Simulation.Stage;

@Service
public class PipelineState {
    private final EventMapper events;private final ExecutionMapper execution;private final long backoff;private final CheckpointMapper checkpoints;private final CheckpointStore checkpointFiles;
    private final TransactionTemplate transaction;
    private final LeaseGuard leases;
    public PipelineState(EventMapper events,PlatformTransactionManager manager,ExecutionMapper execution,@org.springframework.beans.factory.annotation.Value("${studio.retry-backoff-ms:1000}") long backoff,CheckpointMapper checkpoints,CheckpointStore checkpointFiles,LeaseGuard leases) { this.leases=leases;this.checkpointFiles=checkpointFiles;this.checkpoints=checkpoints;this.events=events;this.execution=execution;this.backoff=Math.max(0,backoff);transaction=new TransactionTemplate(manager); }
    public boolean resume(String id,Stage after) {
        return Boolean.TRUE.equals(transaction.execute(tx->{
            var job=events.lock(id);if(job==null||!job.status().equals("QUEUED")||!leases.allowed(id))return false;execution.ensure(id);var run=execution.runtime(id);
            if(run.availableAt()!=null&&run.availableAt().isAfter(Instant.now()))return false;
            if(execution.begin(id)==0){write(job,"FAILED",null,"FAILED",null,"RETRY_EXHAUSTED","已达到三次执行上限","执行次数已耗尽");return false;}
            write(job,"RUNNING",after.name(),"RESUMED",null,null,null,"从"+label(after,job.templateId())+"断点恢复");return true;
        }));
    }
    public boolean start(String id,Stage stage) {
        return Boolean.TRUE.equals(transaction.execute(tx->{
            var job=events.lock(id);if(job==null||!leases.allowed(id))return false;
            if(stage==Stage.ASSET_CHECK) {
                if(!job.status().equals("QUEUED"))return false;execution.ensure(id);var run=execution.runtime(id);
                if(run.availableAt()!=null&&run.availableAt().isAfter(Instant.now()))return false;
                if(execution.begin(id)==0){write(job,"FAILED",null,"FAILED",null,"RETRY_EXHAUSTED","已达到三次执行上限","执行次数已耗尽");return false;}
            }
            else {
                var history=events.events(id);
                Stage previous=Stage.values()[stage.ordinal()-1];
                if(!job.status().equals("RUNNING")||!Objects.equals(job.stage(),previous.name())||history.isEmpty()||!java.util.Set.of("COMPLETED","RESUMED").contains(history.getLast().kind()))return false;
            }
            write(job,"RUNNING",stage.name(),"STARTED",null,null,null,label(stage,job.templateId())+"开始");return true;
        }));
    }
    public boolean complete(String id,Stage stage,String result) {
        return complete(id,stage,result,null);
    }
    public boolean complete(String id,Stage stage,String result,CheckpointMapper.Checkpoint checkpoint) {
        return Boolean.TRUE.equals(transaction.execute(tx->{
            var job=events.lock(id);if(job==null||!leases.allowed(id)||!job.status().equals("RUNNING")||!stage.name().equals(job.stage()))return false;
            var history=events.events(id);if(history.isEmpty()||!history.getLast().kind().equals("STARTED"))return false;
            boolean done=stage==Stage.FINALIZE;
            if(done && result==null)throw new IllegalArgumentException("Result required");
            if(checkpoint!=null){
                if(!checkpoint.jobId().equals(id)||!checkpoint.stage().equals(stage.name()))throw new IllegalArgumentException("Checkpoint does not match stage");
                var old=checkpoints.find(id,stage.name());checkpoints.save(checkpoint);
                if(old!=null&&old.artifactPath()!=null)org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization(){@Override public void afterCommit(){checkpointFiles.discard(old);}});
            }
            write(job,done?"SUCCEEDED":"RUNNING",stage.name(),"COMPLETED",result,null,null,label(stage,job.templateId())+"完成");return true;
        }));
    }
    public JobView cancel(String id,String owner) {
        var cancelled=transaction.execute(tx->{
            var job=events.lock(id);if(job==null||!job.ownerId().equals(owner))throw new com.materialstudio.common.ApiException(404,"RESOURCE_NOT_FOUND","任务不存在");
            if("JOB_CANCELLED".equals(job.errorCode()))return JobView.from(job);
            if(!isUnfinished(job))throw new com.materialstudio.common.ApiException(409,"JOB_NOT_CANCELLABLE","已结束的任务无法取消");
            write(job,"FAILED",job.stage(),"FAILED",null,"JOB_CANCELLED","制作已取消","用户已取消制作，后续阶段停止");return JobView.from(events.find(id));
        });
        if(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive())org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization(){@Override public void afterCommit(){checkpointFiles.cleanupTerminal(id);}});
        else checkpointFiles.cleanupTerminal(id);
        return cancelled;
    }
    public void fail(String id,String code,String message) {
        transaction.executeWithoutResult(tx->{
            var job=events.lock(id);if(job==null||!isUnfinished(job)||!leases.allowed(id))return;
            write(job,"FAILED",job.stage(),code.equals("PROCESS_INTERRUPTED")?"INTERRUPTED":"FAILED",null,code,message,message);
        });
    }
    public void retry(String id,String code,String message) {
        transaction.executeWithoutResult(tx->{
            var job=events.lock(id);if(job==null||!isUnfinished(job)||!leases.allowed(id))return;execution.ensure(id);
            // A claimed execution that failed before its first stage still consumes the budget.
            if(job.status().equals("QUEUED"))execution.begin(id);
            var run=execution.runtime(id);
            if(run.attemptCount()>=3){write(job,"FAILED",job.stage(),"FAILED",null,code,message+"，已达到三次执行上限",message+"，不再自动重试");return;}
            execution.defer(id,Instant.now().plusMillis(backoff*run.attemptCount()));
            write(job,"QUEUED",null,"INTERRUPTED",null,null,null,message+"，等待自动重新执行（已执行"+run.attemptCount()+"次）");
        });
    }
    public void recoverUnfinished(){
        for(String id:events.unfinished())recoverExpired(id);
    }
    public void recoverExpired(String id){
        transaction.executeWithoutResult(tx->{
            var job=events.lock(id);if(job==null||!job.status().equals("RUNNING"))return;execution.ensure(id);if(execution.lease(id).alive())return;
            execution.clearExpired(id);var run=execution.runtime(id);
            if(run.attemptCount()>=3){write(job,"FAILED",job.stage(),"FAILED",null,"PROCESS_INTERRUPTED","执行租约到期，已达到三次执行上限","执行租约到期，不再自动重试");return;}
            execution.defer(id,Instant.now().plusMillis(backoff*run.attemptCount()));
            write(job,"QUEUED",null,"INTERRUPTED",null,null,null,"执行租约到期或旧服务中断，等待接管恢复");
        });
        checkpointFiles.cleanupTerminal(id);
    }
    public void interruptUnfinished() {
        for(String id:events.unfinished())fail(id,"PROCESS_INTERRUPTED","服务已中断，任务未完成，请重新提交");
    }
    private boolean isUnfinished(JobRow job) { return job.status().equals("QUEUED")||job.status().equals("RUNNING"); }
    private void write(JobRow job,String status,String stage,String kind,String result,String code,String error,String message) {
        Instant now=Instant.now();long version=job.version()+1;
        boolean terminal=status.equals("SUCCEEDED")||status.equals("FAILED");
        events.update(new EventMapper.Transition(job.id(),status,stage,version,now,terminal?now:null,result,code,error));
        events.append(job.id(),new EventMapper.Event(version,stage,kind,now,message));
    }
    public static String label(Stage stage,String template) { return stage==Stage.GENERATE?"图片合成":label(stage); }
    public static String label(Stage stage) { return switch(stage) { case ASSET_CHECK->"素材检查";case GENERATE->"模拟生成";case FINALIZE->"结果整理"; }; }
}

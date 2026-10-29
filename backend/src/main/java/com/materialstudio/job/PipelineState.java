package com.materialstudio.job;

import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import java.util.Objects;
import static com.materialstudio.job.Simulation.Stage;

@Service
public class PipelineState {
    private final EventMapper events;
    private final TransactionTemplate transaction;
    public PipelineState(EventMapper events,PlatformTransactionManager manager) { this.events=events;transaction=new TransactionTemplate(manager); }
    public boolean start(String id,Stage stage) {
        return Boolean.TRUE.equals(transaction.execute(tx->{
            var job=events.lock(id);if(job==null)return false;
            if(stage==Stage.ASSET_CHECK) { if(!job.status().equals("QUEUED"))return false; }
            else {
                var history=events.events(id);
                Stage previous=Stage.values()[stage.ordinal()-1];
                if(!job.status().equals("RUNNING")||!Objects.equals(job.stage(),previous.name())||history.isEmpty()||!history.getLast().kind().equals("COMPLETED"))return false;
            }
            write(job,"RUNNING",stage.name(),"STARTED",null,null,null,label(stage)+"开始");return true;
        }));
    }
    public boolean complete(String id,Stage stage,String result) {
        return Boolean.TRUE.equals(transaction.execute(tx->{
            var job=events.lock(id);if(job==null||!job.status().equals("RUNNING")||!stage.name().equals(job.stage()))return false;
            var history=events.events(id);if(history.isEmpty()||!history.getLast().kind().equals("STARTED"))return false;
            boolean done=stage==Stage.FINALIZE;
            if(done && result==null)throw new IllegalArgumentException("Result required");
            write(job,done?"SUCCEEDED":"RUNNING",stage.name(),"COMPLETED",result,null,null,label(stage)+"完成");return true;
        }));
    }
    public void fail(String id,String code,String message) {
        transaction.executeWithoutResult(tx->{
            var job=events.lock(id);if(job==null||!isUnfinished(job))return;
            write(job,"FAILED",job.stage(),"FAILED",null,code,message,message);
        });
    }
    private boolean isUnfinished(JobRow job) { return job.status().equals("QUEUED")||job.status().equals("RUNNING"); }
    private void write(JobRow job,String status,String stage,String kind,String result,String code,String error,String message) {
        Instant now=Instant.now();long version=job.version()+1;
        boolean terminal=status.equals("SUCCEEDED")||status.equals("FAILED");
        events.update(new EventMapper.Transition(job.id(),status,stage,version,now,terminal?now:null,result,code,error));
        events.append(job.id(),new EventMapper.Event(version,stage,kind,now,message));
    }
    public static String label(Stage stage) { return switch(stage) { case ASSET_CHECK->"素材检查";case GENERATE->"模拟生成";case FINALIZE->"结果整理"; }; }
}

package com.materialstudio.job;

import org.springframework.stereotype.Component;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import jakarta.annotation.PreDestroy;
import java.util.concurrent.*;

@Component
public class BackgroundJobDispatcher implements JobDispatcher,ApplicationRunner {
    private final PipelineWorker worker;
    private final PipelineState state;
    private final ThreadPoolExecutor executor;
    private volatile boolean ready;
    public BackgroundJobDispatcher(PipelineWorker worker,PipelineState state,@Value("${studio.queue-capacity:16}") int capacity) {
        this.worker=worker;this.state=state;
        executor=new ThreadPoolExecutor(1,1,0,TimeUnit.MILLISECONDS,new ArrayBlockingQueue<>(capacity),
                runnable->new Thread(runnable,"material-pipeline"),new ThreadPoolExecutor.AbortPolicy());
    }
    @Override public synchronized void run(ApplicationArguments args) {
        ready=false;state.interruptUnfinished();ready=true;
    }
    @Override public synchronized void dispatch(String id) {
        if(!ready)throw new RejectedExecutionException("Pipeline not ready");
        executor.execute(()->worker.execute(id));
    }
    @PreDestroy public synchronized void close() {
        ready=false;executor.shutdownNow();
        try { executor.awaitTermination(2,TimeUnit.SECONDS); }
        catch(InterruptedException e) { Thread.currentThread().interrupt(); }
        state.interruptUnfinished();
    }
}

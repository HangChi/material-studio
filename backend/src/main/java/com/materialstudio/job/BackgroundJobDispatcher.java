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
    private final ThreadPoolExecutor executor;
    private volatile boolean ready;
    public BackgroundJobDispatcher(PipelineWorker worker,@Value("${studio.queue-capacity:16}") int capacity) {
        this.worker=worker;
        executor=new ThreadPoolExecutor(1,1,0,TimeUnit.MILLISECONDS,new ArrayBlockingQueue<>(capacity),
                runnable->new Thread(runnable,"material-pipeline"),new ThreadPoolExecutor.AbortPolicy());
    }
    @Override public void run(ApplicationArguments args) { ready=true; }
    @Override public void dispatch(String id) {
        if(!ready)throw new RejectedExecutionException("Pipeline not ready");
        executor.execute(()->worker.execute(id));
    }
    @PreDestroy public void close() { ready=false;executor.shutdownNow(); }
}

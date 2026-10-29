package com.materialstudio.job;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Component;

@Component
public class QueueScanMonitor {
    private final AtomicLong failures=new AtomicLong();
    private volatile Instant lastSuccessAt;
    public record Snapshot(long failures,Instant lastSuccessAt) {}
    public long failed(){return failures.incrementAndGet();}
    public void succeeded(){lastSuccessAt=Instant.now();}
    public Snapshot snapshot(){return new Snapshot(failures.get(),lastSuccessAt);}
}

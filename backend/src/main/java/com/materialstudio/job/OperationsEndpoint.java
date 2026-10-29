package com.materialstudio.job;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.*;
import org.springframework.web.bind.annotation.*;

/** Internal container-network monitoring only; deliberately absent from the Next API allowlist. */
@RestController
public class OperationsEndpoint {
    private final OperationsMapper mapper;
    private final QueueScanMonitor monitor;

    public OperationsEndpoint(OperationsMapper mapper,QueueScanMonitor monitor) {
        this.mapper=mapper;
        this.monitor=monitor;
    }

    @GetMapping("/actuator/studio")
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public ResponseEntity<?> snapshot() {
        var counts=mapper.counts();
        long completed=counts.succeeded()+counts.failed();
        double failureRate=completed==0?0:(double)counts.failed()/completed;
        return ResponseEntity.ok().header("Cache-Control","no-store").body(Map.of(
                "counts",counts,"failureRate",failureRate,"queue",mapper.queue(),
                "stages",mapper.stages(),"retries",mapper.retries(),"scanner",monitor.snapshot()));
    }
}

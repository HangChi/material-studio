package com.materialstudio.storage;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.Map;
@RestController
@RequestMapping("/actuator/storage")
public class StorageEndpoint {
 private final StorageLifecycle lifecycle;public StorageEndpoint(StorageLifecycle lifecycle){this.lifecycle=lifecycle;}
 @GetMapping public ResponseEntity<?> report(){return ok(lifecycle.report());}
 @GetMapping("/audit") public ResponseEntity<?> audit(){return ok(Map.of("items",lifecycle.audit()));}
 @PostMapping("/quarantine") public ResponseEntity<?> quarantine(@RequestBody StorageLifecycle.Confirmation input){return ok(lifecycle.quarantine(input));}
 @PostMapping("/purge") public ResponseEntity<?> purge(@RequestBody StorageLifecycle.Confirmation input){return ok(lifecycle.purge(input));}
 private ResponseEntity<?> ok(Object body){return ResponseEntity.ok().header("Cache-Control","no-store").body(body);}
}

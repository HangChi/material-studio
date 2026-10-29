package com.materialstudio.batch;
import com.materialstudio.identity.SessionService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.Map;
@RestController
@RequestMapping("/api/batches")
public class BatchController {
 private final SessionService sessions;private final BatchService batches;
 public BatchController(SessionService sessions,BatchService batches){this.sessions=sessions;this.batches=batches;}
 @PostMapping public ResponseEntity<?> create(@CookieValue(name="material_session",required=false)String token,@RequestHeader(name="Idempotency-Key",required=false)String key,@RequestBody BatchService.Request input){return ResponseEntity.accepted().header("Cache-Control","no-store").body(Map.of("batch",batches.create(sessions.require(token).id(),key,input)));}
 @GetMapping public ResponseEntity<?> page(@CookieValue(name="material_session",required=false)String token,@RequestParam(defaultValue="20")int limit,@RequestParam(required=false)String cursor){return ok(batches.page(sessions.require(token).id(),limit,cursor));}
 @GetMapping("/{id}") public ResponseEntity<?> get(@CookieValue(name="material_session",required=false)String token,@PathVariable String id){return ok(Map.of("batch",batches.get(sessions.require(token).id(),id)));}
 @PostMapping("/{id}/cancel") public ResponseEntity<?> cancel(@CookieValue(name="material_session",required=false)String token,@PathVariable String id){return ok(Map.of("batch",batches.cancel(sessions.require(token).id(),id)));}
 private ResponseEntity<?> ok(Object body){return ResponseEntity.ok().header("Cache-Control","no-store").body(body);}
}

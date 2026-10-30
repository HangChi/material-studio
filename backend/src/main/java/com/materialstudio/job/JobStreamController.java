package com.materialstudio.job;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
@RestController
public class JobStreamController {
 private final JobStreamService streams;
 public JobStreamController(JobStreamService streams){this.streams=streams;}
 @GetMapping(value="/api/jobs/stream",produces=MediaType.TEXT_EVENT_STREAM_VALUE)
 public ResponseEntity<SseEmitter> stream(@CookieValue(name="material_session",required=false) String token,@RequestParam String ids){return ResponseEntity.ok().contentType(MediaType.TEXT_EVENT_STREAM).header("Cache-Control","no-store").header("X-Accel-Buffering","no").body(streams.open(token,ids));}
}

package com.materialstudio.job;

import com.materialstudio.identity.SessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.*;

@RestController
@RequestMapping("/api/jobs")
public class JobController {
    private final SessionService sessions;
    private final JobSubmissionService jobs;
    public JobController(SessionService sessions,JobSubmissionService jobs) { this.sessions=sessions;this.jobs=jobs; }
    @PostMapping
    public ResponseEntity<?> submit(@CookieValue(name="material_session",required=false) String token,@RequestBody JobSubmissionService.Request request) {
        var job=jobs.submit(sessions.require(token).id(),request);
        return ResponseEntity.accepted().location(URI.create("/api/jobs/"+job.id())).header("Cache-Control","no-store").body(Map.of("job",job));
    }
    @GetMapping("/{id}")
    public ResponseEntity<?> get(@CookieValue(name="material_session",required=false) String token,@PathVariable String id) {
        return ResponseEntity.ok().header("Cache-Control","no-store").body(Map.of("job",jobs.owned(id,sessions.require(token).id())));
    }
    @GetMapping
    public ResponseEntity<?> recent(@CookieValue(name="material_session",required=false) String token) {
        Map<String,Object> response=new LinkedHashMap<>();response.put("items",jobs.recent(sessions.require(token).id()));response.put("nextCursor",null);
        return ResponseEntity.ok().header("Cache-Control","no-store").body(response);
    }
}

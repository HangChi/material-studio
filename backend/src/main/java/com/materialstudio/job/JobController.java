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
    private final EventMapper events;
    private final ResultStore results;
    private final HistoryService history;
    public JobController(SessionService sessions,JobSubmissionService jobs,EventMapper events,ResultStore results,HistoryService history) { this.sessions=sessions;this.jobs=jobs;this.events=events;this.results=results;this.history=history; }
    @PostMapping
    public ResponseEntity<?> submit(@CookieValue(name="material_session",required=false) String token,@RequestBody JobSubmissionService.Request request,@RequestHeader(name="Idempotency-Key",required=false) String key) {
        var job=jobs.submit(sessions.require(token).id(),request,key);
        return ResponseEntity.accepted().location(URI.create("/api/jobs/"+job.id())).header("Cache-Control","no-store").body(Map.of("job",job));
    }
    @GetMapping("/{id}")
    public ResponseEntity<?> get(@CookieValue(name="material_session",required=false) String token,@PathVariable String id) {
        return ResponseEntity.ok().header("Cache-Control","no-store").body(Map.of("job",jobs.owned(id,sessions.require(token).id())));
    }
    @GetMapping
    public ResponseEntity<?> recent(@CookieValue(name="material_session",required=false) String token,
            @RequestParam(defaultValue="20") int limit,@RequestParam(required=false) String cursor) {
        return ResponseEntity.ok().header("Cache-Control","no-store").body(history.page(sessions.require(token).id(),limit,cursor));
    }
    @GetMapping("/active")
    public ResponseEntity<?> active(@CookieValue(name="material_session",required=false) String token) {
        return ResponseEntity.ok().header("Cache-Control","no-store").body(Map.of("items",history.active(sessions.require(token).id())));
    }
    @GetMapping("/{id}/events")
    public ResponseEntity<?> events(@CookieValue(name="material_session",required=false) String token,@PathVariable String id) {
        jobs.owned(id,sessions.require(token).id());
        return ResponseEntity.ok().header("Cache-Control","no-store").body(Map.of("items",events.events(id)));
    }
    @GetMapping("/{id}/result")
    public ResponseEntity<?> result(@CookieValue(name="material_session",required=false) String token,@PathVariable String id) {
        jobs.owned(id,sessions.require(token).id());
        return ResponseEntity.ok().contentType(org.springframework.http.MediaType.IMAGE_PNG).header("Cache-Control","no-store").header("X-Content-Type-Options","nosniff").body(results.read(events.find(id)));
    }
    @PostMapping("/{id}/recreate")
    public ResponseEntity<?> recreate(@CookieValue(name="material_session",required=false) String token,@PathVariable String id,@RequestHeader(name="Idempotency-Key",required=false) String key) {
        var job=jobs.recreate(id,sessions.require(token).id(),key);
        return ResponseEntity.accepted().location(URI.create("/api/jobs/"+job.id())).header("Cache-Control","no-store").body(Map.of("job",job));
    }
    @GetMapping("/{id}/recipe")
    public ResponseEntity<?> recipe(@CookieValue(name="material_session",required=false) String token,@PathVariable String id) {
        return ResponseEntity.ok().header("Cache-Control","no-store").body(jobs.recipe(id,sessions.require(token).id()));
    }
    @GetMapping("/{id}/download")
    public ResponseEntity<?> download(@CookieValue(name="material_session",required=false) String token,@PathVariable String id) {
        jobs.owned(id,sessions.require(token).id());
        return ResponseEntity.ok().contentType(org.springframework.http.MediaType.IMAGE_PNG)
            .header("Cache-Control","no-store").header("X-Content-Type-Options","nosniff")
            .header("Content-Disposition","attachment; filename=\"material-"+id+".png\"").body(results.read(events.find(id)));
    }
}

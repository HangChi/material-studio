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
    private final HistoryService history;private final PipelineState state;
    public JobController(SessionService sessions,JobSubmissionService jobs,EventMapper events,ResultStore results,HistoryService history,PipelineState state) { this.sessions=sessions;this.jobs=jobs;this.events=events;this.results=results;this.history=history;this.state=state; }
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
            @RequestParam(defaultValue="20") int limit,@RequestParam(required=false) String cursor,@RequestParam(required=false) String q,@RequestParam(required=false) String templateId,@RequestParam(required=false) String status,@RequestParam(required=false) String from,@RequestParam(required=false) String to,@RequestParam(required=false) Boolean favorite,@RequestParam(defaultValue="false") boolean hidden) {
        return ResponseEntity.ok().header("Cache-Control","no-store").body(history.page(sessions.require(token).id(),limit,cursor,new HistoryService.Filter(q,templateId,status,instant(from),instant(to),favorite,hidden)));
    }
    private java.time.Instant instant(String value){try{return value==null?null:java.time.Instant.parse(value);}catch(java.time.format.DateTimeParseException e){throw new com.materialstudio.common.ApiException(400,"INVALID_REQUEST","筛选时间格式不正确");}}
    @PatchMapping("/{id}/library")
    public ResponseEntity<?> update(@CookieValue(name="material_session",required=false) String token,@PathVariable String id,@RequestBody HistoryService.Update value){return ResponseEntity.ok().header("Cache-Control","no-store").body(Map.of("job",history.update(sessions.require(token).id(),id,value)));}
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
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@CookieValue(name="material_session",required=false) String token,@PathVariable String id){return ResponseEntity.ok().header("Cache-Control","no-store").body(Map.of("job",state.cancel(id,sessions.require(token).id())));}
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

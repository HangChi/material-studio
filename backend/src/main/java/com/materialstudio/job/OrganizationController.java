package com.materialstudio.job;
import com.materialstudio.identity.SessionService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import java.util.Map;
@RestController
public class OrganizationController {
 private final SessionService sessions;private final OrganizationService organization;
 public OrganizationController(SessionService sessions,OrganizationService organization){this.sessions=sessions;this.organization=organization;}
 @GetMapping("/api/jobs/{id}/tags") public ResponseEntity<?> tags(@CookieValue(name="material_session",required=false)String token,@PathVariable String id){return ResponseEntity.ok().header("Cache-Control","no-store").body(Map.of("items",organization.tags(sessions.require(token).id(),id)));}
 @PostMapping("/api/works/bulk") public ResponseEntity<?> update(@CookieValue(name="material_session",required=false)String token,@RequestBody OrganizationService.Update input){return ResponseEntity.ok().header("Cache-Control","no-store").body(Map.of("items",organization.update(sessions.require(token).id(),input)));}
 @PostMapping("/api/works/archive") public ResponseEntity<?> archive(@CookieValue(name="material_session",required=false)String token,@RequestBody OrganizationService.Selection input){return ResponseEntity.ok().header("Cache-Control","no-store").header("Content-Disposition","attachment; filename=\"works.zip\"").contentType(MediaType.parseMediaType("application/zip")).body(organization.archive(sessions.require(token).id(),input));}
}

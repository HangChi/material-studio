package com.materialstudio.identity;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/session")
public class SessionController {
    private final SessionService sessions;
    private final boolean secure;
    public SessionController(SessionService sessions, @Value("${studio.cookie-secure:false}") boolean secure) { this.sessions = sessions; this.secure = secure; }
    @PostMapping
    public ResponseEntity<?> create(@CookieValue(name="material_session", required=false) String token) {
        DemoUser user = sessions.current(token);
        var response = ResponseEntity.ok().header("Cache-Control", "no-store");
        if (user == null) { token = sessions.newToken(); user = sessions.create(token); response.header(HttpHeaders.SET_COOKIE, cookie(token, 31536000).toString()); }
        return response.body(body(user));
    }
    @GetMapping
    public ResponseEntity<?> current(@CookieValue(name="material_session", required=false) String token) {
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(body(sessions.require(token)));
    }
    @DeleteMapping
    public ResponseEntity<?> delete(@CookieValue(name="material_session", required=false) String token) {
        sessions.revoke(token);
        return ResponseEntity.noContent().header("Cache-Control", "no-store").header(HttpHeaders.SET_COOKIE, cookie("", 0).toString()).build();
    }
    private Map<String, Object> body(DemoUser user) { return Map.of("user", Map.of("id",user.id(),"createdAt",user.createdAt())); }
    private ResponseCookie cookie(String token, long maxAge) { return ResponseCookie.from("material_session", token).httpOnly(true).secure(secure).sameSite("Lax").path("/").maxAge(maxAge).build(); }
}

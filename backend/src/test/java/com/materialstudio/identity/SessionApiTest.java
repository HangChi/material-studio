package com.materialstudio.identity;

import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import static org.assertj.core.api.Assertions.assertThat;

class SessionApiTest extends ApiTestSupport {
    @Test void createsSecureAnonymousIdentityAndReusesIt() {
        var created = call("/api/session", HttpMethod.POST, null, null);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.OK);
        String setCookie = created.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).contains("HttpOnly", "SameSite=Lax", "Path=/");
        String cookie = setCookie.split(";", 2)[0];
        String id = created.getBody().path("user").path("id").asText();
        assertThat(id).hasSize(36);
        var existing = call("/api/session", HttpMethod.POST, cookie, null);
        assertThat(existing.getBody().path("user").path("id").asText()).isEqualTo(id);
        assertThat(call("/api/session", HttpMethod.GET, cookie, null).getBody().path("user").path("id").asText()).isEqualTo(id);
        String stored = jdbc.queryForObject("SELECT token_hash FROM demo_user WHERE id=?", String.class, id);
        assertThat(stored).hasSize(64).isNotEqualTo(cookie.substring(cookie.indexOf('=') + 1));
        assertThat(created.getBody().toString()).doesNotContain("token", "hash");
    }
    @Test void revokedIdentityCannotAuthenticateAndNewIdentityIsDifferent() {
        String cookie = session();
        String oldId = call("/api/session", HttpMethod.GET, cookie, null).getBody().path("user").path("id").asText();
        var deleted = call("/api/session", HttpMethod.DELETE, cookie, null);
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(deleted.getHeaders().getFirst(HttpHeaders.SET_COOKIE)).contains("Max-Age=0");
        assertThat(call("/api/session", HttpMethod.GET, cookie, null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        var next = call("/api/session", HttpMethod.POST, cookie, null);
        assertThat(next.getBody().path("user").path("id").asText()).isNotEqualTo(oldId);
    }
    @Test void missingIdentityHasAnActionable401() {
        var response = call("/api/session", HttpMethod.GET, null, null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody().path("error").path("code").asText()).isEqualTo("UNAUTHENTICATED");
    }
}

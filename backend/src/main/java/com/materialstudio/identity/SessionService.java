package com.materialstudio.identity;

import com.materialstudio.common.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class SessionService {
    private final UserMapper users;
    private final SecureRandom random = new SecureRandom();
    public SessionService(UserMapper users) { this.users = users; }
    public DemoUser current(String token) { return token == null || token.length() != 43 ? null : users.find(hash(token)); }
    public DemoUser require(String token) {
        DemoUser user = current(token);
        if (user == null) throw new ApiException(401, "UNAUTHENTICATED", "访客身份已失效，请刷新后重试");
        return user;
    }
    public String newToken() { byte[] bytes = new byte[32]; random.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    public DemoUser create(String token) {
        DemoUser user = new DemoUser(UUID.randomUUID().toString(), hash(token), Instant.now(), true);
        users.insert(user); return user;
    }
    public void revoke(String token) { if (token != null) users.revoke(hash(token)); }
    private String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}

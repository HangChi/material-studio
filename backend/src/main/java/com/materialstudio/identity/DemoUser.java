package com.materialstudio.identity;
import java.time.Instant;
public record DemoUser(String id, String tokenHash, Instant createdAt, boolean active) {}

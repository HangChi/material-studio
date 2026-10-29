package com.materialstudio.asset;
import java.time.Instant;
public record AssetRow(String id, String ownerId, String storageFilename, String mimeType, long sizeBytes, Instant createdAt) {}

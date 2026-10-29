package com.materialstudio.job;
import java.time.Instant;
public record JobRow(String id,String ownerId,String templateId,String templateTitle,String status,String stage,long version,
                     Instant createdAt,Instant updatedAt,Instant finishedAt,String resultPath,String errorCode,String errorMessage) {}

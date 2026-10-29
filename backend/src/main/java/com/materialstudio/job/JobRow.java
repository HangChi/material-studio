package com.materialstudio.job;
import java.time.Instant;
public record JobRow(String id,String ownerId,String templateId,String templateTitle,String status,String stage,long version,
                     Instant createdAt,Instant updatedAt,Instant finishedAt,String resultPath,String errorCode,String errorMessage,String displayName,boolean favorite,boolean hidden,Integer queueAhead) {
 public JobRow(String id,String ownerId,String templateId,String templateTitle,String status,String stage,long version,Instant createdAt,Instant updatedAt,Instant finishedAt,String resultPath,String errorCode,String errorMessage){this(id,ownerId,templateId,templateTitle,status,stage,version,createdAt,updatedAt,finishedAt,resultPath,errorCode,errorMessage,null,false,false,null);}
}

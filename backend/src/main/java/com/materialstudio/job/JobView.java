package com.materialstudio.job;
import java.time.Instant;
public record JobView(String id,String templateId,String templateTitle,String status,String stage,long version,
                      Instant createdAt,Instant updatedAt,Instant finishedAt,String resultUrl,String errorCode,String errorMessage,String displayName,boolean favorite,boolean hidden,Integer queueAhead) {
    public static JobView from(JobRow row) {
        return new JobView(row.id(),row.templateId(),row.templateTitle(),row.status(),row.stage(),row.version(),
                row.createdAt(),row.updatedAt(),row.finishedAt(),row.resultPath()==null?null:"/api/jobs/"+row.id()+"/result",row.errorCode(),row.errorMessage(),row.displayName(),row.favorite(),row.hidden(),row.queueAhead());
    }
}

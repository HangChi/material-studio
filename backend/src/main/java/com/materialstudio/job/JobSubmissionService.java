package com.materialstudio.job;

import com.materialstudio.asset.AssetService;
import com.materialstudio.common.ApiException;
import com.materialstudio.template.TemplateMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import java.util.*;

@Service
public class JobSubmissionService {
    public record Request(String templateId,List<String> assetIds,Simulation simulation) {
        public Request(String templateId,List<String> assetIds) { this(templateId,assetIds,null); }
    }
    private final JobMapper jobs;
    private final EventMapper events;
    private final TemplateMapper templates;
    private final AssetService assets;
    private final JobDispatcher dispatcher;
    private final TransactionTemplate transaction;
    public JobSubmissionService(JobMapper jobs,EventMapper events,TemplateMapper templates,AssetService assets,JobDispatcher dispatcher,PlatformTransactionManager manager) {
        this.jobs=jobs;this.events=events;this.templates=templates;this.assets=assets;this.dispatcher=dispatcher;this.transaction=new TransactionTemplate(manager);
    }
    public JobView submit(String owner,Request request) {
        if(request.templateId()==null || request.templateId().isBlank() || request.assetIds()==null || request.assetIds().isEmpty()
                || request.assetIds().size()>3 || request.assetIds().stream().anyMatch(id->id==null || id.isBlank())
                || new HashSet<>(request.assetIds()).size()!=request.assetIds().size()) throw invalid();
        String id=UUID.randomUUID().toString();
        var configuration=(request.simulation()==null?new Simulation(null,null):request.simulation()).resolve(id);
        transaction.executeWithoutResult(status -> {
            var template=templates.find(request.templateId());
            if(template==null) throw new ApiException(404,"RESOURCE_NOT_FOUND","模板不存在");
            if(request.assetIds().size()!=template.requiredImageCount()) throw invalid();
            for(String assetId:request.assetIds()) assets.ensureAvailable(assets.owned(assetId,owner));
            Instant now=Instant.now();
            jobs.insert(new JobRow(id,owner,template.id(),template.title(),"QUEUED",null,0,now,now,null,null,null,null));
            events.configure(configuration);
            for(int slot=0;slot<request.assetIds().size();slot++) jobs.link(id,request.assetIds().get(slot),slot);
        });
        // This boundary is intentionally outside the database transaction and never waits for a worker result.
        try { dispatcher.dispatch(id); }
        catch(RuntimeException rejected) {
            transaction.executeWithoutResult(status -> jobs.failQueued(id,"QUEUE_REJECTED",
                    "制作队列暂不可用，任务未开始处理",Instant.now()));
        }
        return owned(id,owner);
    }
    public JobView owned(String id,String owner) {
        JobRow row=jobs.owned(id,owner);
        if(row==null) throw new ApiException(404,"RESOURCE_NOT_FOUND","任务不存在或不可访问");
        return JobView.from(row);
    }
    public List<JobView> recent(String owner) { return jobs.recent(owner).stream().map(JobView::from).toList(); }
    private ApiException invalid() { return new ApiException(422,"VALIDATION_FAILED","素材数量不符或素材编号无效，请检查后重试"); }
}

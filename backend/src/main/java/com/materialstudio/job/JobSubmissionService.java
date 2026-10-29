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
    public record Request(String templateId,List<String> assetIds,Simulation simulation,PostcardParameters parameters) {
        public Request(String templateId,List<String> assetIds) { this(templateId,assetIds,null,null); }
        public Request(String templateId,List<String> assetIds,Simulation simulation) { this(templateId,assetIds,simulation,null); }
    }
    private final CreationMapper creation;
    private final com.fasterxml.jackson.databind.ObjectMapper json;
    private final JobMapper jobs;
    private final EventMapper events;
    private final TemplateMapper templates;
    private final AssetService assets;
    private final JobDispatcher dispatcher;
    private final TransactionTemplate transaction;
    public JobSubmissionService(JobMapper jobs,EventMapper events,TemplateMapper templates,AssetService assets,JobDispatcher dispatcher,PlatformTransactionManager manager,CreationMapper creation,com.fasterxml.jackson.databind.ObjectMapper json) {
        this.creation=creation;this.json=json;this.jobs=jobs;this.events=events;this.templates=templates;this.assets=assets;this.dispatcher=dispatcher;this.transaction=new TransactionTemplate(manager);
    }
    public JobView submit(String owner,Request request) { return submit(owner,request,null); }
    public JobView submit(String owner,Request request,String key) {
        return create(owner,request,key,null);
    }
    private JobView create(String owner,Request request,String key,String source) {
        validateKey(key);
        PostcardParameters parameters=parameters(request.templateId(),request.parameters());
        String fingerprint=fingerprint(request,parameters,source);
        if(request.templateId()==null || request.templateId().isBlank() || request.assetIds()==null || request.assetIds().isEmpty()
                || request.assetIds().size()>3 || request.assetIds().stream().anyMatch(id->id==null || id.isBlank())
                || new HashSet<>(request.assetIds()).size()!=request.assetIds().size()) throw invalid();
        String id=UUID.randomUUID().toString();
        var configuration=(request.simulation()==null?new Simulation(null,null):request.simulation()).resolve(id);
        boolean[] fresh={true};
        String[] accepted={id};
        transaction.executeWithoutResult(status -> {
            if(creation.lockOwner(owner)==null)throw new ApiException(401,"UNAUTHENTICATED","访客身份已失效");
            if(key!=null) {
                var previous=creation.receipt(owner,key);
                if(previous!=null) {
                    if(!previous.fingerprint().equals(fingerprint))throw new ApiException(409,"IDEMPOTENCY_CONFLICT","同一提交标识的内容不同，请核对原操作");
                    fresh[0]=false;accepted[0]=previous.jobId();return;
                }
            }
            var template=templates.find(request.templateId());
            if(template==null) throw new ApiException(404,"RESOURCE_NOT_FOUND","模板不存在");
            if(request.assetIds().size()!=template.requiredImageCount()) throw invalid();
            for(String assetId:request.assetIds()) assets.ensureAvailable(assets.owned(assetId,owner));
            Instant now=Instant.now();
            jobs.insert(new JobRow(id,owner,template.id(),template.title(),"QUEUED",null,0,now,now,null,null,null,null));
            events.configure(configuration);
            creation.save(new CreationMapper.Recipe(id,encode(parameters),source));
            if(key!=null)creation.remember(owner,key,fingerprint,id);
            for(int slot=0;slot<request.assetIds().size();slot++) jobs.link(id,request.assetIds().get(slot),slot);
        });
        // This boundary is intentionally outside the database transaction and never waits for a worker result.
        if(!fresh[0])return owned(accepted[0],owner);
        try { dispatcher.dispatch(id); }
        catch(RuntimeException rejected) {
            transaction.executeWithoutResult(status -> jobs.failQueued(id,"QUEUE_REJECTED",
                    "制作队列暂不可用，任务未开始处理",Instant.now()));
        }
        return owned(id,owner);
    }
    public record RecipeView(PostcardParameters parameters,String sourceJobId,List<String> assetIds) {}
    public RecipeView recipe(String id,String owner) {
        var job=owned(id,owner);var recipe=creation.recipe(id);
        return new RecipeView(readParameters(job.templateId(),recipe),recipe==null?null:recipe.sourceJobId(),events.assetIds(id));
    }
    public JobView recreate(String id,String owner,String key) {
        validateKey(key);if(key==null)throw new ApiException(400,"INVALID_IDEMPOTENCY_KEY","重新制作需要提交标识");
        var old=owned(id,owner);
        if(!Set.of("SUCCEEDED","FAILED").contains(old.status()))throw new ApiException(409,"JOB_NOT_FINISHED","任务尚未结束，请等待完成");
        var config=events.configuration(id);
        Simulation simulation=config==null?null:new Simulation(null,Map.of(Simulation.Stage.ASSET_CHECK,config.checkMs(),Simulation.Stage.GENERATE,config.generateMs(),Simulation.Stage.FINALIZE,config.finalizeMs()));
        return create(owner,new Request(old.templateId(),events.assetIds(id),simulation,readParameters(old.templateId(),creation.recipe(id))),key,id);
    }
    private PostcardParameters parameters(String template,PostcardParameters value) {
        if(!"demo-postcard".equals(template)) {
            if(value!=null)throw new ApiException(422,"INVALID_PARAMETERS","当前模板不支持自定义明信片参数");
            return null;
        }
        return (value==null?PostcardParameters.defaults():value).validate();
    }
    private String encode(PostcardParameters value) {
        if(value==null)return null;
        try { return json.writeValueAsString(value); }catch(java.io.IOException e){throw new IllegalStateException(e);}
    }
    public PostcardParameters readParameters(String template,CreationMapper.Recipe recipe) {
        try { return parameters(template,recipe==null||recipe.parametersJson()==null?null:json.readValue(recipe.parametersJson(),PostcardParameters.class)); }
        catch(java.io.IOException e){throw new IllegalStateException(e);}
    }
    private void validateKey(String key) {
        if(key!=null&&!key.matches("[A-Za-z0-9_-]{1,80}"))throw new ApiException(400,"INVALID_IDEMPOTENCY_KEY","提交标识格式不正确");
    }
    private String fingerprint(Request request,PostcardParameters parameters,String source) {
        try {
            var simulation=(request.simulation()==null?new Simulation(null,null):request.simulation()).resolve("");
            return HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(Arrays.asList(request.templateId(),request.assetIds(),simulation,parameters,source))));
        } catch(java.io.IOException|java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    public JobView owned(String id,String owner) {
        JobRow row=jobs.owned(id,owner);
        if(row==null) throw new ApiException(404,"RESOURCE_NOT_FOUND","任务不存在或不可访问");
        return JobView.from(row);
    }
    public List<JobView> recent(String owner) { return jobs.recent(owner).stream().map(JobView::from).toList(); }
    private ApiException invalid() { return new ApiException(422,"VALIDATION_FAILED","素材数量不符或素材编号无效，请检查后重试"); }
}

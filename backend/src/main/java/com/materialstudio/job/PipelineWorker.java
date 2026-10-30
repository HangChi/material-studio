package com.materialstudio.job;

import com.materialstudio.asset.AssetService;
import com.materialstudio.common.ApiException;
import com.materialstudio.template.TemplateMapper;
import org.springframework.stereotype.Service;
import static com.materialstudio.job.Simulation.Stage;

@Service
public class PipelineWorker {
    private static final org.slf4j.Logger LOG=org.slf4j.LoggerFactory.getLogger(PipelineWorker.class);
    private final PipelineState state;
    private final EventMapper events;
    private final AssetService assets;
    private final TemplateMapper templates;
    private final ResultStore results;
    private final PostcardRenderer renderer;
    private final TemplateRenderer templateRenderer;
    private final CreationMapper creation;
    private final CheckpointStore checkpoints;
    private final LeaseGuard leases;
    private final com.fasterxml.jackson.databind.ObjectMapper json;
    public PipelineWorker(PipelineState state,EventMapper events,AssetService assets,TemplateMapper templates,ResultStore results,PostcardRenderer renderer,CreationMapper creation,com.fasterxml.jackson.databind.ObjectMapper json,TemplateRenderer templateRenderer,CheckpointStore checkpoints,LeaseGuard leases) {
        this.leases=leases;this.checkpoints=checkpoints;this.state=state;this.events=events;this.assets=assets;this.templates=templates;this.results=results;this.renderer=renderer;this.creation=creation;this.json=json;this.templateRenderer=templateRenderer;
    }
    private PostcardParameters parameters(String id) throws java.io.IOException {
        var recipe=creation.recipe(id);
        return recipe==null||recipe.parametersJson()==null?PostcardParameters.defaults():json.readValue(recipe.parametersJson(),PostcardParameters.class);
    }
    public void execute(String id) {
        state.recoverExpired(id);var claim=leases.claim(id);if(claim==null)return;
        try(var scope=leases.enter(claim)){executeClaimed(id);}
    }
    private void executeClaimed(String id) {
        String published=null;java.awt.image.BufferedImage generated=null;CheckpointMapper.Checkpoint pending=null;
        try {
            var config=events.configuration(id);
            if(config==null)throw new IllegalStateException("Missing execution configuration");
            var job=events.find(id);
            if(job==null||!job.status().equals("QUEUED"))return;
            String input;
            try{input=checkpoints.input(job);}catch(ApiException|java.io.IOException invalid){if(!state.start(id,Stage.ASSET_CHECK))return;throw invalid;}
            var resume=checkpoints.restore(id,input);generated=resume.image();
            if(resume.stage()!=null&&!state.resume(id,resume.stage()))return;
            for(Stage stage:Stage.values()) {
                if(resume.stage()!=null&&stage.ordinal()<=resume.stage().ordinal())continue;
                if(!state.start(id,stage))return;
                Thread.sleep(config.delay(stage));
                if(config.failStage()==stage) { state.fail(id,"SIMULATED_FAILURE",PipelineState.label(stage,job.templateId())+"模拟失败");return; }
                if(stage==Stage.ASSET_CHECK) for(String assetId:events.assetIds(id))assets.ensureAvailable(assets.owned(assetId,job.ownerId()));
                if(stage==Stage.GENERATE)generated=job.templateId().equals("demo-postcard")?renderer.render(job.ownerId(),events.assetIds(id),parameters(id)):templateRenderer.render(job.templateId(),job.ownerId(),events.assetIds(id));
                if(stage==Stage.FINALIZE) published=generated==null?results.publish(id,templates.find(job.templateId()).coverFilename()):results.publish(id,generated);
                if(stage==Stage.ASSET_CHECK)pending=checkpoints.checked(id,input);
                if(stage==Stage.GENERATE)pending=checkpoints.generated(id,input,generated);
                if(!state.complete(id,stage,published,pending)) { results.cleanup(published);return; }
                pending=null;
            }
        } catch(InterruptedException e) {
            results.cleanup(published);state.retry(id,"PROCESS_INTERRUPTED","服务已中断，任务等待恢复");Thread.currentThread().interrupt();
        } catch(Exception e) {
            LOG.warn("Pipeline attempt failed for job {}",id,e);
            results.cleanup(published);
            boolean unavailable=e instanceof ApiException api && api.code().equals("ASSET_UNAVAILABLE");
            if(e instanceof java.io.IOException||e instanceof org.springframework.dao.TransientDataAccessException)state.retry(id,"TEMPORARY_FAILURE","暂时性制作错误");
            else state.fail(id,unavailable?"ASSET_UNAVAILABLE":"PIPELINE_FAILED",unavailable?"素材已失效，请重新上传":"制作阶段失败，请重新提交");
        } finally { checkpoints.discard(pending);checkpoints.cleanupTerminal(id);if(generated!=null)generated.flush(); }
    }
}

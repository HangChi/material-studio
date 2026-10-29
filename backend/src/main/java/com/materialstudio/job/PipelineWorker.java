package com.materialstudio.job;

import com.materialstudio.asset.AssetService;
import com.materialstudio.common.ApiException;
import com.materialstudio.template.TemplateMapper;
import org.springframework.stereotype.Service;
import static com.materialstudio.job.Simulation.Stage;

@Service
public class PipelineWorker {
    private final PipelineState state;
    private final EventMapper events;
    private final AssetService assets;
    private final TemplateMapper templates;
    private final ResultStore results;
    public PipelineWorker(PipelineState state,EventMapper events,AssetService assets,TemplateMapper templates,ResultStore results) {
        this.state=state;this.events=events;this.assets=assets;this.templates=templates;this.results=results;
    }
    public void execute(String id) {
        String published=null;
        try {
            var config=events.configuration(id);
            if(config==null)throw new IllegalStateException("Missing execution configuration");
            var job=events.find(id);
            for(Stage stage:Stage.values()) {
                if(!state.start(id,stage))return;
                Thread.sleep(config.delay(stage));
                if(config.failStage()==stage) { state.fail(id,"SIMULATED_FAILURE",PipelineState.label(stage)+"模拟失败");return; }
                if(stage==Stage.ASSET_CHECK) for(String assetId:events.assetIds(id))assets.ensureAvailable(assets.owned(assetId,job.ownerId()));
                if(stage==Stage.FINALIZE) published=results.publish(id,templates.find(job.templateId()).coverFilename());
                if(!state.complete(id,stage,published)) { results.cleanup(published);return; }
            }
        } catch(InterruptedException e) {
            results.cleanup(published);state.fail(id,"PROCESS_INTERRUPTED","服务已中断，任务未完成，请重新提交");Thread.currentThread().interrupt();
        } catch(Exception e) {
            results.cleanup(published);
            boolean unavailable=e instanceof ApiException api && api.code().equals("ASSET_UNAVAILABLE");
            state.fail(id,unavailable?"ASSET_UNAVAILABLE":"PIPELINE_FAILED",unavailable?"素材已失效，请重新上传":"制作阶段失败，请重新提交");
        }
    }
}

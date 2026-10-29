package com.materialstudio.job;

import com.materialstudio.common.ApiException;
import java.util.Map;

public record Simulation(Stage failStage, Map<Stage,Integer> stageDurationsMs) {
    public enum Stage { ASSET_CHECK, GENERATE, FINALIZE }
    public Execution resolve(String jobId) {
        if(stageDurationsMs!=null && stageDurationsMs.values().stream().anyMatch(ms->ms==null||ms<0||ms>10000))
            throw new ApiException(422,"INVALID_SIMULATION","每阶段耗时必须是0～10000毫秒的整数");
        return new Execution(jobId,failStage,delay(Stage.ASSET_CHECK),delay(Stage.GENERATE),delay(Stage.FINALIZE));
    }
    private int delay(Stage stage) { return stageDurationsMs==null?2000:stageDurationsMs.getOrDefault(stage,2000); }
    public record Execution(String jobId,Stage failStage,int checkMs,int generateMs,int finalizeMs) {
        int delay(Stage stage) { return switch(stage) { case ASSET_CHECK->checkMs;case GENERATE->generateMs;case FINALIZE->finalizeMs; }; }
    }
}

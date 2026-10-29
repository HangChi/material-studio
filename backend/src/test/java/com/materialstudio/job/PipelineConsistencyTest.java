package com.materialstudio.job;

import com.materialstudio.ApiTestSupport;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.nio.file.Files;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class PipelineConsistencyTest extends ApiTestSupport {
    @MockitoBean JobDispatcher dispatcher;
    @Autowired PipelineState state;
    @Autowired PipelineWorker worker;
    private String submit(String owner,String asset) {
        var response=call("/api/jobs",HttpMethod.POST,owner,Map.of("templateId","demo-portrait","assetIds",List.of(asset),
                "simulation",Map.of("stageDurationsMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0))));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);return response.getBody().path("job").path("id").asText();
    }
    @Test void duplicateExecutionCannotRegressOrDuplicateATerminalJob() throws Exception {
        String owner=session(),id=submit(owner,asset(owner));worker.execute(id);
        JsonNode before=call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job");
        assertThat(before.path("status").asText()).isEqualTo("SUCCEEDED");worker.execute(id);state.interruptUnfinished();
        assertThat(call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job")).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job_event WHERE job_id=?",Integer.class,id)).isEqualTo(6);
    }
    @Test void eventInsertFailureRollsBackStateAndIllegalStageChangesAreIgnored() throws Exception {
        String owner=session(),id=submit(owner,asset(owner));
        jdbc.execute("CREATE TRIGGER reject_pipeline_event_test BEFORE INSERT ON job_event FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='injected event failure'");
        try {
            assertThatThrownBy(()->state.start(id,Simulation.Stage.ASSET_CHECK)).isInstanceOf(org.springframework.dao.DataAccessException.class);
            assertThat(jdbc.queryForObject("SELECT version FROM job WHERE id=?",Long.class,id)).isZero();
            assertThat(jdbc.queryForObject("SELECT status FROM job WHERE id=?",String.class,id)).isEqualTo("QUEUED");
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM job_event WHERE job_id=?",Integer.class,id)).isZero();
        } finally { jdbc.execute("DROP TRIGGER IF EXISTS reject_pipeline_event_test"); }
        assertThat(state.start(id,Simulation.Stage.FINALIZE)).isFalse();
        assertThat(state.start(id,Simulation.Stage.ASSET_CHECK)).isTrue();assertThat(state.start(id,Simulation.Stage.ASSET_CHECK)).isFalse();
        assertThat(state.complete(id,Simulation.Stage.ASSET_CHECK,null)).isTrue();assertThat(state.complete(id,Simulation.Stage.ASSET_CHECK,null)).isFalse();
        assertThat(state.start(id,Simulation.Stage.FINALIZE)).isFalse();state.interruptUnfinished();
    }
    @Test void aFileLostAfterAdmissionFailsTheAssetStageAndStopsGeneration() throws Exception {
        String owner=session(),asset=asset(owner),id=submit(owner,asset);
        Files.delete(STORAGE.resolve(jdbc.queryForObject("SELECT storage_filename FROM asset WHERE id=?",String.class,asset)));
        worker.execute(id);
        var job=call("/api/jobs/"+id,HttpMethod.GET,owner,null).getBody().path("job");
        assertThat(job.path("status").asText()).isEqualTo("FAILED");assertThat(job.path("stage").asText()).isEqualTo("ASSET_CHECK");
        assertThat(job.path("errorCode").asText()).isEqualTo("ASSET_UNAVAILABLE");
        assertThat(jdbc.queryForList("SELECT kind FROM job_event WHERE job_id=? ORDER BY version",String.class,id)).containsExactly("STARTED","FAILED");
    }
}

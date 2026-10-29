package com.materialstudio.job;
import org.springframework.stereotype.Component;
/** Replaced by the actual bounded background dispatcher in feature 004. */
@Component
public class UnavailableJobDispatcher implements JobDispatcher {
    @Override public void dispatch(String jobId) { throw new ProcessorUnavailableException(); }
}

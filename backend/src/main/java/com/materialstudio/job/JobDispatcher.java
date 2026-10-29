package com.materialstudio.job;
/** Admission-only port: dispatch must return after scheduling, never after worker completion. */
public interface JobDispatcher { void dispatch(String jobId); }

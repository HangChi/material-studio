package com.materialstudio.job;
import java.util.concurrent.RejectedExecutionException;
public class ProcessorUnavailableException extends RejectedExecutionException {
    public ProcessorUnavailableException() { super("Processor is not connected yet"); }
}

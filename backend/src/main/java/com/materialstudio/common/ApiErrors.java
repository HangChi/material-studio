package com.materialstudio.common;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<?> known(ApiException e) { return error(e.status(), e.code(), e.getMessage()); }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<?> tooLarge(MaxUploadSizeExceededException e) { return error(413, "FILE_TOO_LARGE", "每张图片不能超过5 MiB"); }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<?> json(HttpMessageNotReadableException e) { return error(400, "INVALID_REQUEST", "请求字段或格式不正确"); }
    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<?> missingFile(MissingServletRequestPartException e) { return error(422, "INVALID_IMAGE", "请选择图片文件"); }
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<?> database(DataAccessException e) { return error(500, "SERVICE_UNAVAILABLE", "服务暂时不可用，请稍后重试"); }
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<?> parameter(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException e) { return error(400,"INVALID_REQUEST","请求参数格式不正确"); }
    private ResponseEntity<?> error(int status, String code, String message) {
        var response=ResponseEntity.status(status).header("Cache-Control", "no-store");
        if(status==429)response.header("Retry-After","60");
        return response.body(Map.of("error", Map.of("code", code, "message", message)));
    }
}

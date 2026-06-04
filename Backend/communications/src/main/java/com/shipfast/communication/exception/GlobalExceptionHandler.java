package com.shipfast.communication.exception;

import com.shipfast.communication.dto.ApiResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ApiResponse<?> handleRuntime(RuntimeException ex) {
        return new ApiResponse<>(false, ex.getMessage(), null);
    }

    @ExceptionHandler(Exception.class)
    public ApiResponse<?> handleException(Exception ex) {
        return new ApiResponse<>(false, "Something went wrong", null);
    }
}

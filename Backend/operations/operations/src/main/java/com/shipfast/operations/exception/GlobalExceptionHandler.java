package com.shipfast.operations.exception;

import com.shipfast.operations.dto.ApiResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ApiResponse<?> handleException(Exception ex) {
        return new ApiResponse<>(false, ex.getMessage(), null);
    }
}

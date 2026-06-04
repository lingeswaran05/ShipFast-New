package com.shipfast.reporting.dto;

public record ApiResponse<T>(boolean success, String message, T data) {
}

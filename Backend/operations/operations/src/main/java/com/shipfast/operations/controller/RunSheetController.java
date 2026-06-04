package com.shipfast.operations.controller;

import com.shipfast.operations.dto.ApiResponse;
import com.shipfast.operations.entity.RunSheet;
import com.shipfast.operations.service.RunSheetService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operations/runsheets")

public class RunSheetController {

    private final RunSheetService runSheetService;

    public RunSheetController(RunSheetService runSheetService) {
        this.runSheetService = runSheetService;
    }

    @PostMapping
    public ApiResponse<RunSheet> createRunSheet(@RequestParam String agentId,
                                                @RequestParam String hubId,
                                                @RequestBody List<String> shipmentIds) {

        return new ApiResponse<>(
                true,
                "RunSheet created successfully",
                runSheetService.createRunSheet(agentId, hubId, shipmentIds)
        );
    }

    @GetMapping("/{agentId}")
    public ApiResponse<List<RunSheet>> getByAgent(@PathVariable String agentId) {

        return new ApiResponse<>(
                true,
                "RunSheets fetched",
                runSheetService.getRunSheetsByAgent(agentId)
        );
    }
}

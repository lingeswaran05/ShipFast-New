package com.shipfast.operations.service.impl;

import com.shipfast.operations.entity.RunSheet;
import com.shipfast.operations.repository.RunSheetRepository;
import com.shipfast.operations.service.RunSheetService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class RunSheetServiceImpl implements RunSheetService {

    private final RunSheetRepository runSheetRepository;

    public RunSheetServiceImpl(RunSheetRepository runSheetRepository) {
        this.runSheetRepository = runSheetRepository;
    }

    @Override
    public RunSheet createRunSheet(String agentId, String hubId, List<String> shipmentIds) {

        RunSheet runSheet = new RunSheet();
        runSheet.setRunSheetId(UUID.randomUUID().toString());
        runSheet.setAgentId(agentId);
        runSheet.setHubId(hubId);
        runSheet.setDate(LocalDate.now());
        runSheet.setShipmentIds(shipmentIds);

        return runSheetRepository.save(runSheet);
    }

    @Override
    public List<RunSheet> getRunSheetsByAgent(String agentId) {
        return runSheetRepository.findByAgentId(agentId);
    }
}

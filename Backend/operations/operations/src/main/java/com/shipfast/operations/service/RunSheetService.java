package com.shipfast.operations.service;

import com.shipfast.operations.entity.RunSheet;

import java.util.List;

public interface RunSheetService {

    RunSheet createRunSheet(String agentId, String hubId, List<String> shipmentIds);

    List<RunSheet> getRunSheetsByAgent(String agentId);
}

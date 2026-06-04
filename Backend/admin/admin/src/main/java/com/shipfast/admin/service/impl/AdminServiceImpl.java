package com.shipfast.admin.service.impl;

import com.shipfast.admin.entity.Branch;
import com.shipfast.admin.entity.Vehicle;
import com.shipfast.admin.repository.BranchRepository;
import com.shipfast.admin.repository.VehicleRepository;
import com.shipfast.admin.service.AdminService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AdminServiceImpl implements AdminService {

    private final BranchRepository branchRepository;
    private final VehicleRepository vehicleRepository;

    public AdminServiceImpl(BranchRepository branchRepository,
                            VehicleRepository vehicleRepository) {
        this.branchRepository = branchRepository;
        this.vehicleRepository = vehicleRepository;
    }

    @Override
    public Branch createBranch(Branch branch) {
        branch.setBranchId(UUID.randomUUID().toString());
        return branchRepository.save(branch);
    }

    @Override
    public Vehicle createVehicle(Vehicle vehicle) {
        vehicle.setVehicleId(UUID.randomUUID().toString());
        return vehicleRepository.save(vehicle);
    }

    @Override
    public List<Branch> getAllBranches() {
        return branchRepository.findAll();
    }

    @Override
    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }
}

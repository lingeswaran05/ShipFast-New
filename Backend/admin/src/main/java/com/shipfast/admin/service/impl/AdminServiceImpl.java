package com.shipfast.admin.service.impl;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.shipfast.admin.entity.Branch;
import com.shipfast.admin.entity.Vehicle;
import com.shipfast.admin.repository.BranchRepository;
import com.shipfast.admin.repository.VehicleRepository;
import com.shipfast.admin.service.AdminService;

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
        if (branch.getStatus() == null || branch.getStatus().isBlank()) {
            branch.setStatus("Active");
        }
        if (branch.getType() == null || branch.getType().isBlank()) {
            branch.setType("Branch");
        }
        if (branch.getStaffCount() == null) {
            branch.setStaffCount(0);
        }
        return branchRepository.save(branch);
    }

    @Override
    public Vehicle createVehicle(Vehicle vehicle) {
        vehicle.setVehicleId(UUID.randomUUID().toString());
        if (vehicle.getStatus() == null || vehicle.getStatus().isBlank()) {
            vehicle.setStatus("Available");
        }
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

    @Override
    public Branch updateBranch(String branchId, Branch branch) {
        Branch existing = branchRepository.findById(Objects.requireNonNull(branchId))
                .orElseThrow(() -> new NoSuchElementException("Branch not found"));
        existing.setName(firstNonBlank(branch.getName(), existing.getName()));
        existing.setType(firstNonBlank(branch.getType(), existing.getType()));
        existing.setAddress(firstNonBlank(branch.getAddress(), existing.getAddress()));
        existing.setState(firstNonBlank(branch.getState(), existing.getState()));
        existing.setManagerUserId(firstNonBlank(branch.getManagerUserId(), existing.getManagerUserId()));
        existing.setManagerName(firstNonBlank(branch.getManagerName(), existing.getManagerName()));
        existing.setContact(firstNonBlank(branch.getContact(), existing.getContact()));
        if (branch.getStaffCount() != null) {
            existing.setStaffCount(branch.getStaffCount());
        }
        existing.setStatus(firstNonBlank(branch.getStatus(), existing.getStatus()));
        existing.setDescription(firstNonBlank(branch.getDescription(), existing.getDescription()));
        return branchRepository.save(existing);
    }

    @Override
    public Vehicle updateVehicle(String vehicleId, Vehicle vehicle) {
        Vehicle existing = vehicleRepository.findById(Objects.requireNonNull(vehicleId))
                .orElseThrow(() -> new NoSuchElementException("Vehicle not found"));
        existing.setVehicleNumber(firstNonBlank(vehicle.getVehicleNumber(), existing.getVehicleNumber()));
        existing.setType(firstNonBlank(vehicle.getType(), existing.getType()));
        existing.setDriverUserId(firstNonBlank(vehicle.getDriverUserId(), existing.getDriverUserId()));
        existing.setDriverName(firstNonBlank(vehicle.getDriverName(), existing.getDriverName()));
        if (vehicle.getSeats() != null) {
            existing.setSeats(vehicle.getSeats());
        }
        existing.setRcBook(firstNonBlank(vehicle.getRcBook(), existing.getRcBook()));
        if (vehicle.getPhoto() != null) {
            existing.setPhoto(vehicle.getPhoto());
        }
        existing.setStatus(firstNonBlank(vehicle.getStatus(), existing.getStatus()));
        return vehicleRepository.save(existing);
    }

    @Override
    public void deleteBranch(String branchId) {
        branchRepository.deleteById(Objects.requireNonNull(branchId));
    }

    @Override
    public void deleteVehicle(String vehicleId) {
        vehicleRepository.deleteById(Objects.requireNonNull(vehicleId));
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }
}

package com.shipfast.admin.service;

import com.shipfast.admin.entity.Branch;
import com.shipfast.admin.entity.Vehicle;

import java.util.List;

public interface AdminService {

    Branch createBranch(Branch branch);

    Vehicle createVehicle(Vehicle vehicle);

    List<Branch> getAllBranches();

    List<Vehicle> getAllVehicles();

    Branch updateBranch(String branchId, Branch branch);

    Vehicle updateVehicle(String vehicleId, Vehicle vehicle);

    void deleteBranch(String branchId);

    void deleteVehicle(String vehicleId);
}

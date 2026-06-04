package com.shipfast.admin.controller;

import com.shipfast.admin.dto.ApiResponse;
import com.shipfast.admin.entity.Branch;
import com.shipfast.admin.entity.Vehicle;
import com.shipfast.admin.service.AdminService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @PostMapping("/branches")
    public ApiResponse<Branch> createBranch(@RequestBody Branch branch) {
        return new ApiResponse<>(true, "Branch created",
                adminService.createBranch(branch));
    }

    @PostMapping("/vehicles")
    public ApiResponse<Vehicle> createVehicle(@RequestBody Vehicle vehicle) {
        return new ApiResponse<>(true, "Vehicle created",
                adminService.createVehicle(vehicle));
    }

    @GetMapping("/branches")
    public ApiResponse<List<Branch>> getBranches() {
        return new ApiResponse<>(true, "Branches fetched",
                adminService.getAllBranches());
    }

    @GetMapping("/vehicles")
    public ApiResponse<List<Vehicle>> getVehicles() {
        return new ApiResponse<>(true, "Vehicles fetched",
                adminService.getAllVehicles());
    }
}

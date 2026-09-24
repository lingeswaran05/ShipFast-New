import { Branch } from '../models/Branch.js';
import { Vehicle } from '../models/Vehicle.js';
import { generateBranchId, generateVehicleId } from '../utils/idGenerators.js';

export const createBranch = async (req, res, next) => {
  try {
    const { name, type, address, location, state, managerName, managerUserId, contact, staffCount, status, description } = req.body;

    const branch = new Branch({
      branchId: generateBranchId(),
      name: name || 'Branch',
      type: type || 'Branch',
      address: address || location || '',
      location: location || address || '',
      state: state || '',
      managerName: managerName || '',
      managerUserId: managerUserId || '',
      contact: contact || '',
      staffCount: Number(staffCount || 0),
      status: status || 'Active',
      description: description || ''
    });

    await branch.save();

    return res.status(200).json({
      status: true,
      message: 'Branch created',
      data: branch.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const getBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      status: true,
      message: 'Branches fetched',
      data: branches.map((b) => b.toDto())
    });
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const branch = await Branch.findOne({
      $or: [{ branchId }, { _id: branchId }]
    });

    if (!branch) {
      return res.status(404).json({ status: false, message: 'Branch not found' });
    }

    const { name, type, address, location, state, managerName, managerUserId, contact, staffCount, status, description } = req.body;

    if (name !== undefined) branch.name = name;
    if (type !== undefined) branch.type = type;
    if (address !== undefined || location !== undefined) {
      branch.address = address ?? location;
      branch.location = location ?? address;
    }
    if (state !== undefined) branch.state = state;
    if (managerName !== undefined) branch.managerName = managerName;
    if (managerUserId !== undefined) branch.managerUserId = managerUserId;
    if (contact !== undefined) branch.contact = contact;
    if (staffCount !== undefined) branch.staffCount = Number(staffCount);
    if (status !== undefined) branch.status = status;
    if (description !== undefined) branch.description = description;

    await branch.save();

    return res.status(200).json({
      status: true,
      message: 'Branch updated',
      data: branch.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const result = await Branch.deleteOne({
      $or: [{ branchId }, { _id: branchId }]
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ status: false, message: 'Branch not found' });
    }

    return res.status(200).json({
      status: true,
      message: 'Branch deleted',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

export const createVehicle = async (req, res, next) => {
  try {
    const { vehicleNumber, number, type, driverUserId, driverName, seats, capacity, rcBook, photo, status } = req.body;

    const vehicle = new Vehicle({
      vehicleId: generateVehicleId(),
      vehicleNumber: vehicleNumber || number,
      type: type || 'Van',
      driverUserId: driverUserId || '',
      driverName: driverName || '',
      seats: Number(seats || 2),
      capacity: Number(capacity || 500),
      rcBook: rcBook || '',
      photo: photo || null,
      status: status || 'Available'
    });

    await vehicle.save();

    return res.status(200).json({
      status: true,
      message: 'Vehicle created',
      data: vehicle.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const getVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      status: true,
      message: 'Vehicles fetched',
      data: vehicles.map((v) => v.toDto())
    });
  } catch (error) {
    next(error);
  }
};

export const updateVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const vehicle = await Vehicle.findOne({
      $or: [{ vehicleId }, { _id: vehicleId }]
    });

    if (!vehicle) {
      return res.status(404).json({ status: false, message: 'Vehicle not found' });
    }

    const { vehicleNumber, number, type, driverUserId, driverName, seats, capacity, rcBook, photo, status } = req.body;

    if (vehicleNumber !== undefined || number !== undefined) vehicle.vehicleNumber = vehicleNumber ?? number;
    if (type !== undefined) vehicle.type = type;
    if (driverUserId !== undefined) vehicle.driverUserId = driverUserId;
    if (driverName !== undefined) vehicle.driverName = driverName;
    if (seats !== undefined) vehicle.seats = Number(seats);
    if (capacity !== undefined) vehicle.capacity = Number(capacity);
    if (rcBook !== undefined) vehicle.rcBook = rcBook;
    if (photo !== undefined) vehicle.photo = photo;
    if (status !== undefined) vehicle.status = status;

    await vehicle.save();

    return res.status(200).json({
      status: true,
      message: 'Vehicle updated',
      data: vehicle.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const result = await Vehicle.deleteOne({
      $or: [{ vehicleId }, { _id: vehicleId }]
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ status: false, message: 'Vehicle not found' });
    }

    return res.status(200).json({
      status: true,
      message: 'Vehicle deleted',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

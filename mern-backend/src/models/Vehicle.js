import { createModel } from '../db/mongo.js';

const VehicleMethods = {
  toDto: function () {
    return {
      id: this.vehicleId || this._id?.toString() || '',
      vehicleId: this.vehicleId || this._id?.toString() || '',
      number: this.vehicleNumber || this.number || '',
      vehicleNumber: this.vehicleNumber || this.number || '',
      type: this.type || 'Van',
      capacity: Number(this.capacity || 500),
      driverUserId: this.driverUserId || '',
      driverName: this.driverName || '',
      driver: this.driverName || this.driverUserId || 'N/A',
      seats: Number(this.seats || 2),
      rcBook: this.rcBook || '',
      photo: this.photo || null,
      status: this.status || 'Available',
      createdAt: this.createdAt || new Date(),
      updatedAt: this.updatedAt || new Date()
    };
  }
};

const VehicleDefaults = {
  type: 'Van',
  driverUserId: '',
  driverName: '',
  seats: 2,
  capacity: 500,
  rcBook: '',
  photo: null,
  status: 'Available'
};

export const Vehicle = createModel('vehicles', VehicleMethods, VehicleDefaults);

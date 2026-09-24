import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    type: {
      type: String,
      default: 'Van'
    },
    driverUserId: {
      type: String,
      default: ''
    },
    driverName: {
      type: String,
      default: ''
    },
    seats: {
      type: Number,
      default: 2
    },
    capacity: {
      type: Number,
      default: 500
    },
    rcBook: {
      type: String,
      default: ''
    },
    photo: {
      type: String,
      default: null
    },
    status: {
      type: String,
      default: 'Available'
    }
  },
  {
    timestamps: true
  }
);

VehicleSchema.methods.toDto = function () {
  return {
    id: this.vehicleId,
    vehicleId: this.vehicleId,
    number: this.vehicleNumber,
    vehicleNumber: this.vehicleNumber,
    type: this.type,
    capacity: this.capacity,
    driverUserId: this.driverUserId,
    driverName: this.driverName,
    driver: this.driverName || this.driverUserId || 'N/A',
    seats: this.seats,
    rcBook: this.rcBook,
    photo: this.photo,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);

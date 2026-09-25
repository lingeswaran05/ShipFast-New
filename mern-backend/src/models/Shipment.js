import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    doorAddress: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const PackageDetailsSchema = new mongoose.Schema(
  {
    weight: { type: Number, default: 0 },
    type: { type: String, default: 'Standard' },
    description: { type: String, default: '' }
  },
  { _id: false }
);

const TrackingEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    location: { type: String, default: 'Hub' },
    timestamp: { type: Date, default: Date.now },
    remarks: { type: String, default: '' }
  },
  { _id: false }
);

const ShipmentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    customerId: {
      type: String,
      index: true,
      default: ''
    },
    branchId: {
      type: String,
      index: true,
      default: ''
    },
    status: {
      type: String,
      default: 'Booked',
      index: true
    },
    serviceType: {
      type: String,
      default: 'Standard'
    },
    paymentMethod: {
      type: String,
      default: 'ONLINE'
    },
    paymentStatus: {
      type: String,
      default: 'SUCCESS'
    },
    paymentCollectedAt: {
      type: Date,
      default: null
    },
    cost: {
      type: Number,
      default: 0
    },
    estimatedDelivery: {
      type: Date,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    deliveredBy: {
      type: String,
      default: null
    },
    deliveredByAgentId: {
      type: String,
      default: null
    },
    assignedAgentId: {
      type: String,
      default: null,
      index: true
    },
    runSheetId: {
      type: String,
      default: null,
      index: true
    },
    proofOfDeliveryImage: {
      type: String,
      default: null
    },
    rating: {
      type: Number,
      default: null
    },
    ratingComment: {
      type: String,
      default: ''
    },
    sender: {
      type: AddressSchema,
      required: true
    },
    recipient: {
      type: AddressSchema,
      required: true
    },
    packageDetails: {
      type: PackageDetailsSchema,
      required: true
    },
    history: [TrackingEventSchema]
  },
  {
    timestamps: true
  }
);

// Map MongoDB doc to standard Shipment response format
ShipmentSchema.methods.toDto = function () {
  return {
    id: this.id,
    shipmentId: this.id,
    trackingNumber: this.trackingNumber,
    trackingId: this.trackingNumber,
    customerId: this.customerId,
    branchId: this.branchId,
    status: this.status,
    serviceType: this.serviceType,
    paymentMethod: this.paymentMethod,
    paymentStatus: this.paymentStatus,
    paymentCollectedAt: this.paymentCollectedAt,
    cost: this.cost,
    estimatedDelivery: this.estimatedDelivery,
    deliveredAt: this.deliveredAt,
    deliveredBy: this.deliveredBy,
    deliveredByAgentId: this.deliveredByAgentId,
    assignedAgentId: this.assignedAgentId,
    runSheetId: this.runSheetId,
    proofOfDeliveryImage: this.proofOfDeliveryImage,
    rating: this.rating,
    ratingComment: this.ratingComment,
    sender: this.sender,
    recipient: this.recipient,
    packageDetails: this.packageDetails,
    history: this.history,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const Shipment = mongoose.models?.Shipment || mongoose.model('Shipment', ShipmentSchema);

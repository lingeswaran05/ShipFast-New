import mongoose from 'mongoose';

const PricingConfigSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'DEFAULT'
    },
    standardRatePerKg: {
      type: Number,
      default: 80.0
    },
    expressMultiplier: {
      type: Number,
      default: 1.75
    },
    sameDayMultiplier: {
      type: Number,
      default: 2.0
    },
    distanceSurcharge: {
      type: Number,
      default: 40.0
    },
    fuelSurchargePct: {
      type: Number,
      default: 9.0
    },
    gstPct: {
      type: Number,
      default: 5.0
    },
    codHandlingFee: {
      type: Number,
      default: 50.0
    }
  },
  {
    timestamps: true,
    _id: false
  }
);

PricingConfigSchema.methods.toDto = function () {
  return {
    standardRatePerKg: this.standardRatePerKg,
    expressMultiplier: this.expressMultiplier,
    sameDayMultiplier: this.sameDayMultiplier,
    distanceSurcharge: this.distanceSurcharge,
    fuelSurchargePct: this.fuelSurchargePct,
    gstPct: this.gstPct,
    codHandlingFee: this.codHandlingFee
  };
};

export const PricingConfig = mongoose.models?.PricingConfig || mongoose.model('PricingConfig', PricingConfigSchema);

import { createModel } from '../db/mongo.js';

const PricingConfigMethods = {
  toDto: function () {
    return {
      standardRatePerKg: this.standardRatePerKg || 80.0,
      expressMultiplier: this.expressMultiplier || 1.75,
      sameDayMultiplier: this.sameDayMultiplier || 2.0,
      distanceSurcharge: this.distanceSurcharge || 40.0,
      fuelSurchargePct: this.fuelSurchargePct || 9.0,
      gstPct: this.gstPct || 5.0,
      codHandlingFee: this.codHandlingFee || 50.0
    };
  }
};

const PricingConfigDefaults = {
  _id: 'DEFAULT',
  standardRatePerKg: 80.0,
  expressMultiplier: 1.75,
  sameDayMultiplier: 2.0,
  distanceSurcharge: 40.0,
  fuelSurchargePct: 9.0,
  gstPct: 5.0,
  codHandlingFee: 50.0
};

export const PricingConfig = createModel('pricingconfigs', PricingConfigMethods, PricingConfigDefaults);

import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Branch } from '../models/Branch.js';
import { Vehicle } from '../models/Vehicle.js';
import { PricingConfig } from '../models/PricingConfig.js';
import { generateUserId, generateBranchId, generateVehicleId } from './idGenerators.js';

dotenv.config();

const seed = async () => {
  try {
    await connectDB();
    console.log('🌱 Starting Seed Data Injection...');

    // 1. Seed Default Admin Users
    const adminEmails = [
      { email: 'lingesw0561@gmail.com', name: 'Lingeswaran (Admin)', phone: '+919876543210' },
      { email: 'admin@shipfast.com', name: 'ShipFast Administrator', phone: '+919876543210' }
    ];

    for (const item of adminEmails) {
      const normalized = item.email.toLowerCase();
      let user = await User.findOne({ email: normalized });
      if (!user) {
        user = new User({
          userId: generateUserId(),
          email: normalized,
          password: 'AdminPassword123!',
          fullName: item.name,
          phoneNumber: item.phone,
          doorAddress: '123 HQ Tower',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          role: 'ADMIN',
          status: 'active',
          isActive: true
        });
        await user.save();
        console.log(`✅ Admin user created: ${normalized} / AdminPassword123!`);
      } else {
        user.role = 'ADMIN';
        user.status = 'active';
        user.isActive = true;
        await user.save();
        console.log(`✅ User updated to ADMIN role: ${normalized}`);
      }
    }

    // 2. Seed Default Pricing Config
    let pricing = await PricingConfig.findById('DEFAULT');
    if (!pricing) {
      pricing = await PricingConfig.create({
        _id: 'DEFAULT',
        standardRatePerKg: 80.0,
        expressMultiplier: 1.75,
        sameDayMultiplier: 2.0,
        distanceSurcharge: 40.0,
        fuelSurchargePct: 9.0,
        gstPct: 5.0,
        codHandlingFee: 50.0
      });
      console.log('✅ Default Pricing Config created');
    }

    // 3. Seed Sample Branches if empty
    const branchCount = await Branch.countDocuments({});
    if (branchCount === 0) {
      await Branch.create([
        {
          branchId: generateBranchId(),
          name: 'Mumbai Central Hub',
          type: 'Hub',
          address: 'Logistics Park, Andheri East, Mumbai, Maharashtra 400069',
          location: 'Andheri East, Mumbai',
          state: 'Maharashtra',
          managerName: 'Rajesh Sharma',
          contact: '+919820012345',
          staffCount: 15,
          status: 'Active',
          description: 'Primary sorting and transit hub for western zone'
        },
        {
          branchId: generateBranchId(),
          name: 'Delhi Gateway Branch',
          type: 'Branch',
          address: 'Phase 3, Okhla Industrial Area, New Delhi, Delhi 110020',
          location: 'Okhla, New Delhi',
          state: 'Delhi',
          managerName: 'Amit Verma',
          contact: '+919810054321',
          staffCount: 12,
          status: 'Active',
          description: 'Northern region distribution center'
        },
        {
          branchId: generateBranchId(),
          name: 'Bengaluru Tech Hub',
          type: 'Hub',
          address: 'Electronic City Phase 1, Bengaluru, Karnataka 560100',
          location: 'Electronic City, Bengaluru',
          state: 'Karnataka',
          managerName: 'Suresh Kumar',
          contact: '+919845012345',
          staffCount: 20,
          status: 'Active',
          description: 'Southern tech & express shipment facility'
        }
      ]);
      console.log('✅ Default Branches created');
    }

    // 4. Seed Sample Vehicles if empty
    const vehicleCount = await Vehicle.countDocuments({});
    if (vehicleCount === 0) {
      await Vehicle.create([
        {
          vehicleId: generateVehicleId(),
          vehicleNumber: 'MH02AB1234',
          type: 'Van',
          driverName: 'Ramesh Patel',
          seats: 2,
          capacity: 800,
          rcBook: 'RC-MH02-1234',
          status: 'Available'
        },
        {
          vehicleId: generateVehicleId(),
          vehicleNumber: 'DL01CD5678',
          type: 'Truck',
          driverName: 'Vikram Singh',
          seats: 3,
          capacity: 2500,
          rcBook: 'RC-DL01-5678',
          status: 'Available'
        },
        {
          vehicleId: generateVehicleId(),
          vehicleNumber: 'KA03EF9012',
          type: 'Mini Truck',
          driverName: 'Manoj Gowda',
          seats: 2,
          capacity: 1200,
          rcBook: 'RC-KA03-9012',
          status: 'Available'
        }
      ]);
      console.log('✅ Default Vehicles created');
    }

    console.log('🎉 Seed Data Injection Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();

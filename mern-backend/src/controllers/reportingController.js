import { Shipment } from '../models/Shipment.js';
import { User } from '../models/User.js';
import { Branch } from '../models/Branch.js';
import { Vehicle } from '../models/Vehicle.js';

export const generateSummary = async (req, res, next) => {
  try {
    const totalShipments = await Shipment.countDocuments({});
    const deliveredShipments = await Shipment.countDocuments({ status: /^delivered$/i });
    const inTransitShipments = await Shipment.countDocuments({ status: /^in transit$/i });
    const outForDeliveryShipments = await Shipment.countDocuments({ status: /^out for delivery$/i });
    const bookedShipments = await Shipment.countDocuments({ status: /^booked$/i });
    const failedShipments = await Shipment.countDocuments({ status: /^failed$/i });
    const cancelledShipments = await Shipment.countDocuments({ status: /^cancelled$/i });

    const totalUsers = await User.countDocuments({});
    const totalBranches = await Branch.countDocuments({});
    const totalVehicles = await Vehicle.countDocuments({});

    const revenueResult = await Shipment.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, totalRevenue: { $sum: '$cost' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    const deliverySuccessRate = totalShipments > 0 ? Math.round((deliveredShipments / totalShipments) * 100) : 100;

    return res.status(200).json({
      status: true,
      message: 'Report summary generated',
      data: {
        totalShipments,
        deliveredShipments,
        inTransitShipments,
        outForDeliveryShipments,
        bookedShipments,
        failedShipments,
        cancelledShipments,
        activeShipments: inTransitShipments + outForDeliveryShipments + bookedShipments,
        totalUsers,
        totalBranches,
        totalVehicles,
        totalRevenue: Math.round(totalRevenue),
        deliverySuccessRate
      }
    });
  } catch (error) {
    next(error);
  }
};

export const exportShipmentsCsv = async (req, res, next) => {
  try {
    const shipments = await Shipment.find({}).sort({ createdAt: -1 });

    const headers = [
      'Shipment ID',
      'Tracking Number',
      'Customer ID',
      'Service Type',
      'Status',
      'Payment Method',
      'Payment Status',
      'Cost (INR)',
      'Sender Name',
      'Sender Phone',
      'Sender City',
      'Sender Pincode',
      'Recipient Name',
      'Recipient Phone',
      'Recipient City',
      'Recipient Pincode',
      'Weight (kg)',
      'Assigned Agent ID',
      'Delivered At',
      'Created Date'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = shipments.map((s) => [
      escapeCsv(s.id),
      escapeCsv(s.trackingNumber),
      escapeCsv(s.customerId),
      escapeCsv(s.serviceType),
      escapeCsv(s.status),
      escapeCsv(s.paymentMethod),
      escapeCsv(s.paymentStatus),
      escapeCsv(s.cost),
      escapeCsv(s.sender?.name),
      escapeCsv(s.sender?.phone),
      escapeCsv(s.sender?.city),
      escapeCsv(s.sender?.pincode),
      escapeCsv(s.recipient?.name),
      escapeCsv(s.recipient?.phone),
      escapeCsv(s.recipient?.city),
      escapeCsv(s.recipient?.pincode),
      escapeCsv(s.packageDetails?.weight),
      escapeCsv(s.assignedAgentId),
      escapeCsv(s.deliveredAt ? new Date(s.deliveredAt).toISOString() : ''),
      escapeCsv(s.createdAt ? new Date(s.createdAt).toISOString() : '')
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=shipments-report.csv');
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

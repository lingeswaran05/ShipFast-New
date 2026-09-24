import { Shipment } from '../models/Shipment.js';
import { AgentProfile } from '../models/AgentProfile.js';
import { Notification } from '../models/Notification.js';
import { generateShipmentId, generateTrackingNumber, generateNotificationId } from '../utils/idGenerators.js';
import { calculateRateFromInputs, getEffectivePricingConfig, normalizeServiceType, isCodPaymentMethod, roundToRupee } from '../utils/rateCalculator.js';
import { sendBookingEmail, sendAssignmentEmail, sendStatusUpdateEmail, sendDeliveryEmail } from '../services/emailService.js';

const STATUS_TRANSITIONS = {
  BOOKED: ['IN TRANSIT', 'FAILED', 'CANCELLED'],
  'IN TRANSIT': ['OUT FOR DELIVERY', 'FAILED', 'CANCELLED'],
  'OUT FOR DELIVERY': ['DELIVERED', 'FAILED', 'CANCELLED'],
  FAILED: ['OUT FOR DELIVERY', 'CANCELLED'],
  CANCELLED: []
};

const normalizeStatusString = (status = '') => {
  const raw = String(status || '').replace(/_/g, ' ').trim().toLowerCase();
  if (!raw) return 'Booked';
  return raw.split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const normalizeAddress = (addr = {}) => {
  if (!addr) return { name: '', phone: '', email: '', doorAddress: '', city: '', state: '', pincode: '', address: '' };
  const doorAddress = String(addr.doorAddress || addr.addressLine || '').trim();
  const city = String(addr.city || '').trim();
  const state = String(addr.state || '').trim();
  const pincode = String(addr.pincode || '').replace(/[^\d]/g, '').slice(0, 6);
  const fullAddress = addr.address || [doorAddress, city, state, pincode].filter(Boolean).join(', ');

  return {
    name: String(addr.name || '').trim(),
    phone: String(addr.phone || addr.phoneNumber || '').trim(),
    email: String(addr.email || '').trim().toLowerCase(),
    doorAddress,
    address: fullAddress,
    city,
    state,
    pincode
  };
};

export const createShipment = async (req, res, next) => {
  try {
    const { sender, recipient, packageDetails, serviceType, paymentMethod, quotedCost } = req.body;
    const userId = req.query.userId || req.body.customerId || req.headers['x-user-id'] || req.userId;
    const branchId = req.query.branchId || req.body.branchId || req.headers['x-branch-id'] || '';

    if (!sender || !recipient || !packageDetails) {
      return res.status(400).json({
        status: false,
        message: 'sender, recipient and packageDetails are required'
      });
    }

    const normSender = normalizeAddress(sender);
    const normRecipient = normalizeAddress(recipient);

    if (normSender.phone && normRecipient.phone && normSender.phone === normRecipient.phone) {
      return res.status(400).json({
        status: false,
        message: 'sender and recipient phone numbers cannot be the same'
      });
    }

    const weight = Number(packageDetails.weight || 0);
    if (weight <= 0) {
      return res.status(400).json({
        status: false,
        message: 'packageDetails.weight must be greater than 0'
      });
    }

    const normService = normalizeServiceType(serviceType || 'Standard');
    const normPaymentMethod = String(paymentMethod || 'ONLINE').toUpperCase();

    const rate = await calculateRateFromInputs({
      weight,
      serviceType: normService,
      originPincode: normSender.pincode,
      destinationPincode: normRecipient.pincode,
      paymentMethod: normPaymentMethod
    });

    const finalCost = quotedCost && Number(quotedCost) > 0 ? roundToRupee(quotedCost) : rate.totalCost;

    const shipmentId = generateShipmentId();
    const trackingNumber = generateTrackingNumber();
    const now = new Date();
    const estimatedDelivery = new Date(now.getTime() + rate.estimatedDeliveryDays * 24 * 60 * 60 * 1000);

    const initialHistory = [
      {
        status: 'Booked',
        location: normSender.city ? `${normSender.city} Origin Hub` : 'Origin Hub',
        timestamp: now,
        remarks: 'Shipment booked successfully.'
      }
    ];

    const initialPaymentStatus = isCodPaymentMethod(normPaymentMethod) ? 'PENDING' : 'SUCCESS';

    const shipment = new Shipment({
      id: shipmentId,
      trackingNumber,
      customerId: userId || '',
      branchId,
      status: 'Booked',
      serviceType: normService === 'SAME_DAY' ? 'Same Day' : normService === 'EXPRESS' ? 'Express' : 'Standard',
      paymentMethod: normPaymentMethod,
      paymentStatus: initialPaymentStatus,
      paymentCollectedAt: initialPaymentStatus === 'SUCCESS' ? now : null,
      cost: finalCost,
      estimatedDelivery,
      sender: normSender,
      recipient: normRecipient,
      packageDetails: {
        weight,
        type: packageDetails.type || 'Standard',
        description: packageDetails.description || ''
      },
      history: initialHistory
    });

    await shipment.save();

    // Send asynchronous confirmation email
    sendBookingEmail(shipment).catch(() => {});

    return res.status(201).json(shipment.toDto());
  } catch (error) {
    next(error);
  }
};

export const getAllShipments = async (req, res, next) => {
  try {
    const { status, branchId, dateFrom, dateTo, page, limit } = req.query;
    const filter = {};

    if (status) {
      filter.status = new RegExp(`^${status.replace(/_/g, ' ')}$`, 'i');
    }
    if (branchId) {
      filter.branchId = branchId;
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    const pageNum = Math.max(parseInt(page || '1', 10), 1);
    const limitNum = Math.max(parseInt(limit || '2000', 10), 1);
    const skip = (pageNum - 1) * limitNum;

    const totalItems = await Shipment.countDocuments(filter);
    const shipments = await Shipment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(totalItems / limitNum);

    return res.status(200).json({
      data: shipments.map((s) => s.toDto()),
      pagination: {
        totalItems,
        totalPages,
        currentPage: pageNum,
        limit: limitNum
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMine = async (req, res, next) => {
  try {
    const userId = req.query.userId || req.query.customerId || req.headers['x-user-id'] || req.userId;

    if (!userId) {
      return res.status(200).json([]);
    }

    const normalizedId = String(userId).trim();
    const shipments = await Shipment.find({
      $or: [
        { customerId: normalizedId },
        { customerId: normalizedId.toLowerCase() },
        { 'sender.email': normalizedId.toLowerCase() },
        { 'recipient.email': normalizedId.toLowerCase() }
      ]
    }).sort({ createdAt: -1 });

    return res.status(200).json(shipments.map((s) => s.toDto()));
  } catch (error) {
    next(error);
  }
};

export const getByTrackingNumber = async (req, res, next) => {
  try {
    const { trackingNumber } = req.params;
    const shipment = await Shipment.findOne({
      $or: [{ trackingNumber }, { id: trackingNumber }]
    });

    if (!shipment) {
      return res.status(404).json({ status: false, message: 'Shipment not found' });
    }

    return res.status(200).json(shipment.toDto());
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { shipmentId } = req.params;
    const shipment = await Shipment.findOne({
      $or: [{ id: shipmentId }, { trackingNumber: shipmentId }]
    });

    if (!shipment) {
      return res.status(404).json({ status: false, message: 'Shipment not found' });
    }

    return res.status(200).json(shipment.toDto());
  } catch (error) {
    next(error);
  }
};

export const updateShipment = async (req, res, next) => {
  try {
    const { shipmentId } = req.params;
    const shipment = await Shipment.findOne({
      $or: [{ id: shipmentId }, { trackingNumber: shipmentId }]
    });

    if (!shipment) {
      return res.status(404).json({ status: false, message: 'Shipment not found' });
    }

    const { sender, recipient, packageDetails, serviceType, paymentMethod } = req.body;

    if (sender) shipment.sender = { ...shipment.sender, ...normalizeAddress(sender) };
    if (recipient) shipment.recipient = { ...shipment.recipient, ...normalizeAddress(recipient) };
    if (packageDetails) shipment.packageDetails = { ...shipment.packageDetails, ...packageDetails };
    if (serviceType) shipment.serviceType = serviceType;
    if (paymentMethod) shipment.paymentMethod = paymentMethod;

    await shipment.save();

    return res.status(200).json(shipment.toDto());
  } catch (error) {
    next(error);
  }
};

export const deleteShipment = async (req, res, next) => {
  try {
    const { shipmentId } = req.params;
    const result = await Shipment.deleteOne({
      $or: [{ id: shipmentId }, { trackingNumber: shipmentId }]
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ status: false, message: 'Shipment not found' });
    }

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { shipmentId } = req.params;
    const { status, location, remarks, proofOfDeliveryImage, deliveredBy, deliveredByAgentId, paymentStatus, paymentCollectedAt } = req.body;
    const customerId = req.query.userId || req.headers['x-user-id'] || req.userId;

    const shipment = await Shipment.findOne({
      $or: [{ id: shipmentId }, { trackingNumber: shipmentId }]
    });

    if (!shipment) {
      return res.status(404).json({ status: false, message: 'Shipment not found' });
    }

    const nextStatus = normalizeStatusString(status);
    const currentStatus = normalizeStatusString(shipment.status);

    if (nextStatus.toLowerCase() === 'cancelled' && customerId && shipment.customerId && customerId !== shipment.customerId) {
      return res.status(403).json({ status: false, message: 'You can cancel only your own shipment' });
    }

    shipment.status = nextStatus;

    if (proofOfDeliveryImage) shipment.proofOfDeliveryImage = proofOfDeliveryImage;
    if (deliveredBy) shipment.deliveredBy = deliveredBy;
    if (deliveredByAgentId) {
      shipment.deliveredByAgentId = deliveredByAgentId;
      if (!shipment.assignedAgentId) shipment.assignedAgentId = deliveredByAgentId;
    }

    if (nextStatus.toLowerCase() === 'delivered') {
      if (!shipment.deliveredAt) shipment.deliveredAt = new Date();
      if (!paymentStatus && !isCodPaymentMethod(shipment.paymentMethod)) {
        shipment.paymentStatus = 'SUCCESS';
        if (!shipment.paymentCollectedAt) shipment.paymentCollectedAt = new Date();
      }
    }

    if (paymentStatus) shipment.paymentStatus = String(paymentStatus).toUpperCase();
    if (paymentCollectedAt) shipment.paymentCollectedAt = new Date(paymentCollectedAt);

    if (shipment.paymentStatus === 'SUCCESS' && !shipment.paymentCollectedAt) {
      shipment.paymentCollectedAt = new Date();
    }

    // Add tracking event
    shipment.history.push({
      status: nextStatus,
      location: location || 'Hub Update',
      timestamp: new Date(),
      remarks: remarks || `Status updated to ${nextStatus}`
    });

    await shipment.save();

    // Create In-App notification
    if (shipment.customerId) {
      Notification.create({
        notificationId: generateNotificationId(),
        userId: shipment.customerId,
        type: 'INFO',
        message: `Shipment ${shipment.trackingNumber} status updated to ${nextStatus}. ${remarks || ''}`.trim(),
        status: 'SENT',
        isRead: false
      }).catch(() => {});
    }

    // Agent Details lookup for email
    let agentDetails = {};
    if (shipment.deliveredByAgentId || shipment.assignedAgentId) {
      const agent = await AgentProfile.findOne({
        $or: [{ agentId: shipment.deliveredByAgentId || shipment.assignedAgentId }, { userId: shipment.deliveredByAgentId || shipment.assignedAgentId }]
      });
      if (agent) agentDetails = agent;
    }

    if (nextStatus.toLowerCase() === 'delivered') {
      sendDeliveryEmail(shipment, agentDetails).catch(() => {});
    } else {
      sendStatusUpdateEmail(shipment, nextStatus).catch(() => {});
    }

    return res.status(200).json(shipment.toDto());
  } catch (error) {
    next(error);
  }
};

export const assignShipment = async (req, res, next) => {
  try {
    const { shipmentId } = req.params;
    const { agentId, runSheetId } = req.body;

    if (!agentId) {
      return res.status(400).json({ status: false, message: 'agentId is required' });
    }

    const shipment = await Shipment.findOne({
      $or: [{ id: shipmentId }, { trackingNumber: shipmentId }]
    });

    if (!shipment) {
      return res.status(404).json({ status: false, message: 'Shipment not found' });
    }

    shipment.assignedAgentId = agentId;
    if (runSheetId) shipment.runSheetId = runSheetId;

    await shipment.save();

    // Lookup agent details
    const agent = await AgentProfile.findOne({
      $or: [{ agentId }, { userId: agentId }]
    });

    sendAssignmentEmail(shipment, agent || {}).catch(() => {});

    return res.status(200).json(shipment.toDto());
  } catch (error) {
    next(error);
  }
};

export const addRating = async (req, res, next) => {
  try {
    const { shipmentId } = req.params;
    const { rating, comment } = req.body;

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ status: false, message: 'rating must be between 1 and 5' });
    }

    const shipment = await Shipment.findOne({
      $or: [{ id: shipmentId }, { trackingNumber: shipmentId }]
    });

    if (!shipment) {
      return res.status(404).json({ status: false, message: 'Shipment not found' });
    }

    shipment.rating = numRating;
    shipment.ratingComment = comment || '';
    await shipment.save();

    // Update agent's rating
    const agentId = shipment.deliveredByAgentId || shipment.assignedAgentId;
    if (agentId) {
      const agent = await AgentProfile.findOne({
        $or: [{ agentId }, { userId: agentId }]
      });
      if (agent) {
        const count = agent.ratingCount || 1;
        const currentRating = agent.rating || 5.0;
        const newRating = (currentRating * count + numRating) / (count + 1);
        agent.rating = Math.round(newRating * 10) / 10;
        agent.ratingCount = count + 1;
        await agent.save();
      }
    }

    return res.status(200).json(shipment.toDto());
  } catch (error) {
    next(error);
  }
};

export const calculateRate = async (req, res, next) => {
  try {
    const { weight, serviceType, originPincode, destinationPincode, paymentMethod } = req.body;
    const numWeight = Number(weight || 0);

    if (numWeight <= 0) {
      return res.status(400).json({ status: false, message: 'weight must be greater than 0' });
    }

    const rate = await calculateRateFromInputs({
      weight: numWeight,
      serviceType,
      originPincode,
      destinationPincode,
      paymentMethod
    });

    return res.status(200).json(rate);
  } catch (error) {
    next(error);
  }
};

export const getPricingConfig = async (req, res, next) => {
  try {
    const config = await getEffectivePricingConfig();
    return res.status(200).json(config.toDto());
  } catch (error) {
    next(error);
  }
};

export const updatePricingConfig = async (req, res, next) => {
  try {
    const body = req.body || {};
    const config = await getEffectivePricingConfig();

    if (body.standardRatePerKg !== undefined) config.standardRatePerKg = Number(body.standardRatePerKg);
    if (body.expressMultiplier !== undefined) config.expressMultiplier = Number(body.expressMultiplier);
    config.sameDayMultiplier = 2.0;
    if (body.distanceSurcharge !== undefined) config.distanceSurcharge = Number(body.distanceSurcharge);
    if (body.fuelSurchargePct !== undefined) config.fuelSurchargePct = Number(body.fuelSurchargePct);
    if (body.gstPct !== undefined) config.gstPct = Number(body.gstPct);
    if (body.codHandlingFee !== undefined) config.codHandlingFee = Number(body.codHandlingFee);

    await config.save();

    return res.status(200).json(config.toDto());
  } catch (error) {
    next(error);
  }
};

export const publicTrackHistory = async (req, res, next) => {
  try {
    const { trackingNumber } = req.params;
    const shipment = await Shipment.findOne({
      $or: [{ trackingNumber }, { id: trackingNumber }]
    });

    if (!shipment) {
      return res.status(404).json({
        status: false,
        message: 'Shipment not found'
      });
    }

    return res.status(200).json({
      status: true,
      message: 'Tracking history fetched successfully',
      data: shipment.history || []
    });
  } catch (error) {
    next(error);
  }
};

import { AgentProfile } from '../models/AgentProfile.js';
import { RunSheet } from '../models/RunSheet.js';
import { CashCollection } from '../models/CashCollection.js';
import { Shipment } from '../models/Shipment.js';
import { User } from '../models/User.js';
import { generateRunSheetId, generateCollectionId } from '../utils/idGenerators.js';

export const createAgent = async (req, res, next) => {
  try {
    const {
      userId,
      name,
      fullName,
      email,
      phone,
      phoneNumber,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      rcBookNumber,
      aadharNumber,
      bloodType,
      organDonor,
      shiftTiming,
      experience,
      hubId,
      assignedZone
    } = req.body;

    const agent = new AgentProfile({
      userId: userId || email,
      agentId: userId || email,
      fullName: fullName || name || '',
      email: email || '',
      phoneNumber: phoneNumber || phone || '',
      vehicleType: vehicleType || 'Bike',
      vehicleNumber: vehicleNumber || '',
      licenseNumber: licenseNumber || '',
      rcBookNumber: rcBookNumber || '',
      aadharNumber: aadharNumber || '',
      bloodType: bloodType || '',
      organDonor: Boolean(organDonor),
      shiftTiming: shiftTiming || 'Day',
      experience: experience || '',
      hubId: hubId || '',
      assignedZone: assignedZone || '',
      status: 'VERIFIED',
      verificationStatus: 'VERIFIED'
    });

    await agent.save();

    return res.status(200).json(agent.toDto());
  } catch (error) {
    next(error);
  }
};

export const getAllAgents = async (req, res, next) => {
  try {
    const agents = await AgentProfile.find({}).sort({ createdAt: -1 });
    return res.status(200).json(agents.map((a) => a.toDto()));
  } catch (error) {
    next(error);
  }
};

export const getAgentByIdentifier = async (req, res, next) => {
  try {
    const { agentIdentifier } = req.params;
    const normalized = decodeURIComponent(agentIdentifier);

    const agent = await AgentProfile.findOne({
      $or: [{ agentId: normalized }, { userId: normalized }, { email: normalized.toLowerCase() }]
    });

    if (!agent) {
      return res.status(404).json({ status: false, message: 'Agent not found' });
    }

    return res.status(200).json(agent.toDto());
  } catch (error) {
    next(error);
  }
};

export const getAgentProfileByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const normalized = decodeURIComponent(userId);

    const agent = await AgentProfile.findOne({
      $or: [{ userId: normalized }, { agentId: normalized }, { email: normalized.toLowerCase() }]
    });

    if (!agent) {
      return res.status(404).json({ status: false, message: 'Agent profile not found' });
    }

    return res.status(200).json(agent.toDto());
  } catch (error) {
    next(error);
  }
};

export const upsertAgentProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const normalized = decodeURIComponent(userId);
    const updateData = { ...req.body };

    const status = updateData.verificationStatus || updateData.status || 'PENDING';

    const agent = await AgentProfile.findOneAndUpdate(
      { $or: [{ userId: normalized }, { agentId: normalized }, { email: normalized.toLowerCase() }] },
      {
        $set: {
          ...updateData,
          userId: normalized,
          agentId: updateData.agentId || normalized,
          status,
          verificationStatus: status
        }
      },
      { upsert: true, new: true }
    );

    return res.status(200).json(agent.toDto());
  } catch (error) {
    next(error);
  }
};

export const verifyAgentProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const normalized = decodeURIComponent(userId);
    const { verified, status, verificationStatus, verifiedBy, verificationNotes, rejectionReason } = req.body;

    const agent = await AgentProfile.findOne({
      $or: [{ userId: normalized }, { agentId: normalized }, { email: normalized.toLowerCase() }]
    });

    if (!agent) {
      return res.status(404).json({ status: false, message: 'Agent profile not found' });
    }

    let targetStatus = verificationStatus || status;
    if (!targetStatus) {
      targetStatus = verified ? 'VERIFIED' : 'REJECTED';
    }

    agent.status = targetStatus;
    agent.verificationStatus = targetStatus;
    agent.verifiedAt = new Date();
    agent.verifiedBy = verifiedBy || req.user?.email || 'ADMIN';
    if (verificationNotes) agent.verificationNotes = verificationNotes;
    if (rejectionReason) agent.rejectionReason = rejectionReason;

    await agent.save();

    // If verified, update User role to AGENT
    if (targetStatus === 'VERIFIED') {
      await User.findOneAndUpdate(
        { $or: [{ userId: normalized }, { email: normalized.toLowerCase() }] },
        { role: 'AGENT' }
      );
    }

    return res.status(200).json(agent.toDto());
  } catch (error) {
    next(error);
  }
};

export const checkAgentRequestStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const normalized = decodeURIComponent(userId);

    const agent = await AgentProfile.findOne({
      $or: [{ userId: normalized }, { agentId: normalized }, { email: normalized.toLowerCase() }]
    });

    if (!agent) {
      return res.status(200).json({ status: 'NONE', hasPending: 'false' });
    }

    const currentStatus = agent.verificationStatus || agent.status || 'NONE';

    return res.status(200).json({
      status: currentStatus,
      hasPending: currentStatus === 'PENDING' ? 'true' : 'false'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAgentProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const normalized = decodeURIComponent(userId);

    await AgentProfile.deleteOne({
      $or: [{ userId: normalized }, { agentId: normalized }, { email: normalized.toLowerCase() }]
    });

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const recordAgentRating = async (req, res, next) => {
  try {
    const { agentIdentifier } = req.params;
    const { rating } = req.body;
    const normalized = decodeURIComponent(agentIdentifier);

    const agent = await AgentProfile.findOne({
      $or: [{ agentId: normalized }, { userId: normalized }, { email: normalized.toLowerCase() }]
    });

    if (!agent) {
      return res.status(404).json({ status: false, message: 'Agent not found' });
    }

    const numRating = Number(rating || 5);
    const count = agent.ratingCount || 1;
    const curr = agent.rating || 5.0;

    agent.rating = Math.round(((curr * count + numRating) / (count + 1)) * 10) / 10;
    agent.averageRating = agent.rating;
    agent.ratingCount = count + 1;
    agent.totalRatings = count + 1;
    await agent.save();

    return res.status(200).json(agent.toDto());
  } catch (error) {
    next(error);
  }
};

export const createRunSheet = async (req, res, next) => {
  try {
    const { agentId, hubId, shipmentTrackingNumbers, shipmentIds } = req.body;
    const trackingList = shipmentTrackingNumbers || shipmentIds || [];

    if (!agentId || !hubId) {
      return res.status(400).json({ status: false, message: 'agentId and hubId are required' });
    }

    const runSheetId = generateRunSheetId();
    const runSheet = new RunSheet({
      runSheetId,
      agentId,
      hubId,
      shipmentTrackingNumbers: trackingList,
      shipmentIds: trackingList,
      status: 'CREATED'
    });

    await runSheet.save();

    // Assign shipments to this agent and runSheet
    if (trackingList.length > 0) {
      await Shipment.updateMany(
        { $or: [{ trackingNumber: { $in: trackingList } }, { id: { $in: trackingList } }] },
        {
          $set: {
            assignedAgentId: agentId,
            runSheetId
          }
        }
      );
    }

    return res.status(200).json({
      status: true,
      message: 'RunSheet created successfully',
      data: runSheet.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const getRunSheetsByAgent = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const runSheets = await RunSheet.find({ agentId }).sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      message: 'RunSheets fetched',
      data: runSheets.map((rs) => rs.toDto())
    });
  } catch (error) {
    next(error);
  }
};

export const scanShipment = async (req, res, next) => {
  try {
    const { trackingNumber, shipmentId, status, location, remarks } = req.body;
    const identifier = trackingNumber || shipmentId;

    if (!identifier) {
      return res.status(400).json({ status: false, message: 'trackingNumber or shipmentId is required' });
    }

    const shipment = await Shipment.findOne({
      $or: [{ trackingNumber: identifier }, { id: identifier }]
    });

    if (shipment) {
      if (status) shipment.status = status;
      shipment.history.push({
        status: status || 'Scanned',
        location: location || 'Warehouse',
        timestamp: new Date(),
        remarks: remarks || 'Package scanned'
      });
      await shipment.save();
    }

    return res.status(200).json({ status: true, message: 'Scan recorded' });
  } catch (error) {
    next(error);
  }
};

export const recordCash = async (req, res, next) => {
  try {
    const { agentId, shipmentTrackingNumber, amount, paymentMode } = req.body;

    const collection = new CashCollection({
      collectionId: generateCollectionId(),
      agentId,
      shipmentTrackingNumber,
      amount: Number(amount || 0),
      paymentMode: paymentMode || 'CASH',
      isVerified: false
    });

    await collection.save();

    return res.status(200).json({
      status: true,
      message: 'Cash recorded',
      data: collection.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const verifyCash = async (req, res, next) => {
  try {
    const { id } = req.params;
    const collection = await CashCollection.findOne({
      $or: [{ collectionId: id }, { _id: id }]
    });

    if (!collection) {
      return res.status(404).json({ status: false, message: 'Cash collection record not found' });
    }

    collection.isVerified = true;
    collection.verifiedAt = new Date();
    collection.verifiedBy = req.user?.email || 'ADMIN';
    await collection.save();

    return res.status(200).json({
      status: true,
      message: 'Cash verified',
      data: collection.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const generateInvoice = async (req, res, next) => {
  try {
    const { shipmentTrackingNumber, shipmentId } = req.body;
    const identifier = shipmentTrackingNumber || shipmentId;

    const shipment = await Shipment.findOne({
      $or: [{ trackingNumber: identifier }, { id: identifier }]
    });

    if (!shipment) {
      return res.status(404).json({ status: false, message: 'Shipment not found' });
    }

    const subtotal = shipment.cost || 0;
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + tax;

    return res.status(200).json({
      status: true,
      message: 'Invoice generated',
      data: {
        invoiceNumber: `INV-${shipment.trackingNumber || shipment.id}`,
        trackingNumber: shipment.trackingNumber,
        date: shipment.createdAt,
        subtotal,
        tax,
        totalAmount: total,
        paymentStatus: shipment.paymentStatus,
        customerName: shipment.sender?.name,
        recipientName: shipment.recipient?.name
      }
    });
  } catch (error) {
    next(error);
  }
};

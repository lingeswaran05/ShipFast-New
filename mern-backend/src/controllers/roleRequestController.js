import mongoose from 'mongoose';
import { RoleRequest } from '../models/RoleRequest.js';
import { User } from '../models/User.js';
import { AgentProfile } from '../models/AgentProfile.js';
import { generateRequestId } from '../utils/idGenerators.js';

const findRoleRequestById = async (idOrKey) => {
  if (!idOrKey) return null;
  const conditions = [{ requestId: idOrKey }, { userId: idOrKey }];
  if (mongoose.isValidObjectId(idOrKey)) {
    conditions.push({ _id: idOrKey });
  }
  return RoleRequest.findOne({ $or: conditions });
};

export const createRequest = async (req, res, next) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const agentDetails = body.agentDetails || {};
    const documents = body.documents || {};

    const requestedRole = body.requestedRole || 'agent';
    const normRole = String(requestedRole).toUpperCase();
    const reason = body.reason || '';

    const phone = body.phone || agentDetails.phone || user.phoneNumber || '';
    const vehicleType = body.vehicleType || agentDetails.vehicleType || 'Bike';
    const vehicleNumber = body.vehicleNumber || agentDetails.vehicleNumber || '';
    const licenseNumber = body.licenseNumber || agentDetails.licenseNumber || '';
    const aadharNumber = body.aadharNumber || agentDetails.aadharNumber || '';
    const rcBookNumber = body.rcBookNumber || agentDetails.rcBookNumber || '';
    const bloodType = body.bloodType || agentDetails.bloodType || '';
    const organDonor = body.organDonor !== undefined ? Boolean(body.organDonor) : Boolean(agentDetails.organDonor);
    const experience = body.experience || agentDetails.experience || '';
    const shiftTiming = body.shiftTiming || agentDetails.shiftTiming || 'Day';

    const mergedAgentDetails = {
      ...agentDetails,
      phone,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      aadharNumber,
      rcBookNumber,
      bloodType,
      organDonor,
      experience,
      shiftTiming
    };

    // Check if there's already a pending request
    let roleRequest = await RoleRequest.findOne({
      userId: user.userId,
      status: 'PENDING'
    });

    if (roleRequest) {
      roleRequest.requestedRole = normRole;
      roleRequest.reason = reason || roleRequest.reason;
      roleRequest.phone = phone;
      roleRequest.vehicleType = vehicleType;
      roleRequest.vehicleNumber = vehicleNumber;
      roleRequest.licenseNumber = licenseNumber;
      roleRequest.experience = experience;
      roleRequest.agentDetails = mergedAgentDetails;
      roleRequest.documents = documents;
      await roleRequest.save();
    } else {
      const requestId = generateRequestId();
      roleRequest = new RoleRequest({
        requestId,
        userId: user.userId,
        userEmail: user.email,
        userName: user.fullName || user.name,
        currentRole: user.role || 'customer',
        requestedRole: normRole,
        reason,
        phone,
        vehicleType,
        vehicleNumber,
        licenseNumber,
        experience,
        agentDetails: mergedAgentDetails,
        documents,
        status: 'PENDING'
      });
      await roleRequest.save();
    }

    // Also upsert agent profile as PENDING
    if (['AGENT', 'DRIVER', 'OPERATIONS'].includes(normRole)) {
      await AgentProfile.findOneAndUpdate(
        { userId: user.userId },
        {
          userId: user.userId,
          agentId: user.userId,
          fullName: user.fullName || user.name,
          email: user.email,
          phoneNumber: phone,
          address: user.address || '',
          city: user.city || '',
          state: user.state || '',
          pincode: user.pincode || '',
          vehicleType,
          vehicleNumber,
          licenseNumber,
          rcBookNumber,
          aadharNumber,
          bloodType,
          organDonor,
          shiftTiming,
          experience,
          profileImage: documents.profilePhoto || undefined,
          aadharCopy: documents.aadharCopy || undefined,
          licenseCopy: documents.licenseCopy || undefined,
          rcBookCopy: documents.rcBookCopy || undefined,
          bankAccountHolder: agentDetails.bankAccountHolder || undefined,
          bankAccountNumber: agentDetails.bankAccountNumber || undefined,
          bankIfsc: agentDetails.bankIfsc || undefined,
          bankName: agentDetails.bankName || undefined,
          status: 'PENDING',
          verificationStatus: 'PENDING',
          verificationNotes: reason || 'Agent role request submitted by customer'
        },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({
      status: true,
      message: 'Role request created successfully',
      data: roleRequest.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingRequests = async (req, res, next) => {
  try {
    const requests = await RoleRequest.find({ status: 'PENDING' }).sort({ createdAt: -1 });
    return res.status(200).json({
      status: true,
      message: 'Pending role requests fetched successfully',
      data: requests.map((r) => r.toDto())
    });
  } catch (error) {
    next(error);
  }
};

export const getMyRequestStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const latestRequest = await RoleRequest.findOne({ userId: user.userId }).sort({ createdAt: -1 });

    if (!latestRequest) {
      return res.status(200).json({
        status: true,
        message: 'Role request status fetched successfully',
        data: { status: 'NONE', hasPending: 'false' }
      });
    }

    return res.status(200).json({
      status: true,
      message: 'Role request status fetched successfully',
      data: {
        status: latestRequest.status,
        hasPending: latestRequest.status === 'PENDING' ? 'true' : 'false',
        requestedRole: latestRequest.requestedRole,
        requestId: latestRequest.requestId
      }
    });
  } catch (error) {
    next(error);
  }
};

export const approveRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const reviewer = req.user;

    const request = await findRoleRequestById(requestId);

    if (!request) {
      return res.status(404).json({ status: false, message: 'Role request not found' });
    }

    request.status = 'APPROVED';
    request.reviewedBy = reviewer ? reviewer.email || reviewer.userId : 'ADMIN';
    request.reviewedAt = new Date();
    await request.save();

    // Update user role to AGENT
    const targetRole = request.requestedRole === 'AGENT' || request.requestedRole === 'DRIVER' ? 'AGENT' : request.requestedRole;
    await User.findOneAndUpdate(
      { $or: [{ userId: request.userId }, { email: request.userEmail }] },
      { role: targetRole }
    );

    // Update agent profile
    await AgentProfile.findOneAndUpdate(
      { $or: [{ userId: request.userId }, { email: request.userEmail }] },
      {
        status: 'VERIFIED',
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy: request.reviewedBy
      }
    );

    return res.status(200).json({
      status: true,
      message: 'Role request approved successfully',
      data: request.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const rejectRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const reviewer = req.user;
    const { comments, reason } = req.body || {};

    const request = await findRoleRequestById(requestId);

    if (!request) {
      return res.status(404).json({ status: false, message: 'Role request not found' });
    }

    request.status = 'REJECTED';
    request.reviewedBy = reviewer ? reviewer.email || reviewer.userId : 'ADMIN';
    request.reviewedAt = new Date();
    request.comments = comments || reason || 'Request rejected by admin';
    await request.save();

    await AgentProfile.findOneAndUpdate(
      { $or: [{ userId: request.userId }, { email: request.userEmail }] },
      {
        status: 'REJECTED',
        verificationStatus: 'REJECTED',
        rejectionReason: request.comments
      }
    );

    return res.status(200).json({
      status: true,
      message: 'Role request rejected successfully',
      data: request.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const cancelRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const request = await findRoleRequestById(requestId);

    if (!request) {
      return res.status(404).json({ status: false, message: 'Role request not found' });
    }

    request.status = 'CANCELLED';
    await request.save();

    await AgentProfile.findOneAndUpdate(
      { $or: [{ userId: request.userId }, { email: request.userEmail }] },
      {
        status: 'CANCELLED',
        verificationStatus: 'CANCELLED'
      }
    );

    return res.status(200).json({
      status: true,
      message: 'Role request cancelled successfully',
      data: request.toDto()
    });
  } catch (error) {
    next(error);
  }
};

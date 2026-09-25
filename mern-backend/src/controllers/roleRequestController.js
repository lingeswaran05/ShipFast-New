import { RoleRequest } from '../models/RoleRequest.js';
import { User } from '../models/User.js';
import { AgentProfile } from '../models/AgentProfile.js';
import { generateRequestId } from '../utils/idGenerators.js';

export const createRequest = async (req, res, next) => {
  try {
    const user = req.user;
    const { requestedRole, reason, agentDetails, documents } = req.body;

    if (!requestedRole) {
      return res.status(400).json({ status: false, message: 'requestedRole is required' });
    }

    const normRole = String(requestedRole).toUpperCase();
    const requestId = generateRequestId();

    const phone = req.body.phone || agentDetails?.phone || user.phoneNumber || '';
    const vehicleType = req.body.vehicleType || agentDetails?.vehicleType || 'Bike';
    const vehicleNumber = req.body.vehicleNumber || agentDetails?.vehicleNumber || '';
    const licenseNumber = req.body.licenseNumber || agentDetails?.licenseNumber || '';
    const experience = req.body.experience || agentDetails?.experience || '';
    const aadharNumber = req.body.aadharNumber || agentDetails?.aadharNumber || '';
    const rcBookNumber = req.body.rcBookNumber || agentDetails?.rcBookNumber || '';
    const bloodType = req.body.bloodType || agentDetails?.bloodType || '';
    const organDonor = req.body.organDonor ?? agentDetails?.organDonor ?? false;
    const profilePhoto = documents?.profilePhoto || agentDetails?.profilePhoto || null;
    const aadharCopy = documents?.aadharCopy || null;
    const licenseCopy = documents?.licenseCopy || null;
    const rcBookCopy = documents?.rcBookCopy || null;

    // Check if there's already a pending request
    const existingPending = await RoleRequest.findOne({
      userId: user.userId,
      status: 'PENDING'
    });

    if (existingPending) {
      existingPending.requestedRole = normRole;
      existingPending.reason = reason || existingPending.reason;
      if (phone) existingPending.phone = phone;
      if (vehicleType) existingPending.vehicleType = vehicleType;
      if (vehicleNumber) existingPending.vehicleNumber = vehicleNumber;
      if (licenseNumber) existingPending.licenseNumber = licenseNumber;
      if (experience) existingPending.experience = experience;
      await existingPending.save();

      if (['AGENT', 'DRIVER', 'OPERATIONS'].includes(normRole)) {
        await AgentProfile.findOneAndUpdate(
          { userId: user.userId },
          {
            userId: user.userId,
            agentId: user.userId,
            fullName: user.fullName,
            email: user.email,
            phoneNumber: phone || user.phoneNumber || '',
            vehicleType: vehicleType || 'Bike',
            vehicleNumber: vehicleNumber || '',
            licenseNumber: licenseNumber || '',
            experience: experience || '',
            status: 'PENDING'
          },
          { upsert: true, new: true }
        );
      }

      return res.status(200).json({
        status: true,
        message: 'Role request updated successfully',
        data: existingPending.toDto()
      });
    }

    const roleRequest = new RoleRequest({
      requestId,
      userId: user.userId,
      userEmail: user.email,
      userName: user.fullName,
      requestedRole: normRole,
      reason: reason || '',
      phone,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      experience,
      status: 'PENDING'
    });

    await roleRequest.save();

    // Also upsert agent profile as PENDING if requesting AGENT / DRIVER
    if (['AGENT', 'DRIVER', 'OPERATIONS'].includes(normRole)) {
      await AgentProfile.findOneAndUpdate(
        { userId: user.userId },
        {
          userId: user.userId,
          agentId: user.userId,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: phone || user.phoneNumber || '',
          vehicleType: vehicleType || 'Bike',
          vehicleNumber: vehicleNumber || '',
          licenseNumber: licenseNumber || '',
          experience: experience || '',
          status: 'PENDING'
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
    if (!user) {
      return res.status(401).json({ status: false, message: 'Unauthorized' });
    }
    const userId = user.userId || user.id;
    const email = String(user.email || '').toLowerCase();

    const query = {
      $or: [
        ...(userId ? [{ userId }] : []),
        ...(email ? [{ userEmail: email }, { email }] : [])
      ]
    };

    const latestRequest = await RoleRequest.findOne(query).sort({ createdAt: -1 });

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

    const request = await RoleRequest.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ status: false, message: 'Role request not found' });
    }

    request.status = 'APPROVED';
    request.reviewedBy = reviewer ? reviewer.email || reviewer.userId : 'ADMIN';
    request.reviewedAt = new Date();
    await request.save();

    // Update user role
    const user = await User.findOne({ userId: request.userId });
    if (user) {
      user.role = request.requestedRole;
      await user.save();
    }

    // Update agent profile if exists
    await AgentProfile.findOneAndUpdate(
      { userId: request.userId },
      {
        status: 'VERIFIED',
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
    const { comments, reason } = req.body;

    const request = await RoleRequest.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ status: false, message: 'Role request not found' });
    }

    request.status = 'REJECTED';
    request.reviewedBy = reviewer ? reviewer.email || reviewer.userId : 'ADMIN';
    request.reviewedAt = new Date();
    request.comments = comments || reason || 'Request rejected by admin';
    await request.save();

    // Update agent profile if exists
    await AgentProfile.findOneAndUpdate(
      { userId: request.userId },
      {
        status: 'REJECTED',
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
    const request = await RoleRequest.findOne({ requestId });

    if (!request) {
      return res.status(404).json({ status: false, message: 'Role request not found' });
    }

    request.status = 'CANCELLED';
    await request.save();

    await AgentProfile.findOneAndUpdate(
      { userId: request.userId },
      { status: 'INACTIVE' }
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

import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Briefcase, MapPin, IndianRupee, Truck, TrendingUp, Users, Package, Activity, X, Plus, Edit, FileText, Upload, Download, Eye, ChevronRight, Trash2, Camera, Save, XCircle } from 'lucide-react';
import { useShipment } from '../../context/ShipmentContext';
import { SectionDownloader } from '../shared/SectionDownloader';
import { ConfirmationModal } from '../shared/ConfirmationModal';
import { AdminTicketsPanel } from './AdminTicketsPanel';
import { toast } from 'sonner';
import { reportingService } from '../../lib/reportingService';
import { operationsService } from '../../lib/operationsService';
import { roleService } from '../../lib/roleService';
import { shipmentService } from '../../lib/shipmentService';

const isCodShipment = (shipment = {}) => (
  ['cod', 'cash'].includes(String(shipment.paymentMode || shipment.paymentMethod || '').toLowerCase())
);
const isPaymentSettled = (shipment = {}) => {
  if (!isCodShipment(shipment)) return true;
  const paymentStatus = String(shipment.paymentStatus || '').toUpperCase();
  return ['SUCCESS', 'PAID', 'COMPLETED'].includes(paymentStatus);
};
const getRealizedRevenue = (shipment = {}) => (
  isPaymentSettled(shipment) ? (Number(shipment.cost) || 0) : 0
);
const normalizeShipmentStatus = (status) => String(status || '').toUpperCase().replace(/_/g, ' ').trim();

function RejectionReasonModal({
  isOpen,
  reason,
  onChange,
  onClose,
  onSubmit,
  isSubmitting = false
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Reject Agent Request</h3>
          <p className="text-sm text-slate-500 mt-1">Send a short reason to customer so they can correct and re-apply.</p>
        </div>
        <div className="p-5 space-y-2">
          <label className="text-sm font-medium text-slate-700">Rejection Reason</label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Example: Aadhaar copy is unclear. Please upload a clear image."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
        <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !String(reason || '').trim()}
            className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Sending...' : 'Reject & Send Reason'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard({ view }) {

  const navigate = useNavigate();
  const location = useLocation();
    const {
        currentUser,
        shipments,
        users,
        roleRequests,
        lastDataSyncAt,
        pricingConfig,
        branches: contextBranches,
        vehicles: contextVehicles,
        staff: contextStaff,
        addBranch,
        addVehicle,
        updateBranch,
        updateVehicle,
        removeVehicle,
        updateBranchStatus,
        updateVehicleStatus,
        updateStaff,
        removeBranch,
        removeStaff,
        addStaff,
        approveRoleRequest,
        rejectRoleRequest,
        updateUserRole,
        removeUserAccess,
        updatePricingConfig,
        refreshOperationalData,
        createSupportTicket,
        deleteShipment,
        deleteAllShipments,
        assignShipmentToAgent
    } = useShipment();
  
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [isPricingEditing, setIsPricingEditing] = useState(false);
  const [isPricingSaving, setIsPricingSaving] = useState(false);
  const [pricingDraft, setPricingDraft] = useState({
    profitPercentage: Number(pricingConfig?.profitPercentage ?? 20),
    standardRatePerKg: Number(pricingConfig?.standardRatePerKg ?? 80),
    expressMultiplier: Number(pricingConfig?.expressMultiplier ?? 1.75),
    sameDayMultiplier: 2,
    distanceSurcharge: Number(pricingConfig?.distanceSurcharge ?? 40),
    fuelSurchargePct: Number(pricingConfig?.fuelSurchargePct ?? 9),
    gstPct: Number(pricingConfig?.gstPct ?? 5),
    codHandlingFee: Number(pricingConfig?.codHandlingFee ?? 50)
  });
  const [reportSummary, setReportSummary] = useState(null);
  
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, type: '', id: null, title: '', message: '' });

  const [newBranch, setNewBranch] = useState({ name: '', type: 'Branch', state: '', manager: '', contact: '', staffCount: 0, location: '', description: '' });
  const [newVehicle, setNewVehicle] = useState({ number: '', type: 'Van', driver: '', driverName: '', seats: 2, rcBook: '', photo: null, status: 'Available' });
  const [newStaff, setNewStaff] = useState({ name: '', role: 'Agent', branch: '', status: 'Active' });
  const [isEditing, setIsEditing] = useState(false);
    const [roleDrafts, setRoleDrafts] = useState({});
    const [isRefreshing, setIsRefreshing] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  const [branchTypeFilter, setBranchTypeFilter] = useState('ALL');
  const [fleetSearch, setFleetSearch] = useState('');
  const [fleetStatusFilter, setFleetStatusFilter] = useState('ALL');
  const [staffAudienceFilter, setStaffAudienceFilter] = useState('staff');
  const [staffSearch, setStaffSearch] = useState('');
  const [agentProfiles, setAgentProfiles] = useState({});
  const [backendPendingRequests, setBackendPendingRequests] = useState([]);
  const [selectedAgentRecord, setSelectedAgentRecord] = useState(null);
  const [isAgentDetailOpen, setIsAgentDetailOpen] = useState(false);
  const [isSavingVerification, setIsSavingVerification] = useState(false);
  const [isRejectReasonOpen, setIsRejectReasonOpen] = useState(false);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [pendingRejectRequest, setPendingRejectRequest] = useState(null);
  const [branchVisibleCount, setBranchVisibleCount] = useState(5);
  const [fleetVisibleCount, setFleetVisibleCount] = useState(5);
  const [staffVisibleCount, setStaffVisibleCount] = useState(5);
  const [userVisibleCount, setUserVisibleCount] = useState(5);
  const [pendingVisibleCount, setPendingVisibleCount] = useState(5);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState('ALL');
  const [shipmentVisibleCount, setShipmentVisibleCount] = useState(10);
  const [shipmentAgentDrafts, setShipmentAgentDrafts] = useState({});
  const [shipmentActionState, setShipmentActionState] = useState({});
  const [isDeletingAllShipments, setIsDeletingAllShipments] = useState(false);
  const vehicleFileInputRef = useRef(null);

  const agentUsers = useMemo(() => {
    const blockedNames = new Set(['kyle reese', 'kyle rease', 'kyle resse']);
    return (users || []).filter((u) => {
      if (String(u.role || '').toLowerCase() !== 'agent') return false;
      const normalizedName = String(u.name || '').trim().toLowerCase();
      return !blockedNames.has(normalizedName);
    });
  }, [users]);

  const userNameById = useMemo(() => {
    const map = {};
    (users || []).forEach((u) => {
      const label = u.name || u.email || 'N/A';
      if (u.userId) map[u.userId] = label;
      if (u.id) map[u.id] = label;
      if (u.email) map[u.email] = label;
    });
    return map;
  }, [users]);
  // Handle auto-opening of branch modal from navigation state
  useEffect(() => {
    if (view === 'branches' && location.state?.openBranchId && contextBranches.length > 0) {
        const branchToOpen = contextBranches.find(b => b.id === location.state.openBranchId);
        if (branchToOpen) {
            openBranchModal(branchToOpen);
            // Clear the state to prevent reopening on subsequent renders
            navigate(location.pathname, { replace: true, state: {} });
        }
    }
  }, [view, location.state, contextBranches, navigate, location.pathname]);

  const getAgentKey = (agent = {}) => agent.userId || agent.id || agent.email;
  const hasProfileRequestSignal = (profile = {}) => {
    if (!profile) return false;
    const hasDocs = Boolean(
      profile.profileImage ||
      profile.aadharCopy ||
      profile.licenseCopy ||
      profile.rcBookCopy
    );
    const hasDetails = Boolean(
      profile.licenseNumber ||
      profile.aadharNumber ||
      profile.vehicleNumber ||
      profile.rcBookNumber
    );
    const hasNotes = Boolean(String(profile.verificationNotes || '').trim());
    return hasDocs || hasDetails || hasNotes;
  };
  const matchesRequestIdentity = (request, identity) => {
    const normalized = String(identity || '').trim().toLowerCase();
    if (!normalized) return false;
    return [request?.userId, request?.email]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase())
      .includes(normalized);
  };

  const getLocalAgentDocs = (agent = {}) => {
    const identities = [agent?.userId, agent?.id, agent?.email].filter(Boolean);
    let cachedDocs = {};
    for (const identity of identities) {
      try {
        const raw = localStorage.getItem(`sf_agent_onboarding_${identity}`) || localStorage.getItem(`agent_onboarding_${identity}`);
        if (!raw) continue;
        const parsed = JSON.parse(raw) || {};
        cachedDocs = {
          profilePhoto: parsed?.profilePhoto || cachedDocs.profilePhoto || null,
          aadharCopy: parsed?.aadharCopy || cachedDocs.aadharCopy || null,
          licenseCopy: parsed?.licenseCopy || cachedDocs.licenseCopy || null,
          rcBookCopy: parsed?.rcBookCopy || cachedDocs.rcBookCopy || null
        };
      } catch {
        // continue other identities
      }
    }
    const fromRequest = (roleRequests || []).find((request) =>
      identities.some((identity) => matchesRequestIdentity(request, identity))
    )?.documents || {};
    return {
      profilePhoto: cachedDocs.profilePhoto || fromRequest.profilePhoto || null,
      aadharCopy: cachedDocs.aadharCopy || fromRequest.aadharCopy || null,
      licenseCopy: cachedDocs.licenseCopy || fromRequest.licenseCopy || null,
      rcBookCopy: cachedDocs.rcBookCopy || fromRequest.rcBookCopy || null
    };
  };

  const getAgentViewData = (agent = {}) => {
    const key = getAgentKey(agent);
    const profile = agentProfiles[key] || null;
    const inlineRequestData = (agent?.agentDetails || agent?.documents || agent?.requestedRole) ? agent : null;
    const requestData = (roleRequests || []).find((request) => matchesRequestIdentity(request, key)) || inlineRequestData;
    const localDocs = getLocalAgentDocs(agent);
    const requestDocs = requestData?.documents || {};
    const docs = {
      profilePhoto: localDocs.profilePhoto || requestDocs.profilePhoto || profile?.profileImage || null,
      aadharCopy: localDocs.aadharCopy || requestDocs.aadharCopy || profile?.aadharCopy || null,
      licenseCopy: localDocs.licenseCopy || requestDocs.licenseCopy || profile?.licenseCopy || null,
      rcBookCopy: localDocs.rcBookCopy || requestDocs.rcBookCopy || profile?.rcBookCopy || null
    };
    const mergedProfile = {
      licenseNumber: profile?.licenseNumber || requestData?.agentDetails?.licenseNumber || '',
      vehicleNumber: profile?.vehicleNumber || requestData?.agentDetails?.vehicleNumber || '',
      rcBookNumber: profile?.rcBookNumber || requestData?.agentDetails?.rcBookNumber || '',
      bloodType: profile?.bloodType || requestData?.agentDetails?.bloodType || '',
      organDonor: profile?.organDonor ?? requestData?.agentDetails?.organDonor ?? false,
      bankAccountHolder: profile?.bankAccountHolder || requestData?.agentDetails?.bankAccountHolder || '',
      bankAccountNumber: profile?.bankAccountNumber || requestData?.agentDetails?.bankAccountNumber || '',
      bankIfsc: profile?.bankIfsc || requestData?.agentDetails?.bankIfsc || '',
      bankName: profile?.bankName || requestData?.agentDetails?.bankName || '',
      salaryBalance: Number(profile?.salaryBalance || 0),
      totalSalaryCredited: Number(profile?.totalSalaryCredited || 0),
      totalSalaryDebited: Number(profile?.totalSalaryDebited || 0),
      profileImage: profile?.profileImage || requestData?.documents?.profilePhoto || null,
      verificationStatus: profile?.verificationStatus || requestData?.status || 'PENDING'
    };
    const rawVerificationStatus = String(mergedProfile?.verificationStatus || '').toUpperCase() || 'PENDING';
    const verificationStatus = rawVerificationStatus === 'PENDING_VERIFICATION' ? 'PENDING' : rawVerificationStatus;
    return { key, profile: mergedProfile, docs, verificationStatus, requestData };
  };

  const openAgentDetails = (agent) => {
    if (!agent) return;
    setSelectedAgentRecord(agent);
    setIsAgentDetailOpen(true);
  };

  const handleVerifyAgent = async (agent, verified = true) => {
    const key = getAgentKey(agent);
    if (!key) return;
    const existingProfile = agentProfiles[key] || {};
    try {
      setIsSavingVerification(true);
      const updated = await operationsService.verifyAgentProfile(key, {
        verified,
        verifiedBy: currentUser?.name || currentUser?.email || 'Admin',
        verificationNotes: verified ? 'Documents checked by admin' : 'Rejected by admin'
      });
      setAgentProfiles((prev) => ({ ...prev, [key]: updated }));
      if (selectedAgentRecord && getAgentKey(selectedAgentRecord) === key) {
        setSelectedAgentRecord((prev) => ({ ...prev }));
      }
      toast.success(verified ? 'Agent verified successfully' : 'Agent verification marked as rejected');
    } catch {
      try {
        const fallback = await operationsService.upsertAgentProfile(key, {
          licenseNumber: existingProfile.licenseNumber || '',
          vehicleNumber: existingProfile.vehicleNumber || '',
          rcBookNumber: existingProfile.rcBookNumber || '',
          bloodType: existingProfile.bloodType || '',
          organDonor: existingProfile.organDonor ?? false,
          shiftTiming: existingProfile.shiftTiming || 'Day',
          verificationStatus: verified ? 'VERIFIED' : 'REJECTED',
          verifiedBy: currentUser?.name || currentUser?.email || 'Admin'
        });
        setAgentProfiles((prev) => ({ ...prev, [key]: fallback }));
        toast.success(verified ? 'Agent verified successfully' : 'Agent verification marked as rejected');
      } catch (error) {
        toast.error(error.message || 'Failed to update verification');
      }
    } finally {
      setIsSavingVerification(false);
    }
  };

  useEffect(() => {
    if (!['staff', 'runsheets', 'overview'].includes(view)) return;
    const agents = (users || []).filter((u) => String(u.role || '').toLowerCase() === 'agent');
    if (agents.length === 0) {
      setAgentProfiles({});
      return;
    }

    let cancelled = false;
    const loadProfiles = async () => {
      const results = await Promise.allSettled(
        agents.map(async (agent) => {
          const key = getAgentKey(agent);
          if (!key) return null;
          const profile = await operationsService.getAgentProfile(key);
          return profile ? { key, profile } : null;
        })
      );

      if (cancelled) return;
      const nextMap = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value?.key) {
          nextMap[result.value.key] = result.value.profile;
        }
      });
      setAgentProfiles(nextMap);
    };

    loadProfiles();
    return () => {
      cancelled = true;
    };
  }, [view, users]);

  useEffect(() => {
    setPricingDraft({
      profitPercentage: Number(pricingConfig?.profitPercentage ?? 20),
      standardRatePerKg: Number(pricingConfig?.standardRatePerKg ?? 80),
      expressMultiplier: Number(pricingConfig?.expressMultiplier ?? 1.75),
      sameDayMultiplier: 2,
      distanceSurcharge: Number(pricingConfig?.distanceSurcharge ?? 40),
      fuelSurchargePct: Number(pricingConfig?.fuelSurchargePct ?? 9),
      gstPct: Number(pricingConfig?.gstPct ?? 5),
      codHandlingFee: Number(pricingConfig?.codHandlingFee ?? 50)
    });
  }, [
    pricingConfig?.profitPercentage,
    pricingConfig?.standardRatePerKg,
    pricingConfig?.expressMultiplier,
    pricingConfig?.distanceSurcharge,
    pricingConfig?.fuelSurchargePct,
    pricingConfig?.gstPct,
    pricingConfig?.codHandlingFee
  ]);

  useEffect(() => {
    if (view !== 'staff') return;

    let cancelled = false;
    const loadBackendPendingRequests = async () => {
      const normalize = (value) => String(value || '').trim();
      const normalizeRole = (value) => String(value || 'agent').toLowerCase();
      const normalizeStatus = (value) => String(value || 'PENDING').toUpperCase();

      let pendingRequests = [];
      try {
        const payload = await roleService.getPendingRequests();
        if (Array.isArray(payload)) pendingRequests = payload;
        else if (Array.isArray(payload?.requests)) pendingRequests = payload.requests;
        else if (Array.isArray(payload?.content)) pendingRequests = payload.content;
      } catch {
        pendingRequests = [];
      }

      const checks = await Promise.allSettled(
        (pendingRequests || []).map(async (request) => {
          const requestId = request?.id || request?.requestId || request?._id;
          const userId = request?.userId || request?.user?.userId || request?.user?.id || request?.user?.email;
          const email = request?.email || request?.user?.email || '';
          const name = request?.name || request?.user?.name || request?.user?.fullName || email || userId || 'User';
          const identity = normalize(userId || email || requestId);
          if (!identity) return null;

          const profile = await operationsService.getAgentProfile(identity);
          const localDocs = getLocalAgentDocs({ userId: identity, email });

          return {
            id: requestId || `backend-${identity}`,
            userId: userId || identity,
            email,
            name,
            currentRole: normalizeRole(request?.currentRole || request?.role || 'customer'),
            requestedRole: normalizeRole(request?.requestedRole || request?.roleRequested || 'agent'),
            reason: request?.reason || request?.notes || profile?.verificationNotes || '',
            agentDetails: {
              licenseNumber: request?.agentDetails?.licenseNumber || profile?.licenseNumber || '',
              aadharNumber: request?.agentDetails?.aadharNumber || profile?.aadharNumber || '',
              vehicleNumber: request?.agentDetails?.vehicleNumber || profile?.vehicleNumber || '',
              rcBookNumber: request?.agentDetails?.rcBookNumber || profile?.rcBookNumber || '',
              bloodType: request?.agentDetails?.bloodType || profile?.bloodType || '',
              organDonor: Boolean(request?.agentDetails?.organDonor ?? profile?.organDonor),
              bankAccountHolder: request?.agentDetails?.bankAccountHolder || profile?.bankAccountHolder || '',
              bankAccountNumber: request?.agentDetails?.bankAccountNumber || profile?.bankAccountNumber || '',
              bankIfsc: request?.agentDetails?.bankIfsc || profile?.bankIfsc || '',
              bankName: request?.agentDetails?.bankName || profile?.bankName || '',
              shiftTiming: request?.agentDetails?.shiftTiming || profile?.shiftTiming || 'Day'
            },
            documents: {
              profilePhoto: request?.documents?.profilePhoto || profile?.profileImage || localDocs.profilePhoto || null,
              aadharCopy: request?.documents?.aadharCopy || profile?.aadharCopy || localDocs.aadharCopy || null,
              licenseCopy: request?.documents?.licenseCopy || profile?.licenseCopy || localDocs.licenseCopy || null,
              rcBookCopy: request?.documents?.rcBookCopy || profile?.rcBookCopy || localDocs.rcBookCopy || null
            },
            requestRecord: request,
            status: normalizeStatus(request?.status || 'PENDING'),
            createdAt: request?.createdAt || request?.requestedAt || profile?.updatedAt || new Date().toISOString()
          };
        })
      );

      if (cancelled) return;

      const next = checks
        .filter((result) => result.status === 'fulfilled' && result.value)
        .map((result) => result.value);

      if (next.length > 0) {
        setBackendPendingRequests(next);
        return;
      }

      // Fallback path: derive pending requests from operations profile data
      // when role request endpoint is unavailable (e.g., 404) or returns empty.
      const customerCandidates = (users || []).filter((user) => String(user?.role || '').toLowerCase() === 'customer');
      const profileChecks = await Promise.allSettled(
        customerCandidates.map(async (user) => {
          const identities = [user?.userId, user?.id, user?.email]
            .map((value) => String(value || '').trim())
            .filter(Boolean);
          for (const identity of identities) {
            const profile = await operationsService.getAgentProfile(identity);
            if (!profile || !hasProfileRequestSignal(profile)) continue;

            const status = normalizeStatus(profile?.verificationStatus || 'PENDING');
            if (!['PENDING', 'PENDING_VERIFICATION'].includes(status)) continue;

            const localDocs = getLocalAgentDocs({ userId: identity, email: user?.email });
            return {
              id: `ops-${identity}`,
              userId: user?.userId || user?.id || identity,
              email: user?.email || '',
              name: user?.name || user?.fullName || user?.email || identity,
              currentRole: 'customer',
              requestedRole: 'agent',
              reason: profile?.verificationNotes || '',
              agentDetails: {
                licenseNumber: profile?.licenseNumber || '',
                aadharNumber: profile?.aadharNumber || '',
                vehicleNumber: profile?.vehicleNumber || '',
                rcBookNumber: profile?.rcBookNumber || '',
                bloodType: profile?.bloodType || '',
                organDonor: Boolean(profile?.organDonor),
                bankAccountHolder: profile?.bankAccountHolder || '',
                bankAccountNumber: profile?.bankAccountNumber || '',
                bankIfsc: profile?.bankIfsc || '',
                bankName: profile?.bankName || '',
                shiftTiming: profile?.shiftTiming || 'Day'
              },
              documents: {
                profilePhoto: profile?.profileImage || localDocs.profilePhoto || null,
                aadharCopy: profile?.aadharCopy || localDocs.aadharCopy || null,
                licenseCopy: profile?.licenseCopy || localDocs.licenseCopy || null,
                rcBookCopy: profile?.rcBookCopy || localDocs.rcBookCopy || null
              },
              status,
              createdAt: profile?.updatedAt || profile?.joinDate || new Date().toISOString()
            };
          }
          return null;
        })
      );

      const fallbackPending = profileChecks
        .filter((result) => result.status === 'fulfilled' && result.value)
        .map((result) => result.value);

      setBackendPendingRequests(fallbackPending);
    };

    loadBackendPendingRequests();
    const interval = setInterval(() => {
      loadBackendPendingRequests();
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [view, users, roleRequests]);

  const activeShipmentsCount = shipments.filter(s => s.status !== 'Delivered' && s.status !== 'Cancelled').length;
  const profitPercentage = Number(pricingConfig?.profitPercentage ?? 20);
  const totalRevenue = shipments.reduce((acc, s) => acc + getRealizedRevenue(s), 0);
  const totalProfit = (totalRevenue * (Number.isFinite(profitPercentage) ? profitPercentage : 20)) / 100;
  const activeBranchCount = (contextBranches || []).filter(b => String(b.status || '').toLowerCase() === 'active').length;
  const hubCount = (contextBranches || []).filter(b => String(b.type || '').toLowerCase() === 'hub').length;
  const availableFleetCount = (contextVehicles || []).filter(v => String(v.status || '').toLowerCase() === 'available').length;
  const transitFleetCount = (contextVehicles || []).filter(v => String(v.status || '').toLowerCase().includes('transit')).length;
  const isStaffRole = (role) => String(role || '').toLowerCase() !== 'customer';

  const handlePricingDraftChange = (field, value) => {
    const numeric = Number(value);
    setPricingDraft((prev) => ({
      ...prev,
      [field]: Number.isFinite(numeric) ? numeric : 0,
      ...(field === 'expressMultiplier' ? { sameDayMultiplier: 2 } : {})
    }));
  };

  const handlePricingEditToggle = async () => {
    if (!isPricingEditing) {
      setIsPricingEditing(true);
      return;
    }

    setIsPricingSaving(true);
    try {
      await updatePricingConfig({
        ...pricingDraft,
        sameDayMultiplier: 2
      });
      toast.success('Pricing configuration saved successfully!');
      setIsPricingEditing(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to save pricing configuration');
    } finally {
      setIsPricingSaving(false);
    }
  };

  const filteredBranches = useMemo(() => {
    const query = branchSearch.trim().toLowerCase();
    return (contextBranches || []).filter((branch) => {
      const matchesType = branchTypeFilter === 'ALL' || String(branch.type || '').toUpperCase() === branchTypeFilter;
      if (!matchesType) return false;
      if (!query) return true;
      return [branch.name, branch.location, branch.state, branch.manager, branch.contact]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [contextBranches, branchSearch, branchTypeFilter]);

  const filteredVehicles = useMemo(() => {
    const query = fleetSearch.trim().toLowerCase();
    return (contextVehicles || []).filter((vehicle) => {
      const status = String(vehicle.status || '').toUpperCase().replace(/ /g, '_');
      const matchesStatus = fleetStatusFilter === 'ALL' || status === fleetStatusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      return [vehicle.number, vehicle.vehicleNumber, vehicle.type, vehicle.driver, vehicle.driverName, userNameById[vehicle.driverUserId], vehicle.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [contextVehicles, fleetSearch, fleetStatusFilter, userNameById]);

  const filteredUsers = useMemo(() => {
    const query = staffSearch.trim().toLowerCase();
    const visibleUsers = (users || []).filter((user) => {
      const role = String(user.role || 'customer').toLowerCase();
      if (staffAudienceFilter === 'staff' && !isStaffRole(role)) return false;
      if (staffAudienceFilter === 'customer' && role !== 'customer') return false;
      if (!query) return true;
      return [user.name, user.email, user.userId, user.id, role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
    const roleRank = {
      agent: 0,
      driver: 0,
      manager: 0,
      sorter: 0,
      admin: 1,
      customer: 2
    };
    return [...visibleUsers].sort((a, b) => {
      const aRole = String(a?.role || 'customer').toLowerCase();
      const bRole = String(b?.role || 'customer').toLowerCase();
      const aRank = roleRank[aRole] ?? 3;
      const bRank = roleRank[bRole] ?? 3;
      if (aRank !== bRank) return aRank - bRank;
      return String(a?.name || a?.email || '').localeCompare(String(b?.name || b?.email || ''));
    });
  }, [users, staffAudienceFilter, staffSearch]);

  const filteredStaffCards = useMemo(() => {
    const query = staffSearch.trim().toLowerCase();
    const staffBlacklist = new Set(['sarah connor', 'kyle reese']);
    return (contextStaff || []).filter((staffMember) => {
      const role = String(staffMember.role || '').toLowerCase();
      if (staffAudienceFilter === 'customer') return false;
      if (staffAudienceFilter === 'staff' && !isStaffRole(role)) return false;
      if (staffBlacklist.has(String(staffMember.name || '').toLowerCase())) return false;
      if (!query) return true;
      return [staffMember.name, staffMember.role, staffMember.branch, staffMember.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [contextStaff, staffAudienceFilter, staffSearch]);

  useEffect(() => {
    setBranchVisibleCount(5);
  }, [branchSearch, branchTypeFilter, view]);

  useEffect(() => {
    setFleetVisibleCount(5);
  }, [fleetSearch, fleetStatusFilter, view]);

  useEffect(() => {
    setStaffVisibleCount(5);
    setUserVisibleCount(5);
    setPendingVisibleCount(5);
  }, [staffSearch, staffAudienceFilter, view]);

  useEffect(() => {
    setShipmentVisibleCount(10);
  }, [shipmentSearch, shipmentStatusFilter, view]);

  const getShipmentIdentifier = (shipment = {}) => shipment.trackingNumber || shipment.trackingId || shipment.shipmentId || shipment.id;
  const normalizeShipmentStatusValue = (value = '') => String(value || '').toUpperCase().replace(/ /g, '_').trim();
  const formatShipmentStatus = (value = '') => String(value || '').replace(/_/g, ' ').trim();

  const allShipmentStatusOptions = useMemo(() => {
    const statuses = [...new Set((shipments || [])
      .map((shipment) => normalizeShipmentStatusValue(shipment.status))
      .filter(Boolean))];
    return ['ALL', ...statuses];
  }, [shipments]);

  const managedShipments = useMemo(() => (
    [...(shipments || [])].sort((a, b) => {
      const timeA = new Date(a?.createdAt || a?.date || 0).getTime();
      const timeB = new Date(b?.createdAt || b?.date || 0).getTime();
      return timeB - timeA;
    })
  ), [shipments]);

  const filteredManagedShipments = useMemo(() => {
    const query = String(shipmentSearch || '').trim().toLowerCase();
    return managedShipments.filter((shipment) => {
      const statusKey = normalizeShipmentStatusValue(shipment.status);
      if (shipmentStatusFilter !== 'ALL' && statusKey !== shipmentStatusFilter) return false;
      if (!query) return true;
      const receiver = shipment.receiver || shipment.receiverAddress || {};
      const sender = shipment.sender || shipment.senderAddress || {};
      return [
        getShipmentIdentifier(shipment),
        shipment.customerName,
        shipment.customerEmail,
        shipment.assignedAgentId,
        sender.city,
        receiver.city,
        shipment.status
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [managedShipments, shipmentSearch, shipmentStatusFilter]);

  const visibleManagedShipments = useMemo(
    () => filteredManagedShipments.slice(0, shipmentVisibleCount),
    [filteredManagedShipments, shipmentVisibleCount]
  );

  const adminShipmentMetrics = useMemo(() => {
    const total = shipments.length;
    const delivered = shipments.filter((shipment) => String(shipment.status || '').toLowerCase() === 'delivered').length;
    const assigned = shipments.filter((shipment) => Boolean(shipment.assignedAgentId || shipment.assignedToAgentId)).length;
    const unassigned = Math.max(total - assigned, 0);
    const codAmount = shipments
      .filter((shipment) => isCodShipment(shipment) && isPaymentSettled(shipment))
      .reduce((sum, shipment) => sum + (Number(shipment.cost) || 0), 0);
    return { total, delivered, assigned, unassigned, codAmount };
  }, [shipments]);

  const shipmentKpis = useMemo(() => {
    const total = shipments.length;
    const delivered = shipments.filter((s) => String(s.status || '').toLowerCase() === 'delivered').length;
    const inProgress = shipments.filter((s) => ['booked', 'in transit', 'out for delivery', 'received at hub']
      .includes(String(s.status || '').toLowerCase())).length;
    const failed = shipments.filter((s) => ['failed', 'failed attempt', 'cancelled']
      .includes(String(s.status || '').toLowerCase())).length;
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const avgRevenue = total > 0 ? totalRevenue / total : 0;
    const codDelivered = shipments
      .filter((s) =>
        String(s.status || '').toLowerCase() === 'delivered'
        && isCodShipment(s)
        && isPaymentSettled(s)
      )
      .reduce((sum, s) => sum + (Number(s.cost) || 0), 0);

    return { total, delivered, inProgress, failed, deliveryRate, avgRevenue, codDelivered };
  }, [shipments, totalRevenue]);
  
  // --- Handlers ---
  const handleBranchSubmit = async (e) => {
      e.preventDefault();
      try {
        if (isEditing) {
            await updateBranch(newBranch);
            toast.success('Branch updated');
        } else {
            await addBranch(newBranch);
            toast.success('Branch added');
        }
        setNewBranch({ name: '', type: 'Branch', state: '', manager: '', contact: '', staffCount: 0, location: '', description: '' });
        setIsEditing(false);
        setShowBranchModal(false);
      } catch (error) {
        toast.error(error.message || 'Failed to save branch');
      }
  };

  const confirmDelete = (type, id, title, message) => {
      setDeleteConfirmation({ isOpen: true, type, id, title, message });
  };

  const executeDelete = async () => {
    try {
      if (deleteConfirmation.type === 'branch') {
        await Promise.resolve(removeBranch(deleteConfirmation.id));
        toast.success('Branch deleted');
      } else if (deleteConfirmation.type === 'vehicle') {
        await Promise.resolve(removeVehicle(deleteConfirmation.id));
        toast.success('Vehicle deleted');
      } else if (deleteConfirmation.type === 'staff') {
        await Promise.resolve(removeStaff(deleteConfirmation.id));
        toast.success('Staff deleted');
      } else if (deleteConfirmation.type === 'shipment') {
        await deleteShipment(deleteConfirmation.id);
        toast.success('Shipment deleted permanently');
      } else if (deleteConfirmation.type === 'shipments-all') {
        setIsDeletingAllShipments(true);
        const result = await deleteAllShipments();
        setShipmentAgentDrafts({});
        toast.success(`Deleted ${result?.deletedCount || 0} shipment(s) from database`);
      }
    } catch (error) {
      toast.error(error.message || 'Delete action failed');
    } finally {
      setIsDeletingAllShipments(false);
      setDeleteConfirmation({ isOpen: false, type: '', id: null, title: '', message: '' });
    }
  };

  const handleVehicleSubmit = async (e) => {
      e.preventDefault();
      const selectedAgent = agentUsers.find(
        (agent) =>
          (agent.userId || agent.id || agent.email) === newVehicle.driver ||
          agent.email === newVehicle.driver
      );
      const payload = {
        ...newVehicle,
        driverUserId: selectedAgent?.userId || selectedAgent?.id || selectedAgent?.email || newVehicle.driver || '',
        driverName: selectedAgent?.name || selectedAgent?.email || newVehicle.driverName || ''
      };

      try {
        if (isEditing) {
            await updateVehicle(payload);
            toast.success('Vehicle updated');
        } else {
            await addVehicle(payload);
            toast.success('Vehicle added');
        }
        setNewVehicle({ number: '', type: 'Van', driver: '', driverName: '', seats: 2, rcBook: '', photo: null, status: 'Available' });
        setIsEditing(false);
        setShowVehicleModal(false);
      } catch (error) {
        toast.error(error.message || 'Failed to save vehicle');
      }
  };

  const handleVehiclePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewVehicle(prev => ({ ...prev, photo: reader.result }));
        };
        reader.readAsDataURL(file);
    }
  };

  const openBranchModal = (branch = null) => {
      if (branch) {
          setNewBranch(branch);
          setIsEditing(true);
      } else {
          setNewBranch({ name: '', type: 'Branch', state: '', manager: '', contact: '', staffCount: 0, location: '', description: '' });
          setIsEditing(false);
      }
      setShowBranchModal(true);
  };

  const openVehicleModal = (vehicle = null) => {
      if (vehicle) {
          setNewVehicle({
            ...vehicle,
            driver: vehicle.driverUserId || vehicle.driver || '',
            driverName: vehicle.driverName || userNameById[vehicle.driverUserId] || vehicle.driver || ''
          });
          setIsEditing(true);
      } else {
          setNewVehicle({ number: '', type: 'Van', driver: '', driverName: '', seats: 2, rcBook: '', photo: null, status: 'Available' });
          setIsEditing(false);
      }
      setShowVehicleModal(true);
  };
  
  const openStaffModal = (staffMember = null) => {
      if (staffMember) {
        setNewStaff(staffMember);
        setIsEditing(true);
      } else {
        setNewStaff({ name: '', role: 'Agent', branch: '', status: 'Active' });
        setIsEditing(false);
      }
      setShowStaffModal(true);
  };
  
  // Dynamic Analytics Data
  const { revenueData, volumeData } = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        return { 
            name: days[d.getDay()], 
            date: d.toISOString().split('T')[0],
            revenue: 0,
            volume: 0 
        };
    });

    shipments.forEach(s => {
        const sDate = s.date; // YYYY-MM-DD
        const dayEntry = last7Days.find(d => d.date === sDate);
        if (dayEntry) {
            dayEntry.volume += 1;
            dayEntry.revenue += parseFloat(s.cost) || 0;
        }
    });

    return { revenueData: last7Days, volumeData: last7Days };
  }, [shipments]);

    const shipmentStatusDistribution = useMemo(() => {
        const statusCounts = shipments.reduce((acc, s) => {
            const status = s.status || 'Unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
        const colors = {
            'Delivered': '#22c55e',
            'In Transit': '#3b82f6',
            'Pending': '#f97316',
            'Cancelled': '#ef4444',
            'Out for Delivery': '#8b5cf6',
            'Unknown': '#64748b'
        };
        return Object.entries(statusCounts).map(([name, value]) => ({ name, value, fill: colors[name] || colors['Unknown'] }));
    }, [shipments]);

    const userRoleDistribution = useMemo(() => {
        const roleCounts = users.reduce((acc, u) => {
            const role = (u.role || 'customer').toUpperCase();
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {});
        const colors = {
            'CUSTOMER': '#3b82f6',
            'AGENT': '#f97316',
            'ADMIN': '#8b5cf6',
        };
        return Object.entries(roleCounts).map(([name, value]) => ({ name, value, fill: colors[name] || '#64748b' }));
    }, [users]);

    const topPerformingBranches = useMemo(() => {
        return (contextBranches || [])
            .map((branch) => {
                const signals = [branch.name, branch.location, branch.state]
                    .filter(Boolean)
                    .map((value) => String(value).toLowerCase());
                const relatedShipments = (shipments || []).filter((shipment) => {
                    const haystack = [
                        shipment.origin,
                        shipment.destination,
                        shipment.sender?.city,
                        shipment.receiver?.city
                    ]
                        .filter(Boolean)
                        .map((value) => String(value).toLowerCase())
                        .join(' | ');
                    return signals.some((signal) => haystack.includes(signal));
                });
                const revenue = relatedShipments.reduce((sum, shipment) => sum + getRealizedRevenue(shipment), 0);
                const delivered = relatedShipments.filter((shipment) => String(shipment.status || '').toLowerCase() === 'delivered').length;

                return {
                    ...branch,
                    _revenue: revenue,
                    _shipments: relatedShipments.length,
                    _performance: relatedShipments.length > 0 ? Math.round((delivered / relatedShipments.length) * 100) : 0
                };
            })
            .sort((a, b) => (b._shipments - a._shipments) || (b._revenue - a._revenue))
            .slice(0, 3);
    }, [contextBranches, shipments]);

    const serviceTypeBreakdown = useMemo(() => {
      const grouped = {};
      (shipments || []).forEach((shipment) => {
        const service = String(shipment.type || shipment.service || 'Standard').trim() || 'Standard';
        if (!grouped[service]) {
          grouped[service] = { service, count: 0, revenue: 0 };
        }
        grouped[service].count += 1;
        grouped[service].revenue += getRealizedRevenue(shipment);
      });

      const totalCount = Math.max(shipments.length, 1);
      const totalRevenueValue = Math.max(totalRevenue, 1);

      return Object.values(grouped)
        .sort((a, b) => b.count - a.count)
        .map((row) => ({
          ...row,
          volumeShare: Math.round((row.count / totalCount) * 100),
          revenueShare: Math.round((row.revenue / totalRevenueValue) * 100)
        }));
    }, [shipments, totalRevenue]);

    const cityPerformance = useMemo(() => {
      const grouped = {};
      (shipments || []).forEach((shipment) => {
        const city = shipment.receiver?.city || shipment.receiverAddress?.city || shipment.destination || 'Unknown';
        if (!grouped[city]) {
          grouped[city] = { city, volume: 0, delivered: 0, revenue: 0 };
        }
        grouped[city].volume += 1;
        if (String(shipment.status || '').toLowerCase() === 'delivered') grouped[city].delivered += 1;
        grouped[city].revenue += getRealizedRevenue(shipment);
      });

      return Object.values(grouped)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 8);
    }, [shipments]);

    const statusPerformanceRows = useMemo(() => {
      const grouped = {};
      (shipments || []).forEach((shipment) => {
        const status = String(shipment.status || 'Unknown');
        if (!grouped[status]) {
          grouped[status] = { status, count: 0, revenue: 0 };
        }
        grouped[status].count += 1;
        grouped[status].revenue += getRealizedRevenue(shipment);
      });
      return Object.values(grouped).sort((a, b) => b.count - a.count);
    }, [shipments]);

    const recentShipmentTransactions = useMemo(() => {
      return [...(shipments || [])]
        .sort((a, b) => {
          const aDate = new Date(a.deliveryDate || a.date || 0).getTime();
          const bDate = new Date(b.deliveryDate || b.date || 0).getTime();
          return bDate - aDate;
        })
        .slice(0, 8);
    }, [shipments]);

    const activeAgentCount = useMemo(
      () => (users || []).filter((user) =>
        String(user.role || '').toLowerCase() === 'agent' &&
        String(user.status || 'active').toLowerCase() !== 'inactive'
      ).length,
      [users]
    );


  const onStaffFormSubmit = (e) => {
      e.preventDefault();
      if (isEditing) {
          updateStaff(newStaff);
      } else {
          addStaff(newStaff);
      }
      setNewStaff({ name: '', role: 'Agent', branch: '', status: 'Active' });
      setIsEditing(false);
      setShowStaffModal(false);
  };

    const pendingRoleRequests = useMemo(() => {
        const isPendingStatus = (value) => ['PENDING', 'PENDING_VERIFICATION'].includes(String(value || '').toUpperCase());
        const getIdentity = (request) => String(request?.userId || request?.email || request?.id || '').trim().toLowerCase();

        const localPending = (roleRequests || []).filter((request) => isPendingStatus(request?.status));
        const merged = [...localPending];
        // Only dedupe with currently pending local requests.
        const existing = new Set(localPending.map(getIdentity).filter(Boolean));

        (backendPendingRequests || []).forEach((request) => {
          if (!isPendingStatus(request?.status)) return;
          const identity = getIdentity(request);
          if (!identity || existing.has(identity)) return;
          merged.push(request);
          existing.add(identity);
        });

        return merged;
    }, [roleRequests, backendPendingRequests]);
    const selectedAgentView = selectedAgentRecord ? getAgentViewData(selectedAgentRecord) : null;
    const visibleBranches = filteredBranches.slice(0, branchVisibleCount);
    const visibleFleet = filteredVehicles.slice(0, fleetVisibleCount);
    const visibleUsers = filteredUsers.slice(0, userVisibleCount);
    const visiblePendingRequests = pendingRoleRequests.slice(0, pendingVisibleCount);
    const visibleStaffCards = filteredStaffCards.slice(0, staffVisibleCount);

    const getRoleRequestIdentity = (request) =>
      String(request?.userId || request?.email || request?.id || '').trim().toLowerCase();

    const handleApproveRequest = async (request) => {
        const requestId = typeof request === 'string' ? request : request?.id;
        const requestUserId = request?.userId || request?.email;
        const requestIdentity = getRoleRequestIdentity(request);
        try {
            setIsSavingVerification(true);
            setIsAgentDetailOpen(false);
            // The context function expects the whole request object
            await approveRoleRequest(request);
            
            setBackendPendingRequests(prev => prev.filter((item) => {
              const sameId = requestId && item.id === requestId;
              const sameUser = requestUserId && (item.userId === requestUserId || item.email === requestUserId);
              const sameIdentity = requestIdentity && getRoleRequestIdentity(item) === requestIdentity;
              return !(sameId || sameUser || sameIdentity);
            }));

            toast.success('Role request approved. User can now login as an agent.');
            setSelectedAgentRecord(null);
        } catch (error) {
            toast.error(error.message || 'Failed to approve request');
        } finally {
            setIsSavingVerification(false);
        }
    };

    const openRejectReasonModal = (request) => {
        setPendingRejectRequest(request);
        setRejectReasonText('');
        setIsRejectReasonOpen(true);
    };

    const handleRejectRequest = async (request, reason) => {
        const requestId = typeof request === 'string' ? request : request?.id;
        const requestUserId = request?.userId || request?.email;
        const trimmedReason = String(reason || '').trim();
        try {
            setIsSavingVerification(true);
            if (!trimmedReason) {
              toast.error('Rejection reason is required.');
              return;
            }
            if (requestUserId) {
              try {
                await operationsService.verifyAgentProfile(requestUserId, {
                  verified: false,
                  verifiedBy: currentUser?.name || currentUser?.email || 'Admin',
                  verificationNotes: `Rejected by admin: ${trimmedReason}`,
                  verificationStatus: 'REJECTED'
                });
              } catch {
                // keep local reject flow even if backend verification update fails
              }
            }
            if (requestId || request) {
              await rejectRoleRequest(request || requestId, trimmedReason);
            }
            const requestIdentity = getRoleRequestIdentity(request);
            setBackendPendingRequests(prev => prev.filter((item) => {
              const sameId = requestId && item.id === requestId;
              const sameUser = requestUserId && (item.userId === requestUserId || item.email === requestUserId);
              const sameIdentity = requestIdentity && getRoleRequestIdentity(item) === requestIdentity;
              return !(sameId || sameUser || sameIdentity);
            }));
            toast.success('Role request rejected.');
            setIsRejectReasonOpen(false);
            setPendingRejectRequest(null);
            setRejectReasonText('');
            setIsAgentDetailOpen(false);
        } catch (error) {
            toast.error(error.message || 'Failed to reject request');
        } finally {
            setIsSavingVerification(false);
        }
    };

    const handleUpdateUserRole = async (user) => {
        const nextRole = (roleDrafts[user.email] || user.role || 'customer').toLowerCase();
        try {
            await updateUserRole(user, nextRole);
            toast.success('User role updated successfully');
        } catch (error) {
            toast.error(error.message || 'Failed to update role');
        }
    };

    const handleRemoveUserAccess = async (user) => {
        try {
            await removeUserAccess(user);
            toast.success('User access removed successfully');
        } catch (error) {
            toast.error(error.message || 'Failed to remove access');
        }
    };

    const handleAssignManagedShipment = async (shipment) => {
        const shipmentId = getShipmentIdentifier(shipment);
        const selectedAgentId = String(
          shipmentAgentDrafts[shipmentId] ||
          shipment.assignedAgentId ||
          shipment.assignedToAgentId ||
          ''
        ).trim();
        if (!shipmentId) return toast.error('Invalid shipment identifier');
        if (!selectedAgentId) return toast.error('Select an agent before assigning');

        const actionKey = `assign:${shipmentId}`;
        setShipmentActionState((prev) => ({ ...prev, [actionKey]: true }));
        try {
          await assignShipmentToAgent(shipmentId, selectedAgentId);
          toast.success(`Shipment ${shipmentId} assigned successfully`);
          await handleRefresh();
        } catch (error) {
          toast.error(error.message || 'Failed to assign shipment');
        } finally {
          setShipmentActionState((prev) => ({ ...prev, [actionKey]: false }));
        }
    };

    const requestDeleteManagedShipment = (shipment) => {
        const shipmentId = getShipmentIdentifier(shipment);
        if (!shipmentId) return toast.error('Invalid shipment identifier');
        confirmDelete(
          'shipment',
          shipmentId,
          'Delete Shipment',
          `Delete shipment ${shipmentId} from database permanently?`
        );
    };

    const requestDeleteAllManagedShipments = () => {
        confirmDelete(
          'shipments-all',
          'ALL',
          'Delete All Shipments',
          `This will permanently delete all ${shipments.length} shipment records from database. Continue?`
        );
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refreshOperationalData();
                        if (view === 'reports') {
                            const summary = await reportingService.getSummary();
                            setReportSummary(summary);
                        }
            toast.success('Live data refreshed');
        } catch (error) {
            toast.error(error.message || 'Refresh failed');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleDownloadShipmentCsv = async () => {
        try {
            await reportingService.downloadShipmentCsv();
            toast.success('Shipment CSV downloaded');
        } catch (error) {
            toast.error(error.message || 'Failed to download shipment CSV');
        }
    };

        useEffect(() => {
            if (view !== 'reports') return;
            const loadSummary = async () => {
                try {
                    const summary = await reportingService.getSummary();
                    setReportSummary(summary);
                } catch {
                    setReportSummary(null);
                }
            };
            loadSummary();
        }, [view]);

  return (
      <div className="space-y-6 animate-fade-in-up relative">
        <ConfirmationModal 
            isOpen={deleteConfirmation.isOpen}
            onClose={() => setDeleteConfirmation({ isOpen: false, type: '', id: null, title: '', message: '' })}
            onConfirm={executeDelete}
            title={deleteConfirmation.title}
            message={deleteConfirmation.message}
        />
        <RejectionReasonModal
            isOpen={isRejectReasonOpen}
            reason={rejectReasonText}
            onChange={setRejectReasonText}
            onClose={() => {
              setIsRejectReasonOpen(false);
              setPendingRejectRequest(null);
              setRejectReasonText('');
            }}
            onSubmit={() => handleRejectRequest(pendingRejectRequest, rejectReasonText)}
            isSubmitting={isSavingVerification}
        />

        {isAgentDetailOpen && selectedAgentRecord && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setIsAgentDetailOpen(false)}
            >
              <div
                className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl animate-scale-in max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedAgentRecord.name || 'Agent Details'}</h3>
                    <p className="text-sm text-slate-500">{selectedAgentRecord.email || selectedAgentRecord.userId}</p>
                  </div>
                  <button onClick={() => setIsAgentDetailOpen(false)} className="text-slate-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">License Number</div>
                    <div className="font-semibold text-slate-900">{selectedAgentView?.profile?.licenseNumber || 'N/A'}</div>
                  </div>
                  <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Vehicle Number</div>
                    <div className="font-semibold text-slate-900">{selectedAgentView?.profile?.vehicleNumber || 'N/A'}</div>
                  </div>
                  <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">RC Book Number</div>
                    <div className="font-semibold text-slate-900">{selectedAgentView?.profile?.rcBookNumber || 'N/A'}</div>
                  </div>
                  <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Blood Type / Donor</div>
                    <div className="font-semibold text-slate-900">
                      {(selectedAgentView?.profile?.bloodType || 'N/A')} / {selectedAgentView?.profile?.organDonor ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Profile Photo', src: selectedAgentView?.profile?.profileImage || selectedAgentView?.docs?.profilePhoto },
                    { label: 'Aadhaar Copy', src: selectedAgentView?.docs?.aadharCopy },
                    { label: 'License Copy', src: selectedAgentView?.docs?.licenseCopy },
                    { label: 'RC Book Copy', src: selectedAgentView?.docs?.rcBookCopy }
                  ].map((doc) => (
                    <div key={doc.label} className="p-3 rounded-lg border border-slate-200">
                      <div className="text-xs font-semibold text-slate-600 mb-2">{doc.label}</div>
                      {doc.src ? (
                        <img src={doc.src} alt={doc.label} className="w-full h-40 object-cover rounded-md border border-slate-200" />
                      ) : (
                        <div className="h-40 rounded-md border-2 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                          Not uploaded
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="text-sm text-slate-600">
                    Verification Status:{' '}
                    <span className={`font-semibold ${selectedAgentView?.verificationStatus === 'VERIFIED' ? 'text-green-600' : selectedAgentView?.verificationStatus === 'REJECTED' ? 'text-red-600' : 'text-amber-600'}`}>
                      {selectedAgentView?.verificationStatus || 'PENDING'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {['PENDING', 'PENDING_VERIFICATION'].includes(String(selectedAgentView?.requestData?.status || '').toUpperCase()) ? (
                      <>
                        <button
                          onClick={() => openRejectReasonModal(selectedAgentView?.requestData || selectedAgentRecord)}
                          disabled={isSavingVerification}
                          className="px-4 py-2 text-sm font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-60"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveRequest(selectedAgentView?.requestData || selectedAgentRecord)}
                          disabled={isSavingVerification}
                          className="px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                        >
                          {isSavingVerification ? 'Saving...' : 'Approve'}
                        </button>
                      </>
                    ) : (
                      <>
                    <button
                      onClick={() => handleVerifyAgent(selectedAgentRecord, false)}
                      disabled={isSavingVerification}
                      className="px-4 py-2 text-sm font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-60"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleVerifyAgent(selectedAgentRecord, true)}
                      disabled={isSavingVerification}
                      className="px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                    >
                      {isSavingVerification ? 'Saving...' : 'Verify Agent'}
                    </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* Branch Modal */}
        {showBranchModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowBranchModal(false)}>
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Branch' : 'Add New Branch'}</h3>
                        <button onClick={() => setShowBranchModal(false)}><X className="w-5 h-5 text-slate-500" /></button>
                    </div>
                    <form onSubmit={handleBranchSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <input className="w-full p-3 border rounded-lg" placeholder="Branch Name" value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} required />
                            <select className="w-full p-3 border rounded-lg" value={newBranch.type} onChange={e => setNewBranch({...newBranch, type: e.target.value})}>
                                <option>Branch</option>
                                <option>Hub</option>
                            </select>
                        </div>
                        <textarea className="w-full p-3 border rounded-lg" rows="2" placeholder="Description" value={newBranch.description} onChange={e => setNewBranch({...newBranch, description: e.target.value})} />
                        
                        <div className="grid grid-cols-2 gap-4">
                             <input className="w-full p-3 border rounded-lg" placeholder="Area/Location" value={newBranch.location} onChange={e => setNewBranch({...newBranch, location: e.target.value})} required />
                             <input className="w-full p-3 border rounded-lg" placeholder="State/City" value={newBranch.state} onChange={e => setNewBranch({...newBranch, state: e.target.value})} required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <input className="w-full p-3 border rounded-lg" placeholder="Manager Name" value={newBranch.manager} onChange={e => setNewBranch({...newBranch, manager: e.target.value})} />
                             <input className="w-full p-3 border rounded-lg" placeholder="Staff Count" type="number" value={newBranch.staffCount} onChange={e => setNewBranch({...newBranch, staffCount: e.target.value})} />
                        </div>
                        
                        <input className="w-full p-3 border rounded-lg" placeholder="Contact Info (Phone/Email)" value={newBranch.contact} onChange={e => setNewBranch({...newBranch, contact: e.target.value})} required />

                        <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors">{isEditing ? 'Save Changes' : 'Add Branch'}</button>
                    </form>
                </div>
            </div>
        )}

        {/* Vehicle Modal */}
        {showVehicleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowVehicleModal(false)}>
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
                        <button onClick={() => setShowVehicleModal(false)}><X className="w-5 h-5 text-slate-500" /></button>
                    </div>
                    <form onSubmit={handleVehicleSubmit} className="space-y-4">
                        <div className="flex justify-center mb-4">
                             <div 
                               onClick={() => vehicleFileInputRef.current.click()}
                               className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden relative"
                             >
                                {newVehicle.photo ? (
                                    <div className="relative w-full h-full group">
                                        <img src={newVehicle.photo} alt="Vehicle" className="w-full h-full object-cover" />
                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setNewVehicle(prev => ({...prev, photo: null}));
                                            }}
                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                                            title="Remove Photo"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Camera className="w-8 h-8 text-slate-400 mb-2" />
                                        <span className="text-sm text-slate-500">Upload Vehicle Photo</span>
                                    </>
                                )}
                                <input ref={vehicleFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleVehiclePhotoUpload} />
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <input className="w-full p-3 border rounded-lg" placeholder="Vehicle Number" value={newVehicle.number} onChange={e => setNewVehicle({...newVehicle, number: e.target.value})} required />
                             <select className="w-full p-3 border rounded-lg" value={newVehicle.type} onChange={e => setNewVehicle({...newVehicle, type: e.target.value})}>
                                <option>Van</option>
                                <option>Truck</option>
                                <option>Scooter</option>
                            </select>
                        </div>
                        
                         <div className="grid grid-cols-2 gap-4">
                             <select 
                                className="w-full p-3 border rounded-lg" 
                                 value={newVehicle.driver} 
                                 onChange={e => setNewVehicle({...newVehicle, driver: e.target.value})}
                             >
                                <option value="">Assign Agent</option>
                                {agentUsers.map((agent) => {
                                    const key = agent.userId || agent.id || agent.email;
                                    const label = agent.name || agent.email || 'Unnamed Agent';
                                    return (
                                      <option key={key} value={key}>{label}</option>
                                    );
                                })}
                             </select>
                             <input className="w-full p-3 border rounded-lg" type="number" placeholder="Seats" value={newVehicle.seats} onChange={e => setNewVehicle({...newVehicle, seats: e.target.value})} />
                        </div>
                        
                        <input className="w-full p-3 border rounded-lg" placeholder="RC Book Details" value={newVehicle.rcBook} onChange={e => setNewVehicle({...newVehicle, rcBook: e.target.value})} />

                        <div className="text-xs text-slate-500">
                          Vehicle status can be changed directly from the fleet table.
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors">{isEditing ? 'Save Changes' : 'Add Vehicle'}</button>
                    </form>
                </div>
            </div>
        )}

        {/* Staff Modal */}
        {showStaffModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowStaffModal(false)}>
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900">
                            {isEditing ? 'Staff Details & Documents' : 'Add New Staff'}
                        </h3>
                        <button onClick={() => setShowStaffModal(false)}><X className="w-5 h-5 text-slate-500" /></button>
                    </div>

                    <form onSubmit={onStaffFormSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Details */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Personal Information
                                </h4>
                                <input className="w-full p-3 border rounded-lg" placeholder="Name" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} required />
                                <input className="w-full p-3 border rounded-lg" type="email" placeholder="Email" value={newStaff.email || ''} onChange={e => setNewStaff({...newStaff, email: e.target.value})} />
                                <input className="w-full p-3 border rounded-lg" placeholder="Phone" value={newStaff.phone || ''} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input className="w-full p-3 border rounded-lg" type="date" placeholder="DOB" value={newStaff.personalDetails?.dob || ''} onChange={e => setNewStaff({...newStaff, personalDetails: {...newStaff.personalDetails, dob: e.target.value}})} />
                                    <input className="w-full p-3 border rounded-lg" placeholder="Blood Group" value={newStaff.personalDetails?.bloodGroup || ''} onChange={e => setNewStaff({...newStaff, personalDetails: {...newStaff.personalDetails, bloodGroup: e.target.value}})} />
                                </div>
                                <textarea className="w-full p-3 border rounded-lg" placeholder="Address" rows="2" value={newStaff.personalDetails?.address || ''} onChange={e => setNewStaff({...newStaff, personalDetails: {...newStaff.personalDetails, address: e.target.value}})}></textarea>
                            </div>

                            {/* Job & Documents */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4" /> Job Details
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <select className="w-full p-3 border rounded-lg" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                                        <option>Customer</option>
                                        <option>Agent</option>
                                        <option>Driver</option>
                                        <option>Manager</option>
                                        <option>Sorter</option>
                                    </select>
                                    <select className="w-full p-3 border rounded-lg" value={newStaff.status} onChange={e => setNewStaff({...newStaff, status: e.target.value})}>
                                        <option>Active</option>
                                        <option>Leave</option>
                                        <option>Inactive</option>
                                    </select>
                                </div>
                                <select 
                                    className="w-full p-3 border rounded-lg" 
                                    value={newStaff.branch} 
                                    onChange={e => setNewStaff({...newStaff, branch: e.target.value})}
                                    required
                                >
                                    <option value="">Select Branch</option>
                                    {contextBranches?.map(b => (
                                        <option key={b.id} value={b.name}>{b.name}</option>
                                    ))}
                                </select>

                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Documents
                                    </h4>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Aadhaar Card', key: 'aadhaar' },
                                            { label: 'Driving License', key: 'license' },
                                            { label: 'PAN Card', key: 'pan' }
                                        ].map((doc) => {
                                            const isUploaded = newStaff.documents?.[doc.key] === 'submitted' || newStaff.documents?.[doc.key] === true;
                                            const fileName = newStaff.documents?.[`${doc.key}File`];

                                            return (
                                                <div key={doc.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${isUploaded ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-900">{doc.label}</div>
                                                            <div className="text-xs text-slate-500">{isUploaded ? fileName || 'Verified' : 'Pending Upload'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="file" 
                                                            id={`file-${doc.key}`} 
                                                            className="hidden" 
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    setNewStaff(prev => ({
                                                                        ...prev,
                                                                        documents: {
                                                                            ...prev.documents,
                                                                            [doc.key]: 'submitted',
                                                                            [`${doc.key}File`]: file.name
                                                                        }
                                                                    }));
                                                                }
                                                            }}
                                                        />
                                                        {isUploaded ? (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => {
                                                                    setNewStaff(prev => {
                                                                        const newDocs = { ...prev.documents };
                                                                        delete newDocs[doc.key];
                                                                        delete newDocs[`${doc.key}File`];
                                                                        return { ...prev, documents: newDocs };
                                                                    });
                                                                }}
                                                                className="p-2 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 text-green-600 hover:text-red-600 transition-all" 
                                                                title="Remove/Re-upload"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => document.getElementById(`file-${doc.key}`).click()}
                                                                className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-600 transition-all" 
                                                                title="Upload"
                                                            >
                                                                <Upload className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-slate-100">
                            <button type="button" onClick={() => setShowStaffModal(false)} className="flex-1 py-3 border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                            <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700">{isEditing ? 'Save Changes' : 'Add Staff'}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {view === 'overview' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Network Overview</h1>
              <p className="text-slate-600">System-wide performance and operations</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg shadow-indigo-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="opacity-80">Total Users</span>
                  <Users className="w-5 h-5 opacity-80" />
                </div>
                <div className="text-3xl font-bold">{users.length}</div>
                <div className="text-indigo-100 text-sm mt-1">{pendingRoleRequests.length} requests pending</div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-xl shadow-lg shadow-emerald-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="opacity-80">Lifetime Revenue</span>
                  <IndianRupee className="w-5 h-5 opacity-80" />
                </div>


                <div className="text-3xl font-bold">Rs {totalRevenue.toLocaleString()}</div>
                <div className="text-emerald-100 text-sm mt-1">{shipments.length} shipments | Profit @ {profitPercentage}%: Rs {Math.round(totalProfit).toLocaleString()}</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg shadow-orange-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="opacity-80">Active Branches</span>
                  <Building2 className="w-5 h-5 opacity-80" />
                </div>
                <div className="text-3xl font-bold">{activeBranchCount}</div>
                <div className="text-orange-100 text-sm mt-1">Total nodes: {contextBranches?.length || 0} | Hubs: {hubCount}</div>
              </div>

              <div className="bg-gradient-to-br from-violet-500 to-violet-600 text-white p-6 rounded-xl shadow-lg shadow-violet-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="opacity-80">Fleet Vehicles</span>
                  <Truck className="w-5 h-5 opacity-80" />
                </div>
                <div className="text-3xl font-bold">{contextVehicles?.length || 0}</div>
                <div className="text-violet-100 text-sm mt-1">
                  In transit: {transitFleetCount} | Utilization: {contextVehicles?.length ? Math.round((transitFleetCount / contextVehicles.length) * 100) : 0}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-orange-600" />
                        Shipment Status Summary
                    </h3>
                    <div className="space-y-3">
                        {shipmentStatusDistribution.length > 0 ? shipmentStatusDistribution.map((item) => (
                            <div key={item.name} className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-lg">
                                <span className="text-slate-700 font-medium">{item.name}</span>
                                <span className="text-slate-900 font-bold">{item.value}</span>
                            </div>
                        )) : (
                            <p className="text-slate-500 text-sm">No shipment records available.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        User Role Distribution
                    </h3>
                    <div className="space-y-3">
                        {userRoleDistribution.length > 0 ? userRoleDistribution.map((item) => (
                            <div key={item.name} className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-lg">
                                <span className="text-slate-700 font-medium">{item.name}</span>
                                <span className="text-slate-900 font-bold">{item.value}</span>
                            </div>
                        )) : (
                            <p className="text-slate-500 text-sm">No user records available.</p>
                        )}
                    </div>
                </div>
            </div>

            <SectionDownloader title="Download Analytics Report" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6 mb-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-600" />
                    Detailed Performance Report
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Metric</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Count/Value</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Growth</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Target</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">Total Revenue</td>
                                <td className="px-6 py-4 text-emerald-600 font-bold">&#8377;{Math.round(totalRevenue).toLocaleString()}</td>
                                <td className="px-6 py-4 text-slate-500">Live</td>
                                <td className="px-6 py-4 text-slate-600">&#8377;{Math.round(totalRevenue).toLocaleString()}</td>
                                <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Database</span></td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">Total Shipments</td>
                                <td className="px-6 py-4 font-bold">{shipments.length}</td>
                                <td className="px-6 py-4 text-slate-500">Live</td>
                                <td className="px-6 py-4 text-slate-600">{shipments.length}</td>
                                <td className="px-6 py-4"><span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold">Database</span></td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">Total Users</td>
                                <td className="px-6 py-4 font-bold">{users.length}</td>
                                <td className="px-6 py-4 text-slate-500">Live</td>
                                <td className="px-6 py-4 text-slate-600">{users.length}</td>
                                <td className="px-6 py-4"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">Database</span></td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">Delivery Success Rate</td>
                                <td className="px-6 py-4 font-bold">{shipmentKpis.deliveryRate}%</td>
                                <td className="px-6 py-4 text-slate-500">Live</td>
                                <td className="px-6 py-4 text-slate-600">100%</td>
                                <td className="px-6 py-4"><span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">Database</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </SectionDownloader>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Top Performing Branches</h2>
              <div className="space-y-3">
                                {topPerformingBranches.map((branch, index) => (
                  <div 
                    key={index} 
                    onClick={() => navigate('/admin/branches', { state: { openBranchId: branch.id } })}
                    className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 transition-transform group-hover:scale-110">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{branch.name}</div>
                                                <div className="text-sm text-slate-500">{branch._shipments} shipments</div>
                      </div>
                    </div>
                    <div className="text-right">
                                            <div className="font-bold text-slate-900">&#8377;{branch._revenue.toLocaleString()}</div>
                                            <div className="text-sm text-green-600 font-medium">+{branch._performance}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'branches' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Branch & Hub Management</h1>
                <p className="text-slate-600">Manage branch locations and hub hierarchy</p>
              </div>
              <button 
                onClick={() => openBranchModal()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add New Branch
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3">
              <input
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                placeholder="Search branch, manager, location..."
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={branchTypeFilter}
                onChange={(e) => setBranchTypeFilter(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Types</option>
                <option value="BRANCH">Branch</option>
                <option value="HUB">Hub</option>
              </select>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Total Branches</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{contextBranches?.length || 0}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Active Branches</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">{activeBranchCount}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Hubs</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1">{hubCount}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Open Shipments</div>
                <div className="text-2xl font-bold text-amber-600 mt-1">{activeShipmentsCount}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Branch Details</h3>
                <div className="text-sm text-slate-500">{filteredBranches.length} result(s)</div>
              </div>

              {visibleBranches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleBranches.map((branch) => (
                    <div key={`branch-card-${branch.id}`} className="border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{branch.name || 'Unnamed Branch'}</div>
                          <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">{branch.type || 'Branch'}</div>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {branch.status || 'Active'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
                        <span>{branch.location || '-'}, {branch.state || '-'}</span>
                      </div>
                      <div className="text-sm text-slate-600">Manager: {branch.manager || '-'}</div>
                      <div className="text-sm text-slate-600">Contact: {branch.contact || '-'}</div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openBranchModal(branch)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete('branch', branch.id, 'Delete Branch', 'Are you sure you want to delete this branch?')}
                          className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl">
                  No branches found for current filters.
                </div>
              )}

              {filteredBranches.length > 5 && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setBranchVisibleCount((prev) => (prev >= filteredBranches.length ? 5 : filteredBranches.length))}
                    className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
                  >
                    {branchVisibleCount >= filteredBranches.length ? 'Show Less' : `Show More (${filteredBranches.length - branchVisibleCount})`}
                  </button>
                </div>
              )}
            </div>
             </div>
        )}

        {view === 'pricing' && (
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Pricing Configuration</h1>
                    <p className="text-slate-600">Live backend pricing used for shipment calculation</p>
                  </div>
                  <button 
                    onClick={handlePricingEditToggle}
                    disabled={isPricingSaving}
                    className={`px-4 py-2 rounded-lg transition-colors shadow-lg flex items-center gap-2 font-bold disabled:opacity-60 ${isPricingEditing ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'}`}
                  >
                    {isPricingEditing ? (
                        <>
                            <Save className="w-4 h-4" /> {isPricingSaving ? 'Saving...' : 'Save Changes'}
                        </>
                    ) : (
                        <>
                            <Edit className="w-4 h-4" /> Edit Configuration
                        </>
                    )}
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'profitPercentage', label: 'Profit %', step: '0.1', min: 0, max: 100, suffix: '%' },
                      { key: 'standardRatePerKg', label: 'Standard Base Rate / kg', step: '1', min: 1, suffix: 'Rs' },
                      { key: 'expressMultiplier', label: 'Express Multiplier', step: '0.01', min: 1, suffix: 'x' },
                      { key: 'sameDayMultiplier', label: 'Same Day Multiplier', step: '1', min: 2, suffix: 'x', readOnly: true },
                      { key: 'distanceSurcharge', label: 'Inter-Zone Surcharge', step: '1', min: 0, suffix: 'Rs' },
                      { key: 'fuelSurchargePct', label: 'Fuel Surcharge', step: '0.1', min: 0, suffix: '%' },
                      { key: 'gstPct', label: 'GST', step: '0.1', min: 0, suffix: '%' },
                      { key: 'codHandlingFee', label: 'COD Handling Fee', step: '1', min: 0, suffix: 'Rs' }
                    ].map((item) => (
                      <div key={item.key}>
                        <label className="text-xs uppercase tracking-wider text-slate-500">{item.label}</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="number"
                            min={item.min}
                            max={item.max}
                            step={item.step}
                            value={pricingDraft[item.key]}
                            onChange={(e) => handlePricingDraftChange(item.key, e.target.value)}
                            disabled={!isPricingEditing || item.readOnly}
                            className={`w-full px-3 py-2 border rounded-lg ${
                              !isPricingEditing || item.readOnly
                                ? 'bg-slate-50 border-slate-100 text-slate-500'
                                : 'bg-white border-slate-200'
                            }`}
                          />
                          <span className="text-xs font-semibold text-slate-500 min-w-8">{item.suffix}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm border border-amber-100">
                    Same Day multiplier is locked to 2x Express as requested.
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-slate-800">Pricing Logic</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li><span className="font-medium text-slate-800">Standard:</span> Weight × Base Rate + Inter-Zone Surcharge</li>
                    <li><span className="font-medium text-slate-800">Express:</span> Standard Total × Express Multiplier</li>
                    <li><span className="font-medium text-slate-800">Same Day:</span> Express Total × 2</li>
                    <li><span className="font-medium text-slate-800">Final Total:</span> Base Price + (Base Price × Fuel Surcharge %) + (Base Price × GST %) + COD Fee</li>
                    <li>All totals are rounded to whole rupees.</li>
                  </ul>
                </div>
             </div>
        )}
        
        {view === 'fleet' && (
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Fleet Management</h1>
                    <p className="text-slate-600">Vehicle tracking and driver assignment</p>
                  </div>
                  <button 
                     onClick={() => openVehicleModal()}
                     className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Vehicle
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3">
                    <input
                      value={fleetSearch}
                      onChange={(e) => setFleetSearch(e.target.value)}
                      placeholder="Search vehicle number, driver, type..."
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                      value={fleetStatusFilter}
                      onChange={(e) => setFleetStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ALL">All Status</option>
                      <option value="AVAILABLE">Available</option>
                      <option value="IN_TRANSIT">In Transit</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="OFFLINE">Offline</option>
                    </select>
                </div>
                
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                       <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-200">
                             <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle Details</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                                                         {visibleFleet.map((vehicle, index) => {
                                                             const resolvedDriverName =
                                                               vehicle?.driverName ||
                                                               userNameById[vehicle?.driverUserId] ||
                                                               (typeof vehicle?.driver === 'string' && vehicle.driver.trim() ? vehicle.driver : '');
                                                             const driverName = resolvedDriverName || 'N/A';
                                                             return (
                               <tr key={index} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 font-medium text-slate-900">
                                      <div className="flex items-center gap-3">
                                          {vehicle.photo && <img src={vehicle.photo} alt="Car" className="w-10 h-10 rounded object-cover border border-slate-200" />}
                                          <div>
                                              <div>{vehicle.number || vehicle.vehicleNumber || vehicle.id}</div>
                                              <div className="text-xs text-slate-500 max-w-[160px] truncate">{vehicle.rcBook || 'No RC details'}</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-slate-600">{vehicle.type}</td>
                                  <td className="px-6 py-4">
                                                 {driverName !== 'N/A' ? (
                                        <div className="flex items-center gap-2">
                                           <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                              {driverName.charAt(0)}
                                           </div>
                                                          <span className="text-slate-900">{driverName}</span>
                                        </div>
                                     ) : (
                                         <button 
                                             onClick={() => openVehicleModal(vehicle)}
                                             className="text-xs text-indigo-600 font-medium hover:underline"
                                         >
                                             Assign Driver
                                         </button>
                                     )}
                                  </td>
                                  <td className="px-6 py-4">
                                     <select
                                       value={vehicle.status || 'Available'}
                                       onChange={async (e) => {
                                          const nextStatus = e.target.value;
                                          try {
                                            await updateVehicleStatus(vehicle.id || vehicle.vehicleId, nextStatus);
                                            toast.success('Fleet status updated');
                                          } catch (error) {
                                            toast.error(error.message || 'Failed to update fleet status');
                                          }
                                       }}
                                       className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white"
                                     >
                                       <option value="Available">Available</option>
                                       <option value="In Transit">In Transit</option>
                                       <option value="Maintenance">Maintenance</option>
                                       <option value="Offline">Offline</option>
                                     </select>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     <div className="inline-flex items-center gap-3">
                                       <button onClick={() => openVehicleModal(vehicle)} className="text-indigo-600 hover:text-indigo-900 transition-colors flex items-center gap-1 justify-end ml-auto">
                                          <Edit className="w-4 h-4" /> Edit
                                       </button>
                                       <button
                                         onClick={() => confirmDelete('vehicle', vehicle.id || vehicle.vehicleId, 'Delete Vehicle', 'Are you sure you want to delete this vehicle?')}
                                         className="text-red-500 hover:text-red-700 transition-colors"
                                       >
                                         <Trash2 className="w-4 h-4" />
                                       </button>
                                     </div>
                                  </td>
                                                              </tr>
                                                          )})}
                                                         {filteredVehicles.length === 0 && (
                                                            <tr>
                                                              <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No vehicles match current filters.</td>
                                                            </tr>
                                                         )}
                          </tbody>
                       </table>
                    </div>
                 </div>
                 {filteredVehicles.length > 5 && (
                   <div className="flex justify-center">
                     <button
                       type="button"
                       onClick={() => setFleetVisibleCount((prev) => (prev >= filteredVehicles.length ? 5 : filteredVehicles.length))}
                       className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
                     >
                       {fleetVisibleCount >= filteredVehicles.length ? 'Show Less' : `Show More (${filteredVehicles.length - fleetVisibleCount})`}
                     </button>
                   </div>
                 )}

                 <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="text-xs uppercase text-slate-500 font-semibold">Total Fleet</div>
                      <div className="text-2xl font-bold text-slate-900 mt-1">{contextVehicles?.length || 0}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="text-xs uppercase text-slate-500 font-semibold">Available</div>
                      <div className="text-2xl font-bold text-emerald-600 mt-1">{availableFleetCount}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="text-xs uppercase text-slate-500 font-semibold">In Transit</div>
                      <div className="text-2xl font-bold text-indigo-600 mt-1">{transitFleetCount}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="text-xs uppercase text-slate-500 font-semibold">Utilization</div>
                      <div className="text-2xl font-bold text-amber-600 mt-1">
                        {contextVehicles?.length ? Math.round(((transitFleetCount) / contextVehicles.length) * 100) : 0}%
                      </div>
                    </div>
                 </div>
             </div>
        )}

        {view === 'staff' && (
             <div className="space-y-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                   <h1 className="text-2xl font-bold text-slate-800">Staff Directory</h1>
                   <p className="text-slate-600">Manage employee access and roles</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {lastDataSyncAt && <span className="text-xs text-slate-500">Synced: {new Date(lastDataSyncAt).toLocaleTimeString()}</span>}
                                        <button
                                            onClick={handleRefresh}
                                            disabled={isRefreshing}
                                            className="px-3 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-70"
                                        >
                                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                                        </button>
                                    </div>
                </div>

                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                                        <h3 className="font-bold text-slate-900">Pending Agent Role Requests</h3>
                                    </div>
                                    <div className="p-4">
                                        {pendingRoleRequests.length === 0 ? (
                                            <p className="text-sm text-slate-500">No pending requests.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {visiblePendingRequests.map((request) => {
                                                  const requestDocs = request?.documents || {};
                                                  const requestDocFlags = request?.documentFlags || {};
                                                  const uploadedDocCount = ['profilePhoto', 'aadharCopy', 'licenseCopy', 'rcBookCopy']
                                                    .filter((key) => Boolean(requestDocs[key] || requestDocFlags[key])).length;
                                                  return (
                                                    <div key={request.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                        <div>
                                                            <button
                                                              type="button"
                                                              onClick={() => openAgentDetails(request)}
                                                              className="font-semibold text-slate-900 hover:text-indigo-700 underline underline-offset-2 text-left"
                                                            >
                                                              {request.name} ({request.email})
                                                            </button>
                                                            <div className="text-sm text-slate-600">Requested: <span className="font-medium uppercase">{request.requestedRole}</span></div>
                                                            {request.reason && <div className="text-sm text-slate-500 mt-1">Reason: {request.reason}</div>}
                                                            <div className="text-xs text-slate-500 mt-2 space-y-1">
                                                              <div>License: {request?.agentDetails?.licenseNumber || 'N/A'}</div>
                                                              <div>Aadhaar: {request?.agentDetails?.aadharNumber || 'N/A'}</div>
                                                              <div>Vehicle: {request?.agentDetails?.vehicleNumber || 'N/A'}</div>
                                                              <div>Documents: {uploadedDocCount}/4 uploaded</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() => handleApproveRequest(request)}
                                                                className="px-3 py-1.5 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => openRejectReasonModal(request)}
                                                                className="px-3 py-1.5 text-sm font-bold bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </div>
                                                  );
                                                })}
                                                {pendingRoleRequests.length > 5 && (
                                                  <div className="flex justify-center pt-2">
                                                    <button
                                                      type="button"
                                                      onClick={() => setPendingVisibleCount((prev) => (prev >= pendingRoleRequests.length ? 5 : pendingRoleRequests.length))}
                                                      className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
                                                    >
                                                      {pendingVisibleCount >= pendingRoleRequests.length ? 'Show Less' : `Show More (${pendingRoleRequests.length - pendingVisibleCount})`}
                                                    </button>
                                                  </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                                        <h3 className="font-bold text-slate-900">All User Access Control</h3>
                                    </div>
                                    <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center gap-3">
                                      <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                                        <button
                                          type="button"
                                          onClick={() => setStaffAudienceFilter('staff')}
                                          className={`px-4 py-2 text-sm font-semibold ${staffAudienceFilter === 'staff' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                                        >
                                          Staff / Agents
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setStaffAudienceFilter('customer')}
                                          className={`px-4 py-2 text-sm font-semibold border-l border-slate-200 ${staffAudienceFilter === 'customer' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                                        >
                                          Customers
                                        </button>
                                      </div>
                                      <input
                                        value={staffSearch}
                                        onChange={(e) => setStaffSearch(e.target.value)}
                                        placeholder="Search user by name / email / id..."
                                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      />
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Role</th>
                                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Update Role</th>
                                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {visibleUsers.map(user => {
                                                    const isAdmin = String(user.role || '').toLowerCase() === 'admin';
                                                    const roleValue = roleDrafts[user.email] || user.role || 'customer';

                                                    return (
                                                        <tr key={user.email} className="hover:bg-slate-50">
                                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                                {String(user.role || '').toLowerCase() === 'agent' ? (
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => openAgentDetails(user)}
                                                                    className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                                                                  >
                                                                    {user.name || 'N/A'}
                                                                  </button>
                                                                ) : (user.name || 'N/A')}
                                                            </td>
                                                            <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                                                    {(user.role || 'customer').toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {isAdmin ? (
                                                                    <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded">LOCKED</span>
                                                                ) : (
                                                                    <select
                                                                        value={roleValue}
                                                                        onChange={(e) => setRoleDrafts(prev => ({ ...prev, [user.email]: e.target.value }))}
                                                                        className="w-36 p-2 border border-slate-200 rounded-lg text-sm"
                                                                    >
                                                                        <option value="customer">Customer</option>
                                                                        <option value="agent">Agent</option>
                                                                    </select>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="inline-flex gap-2">
                                                                    <button
                                                                        onClick={() => handleUpdateUserRole(user)}
                                                                        disabled={isAdmin}
                                                                        className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                                                                    >
                                                                        Save Role
                                                                    </button>
                                                                    {!isAdmin && (
                                                                        <button
                                                                            onClick={() => handleRemoveUserAccess(user)}
                                                                            className="px-3 py-1.5 text-xs font-bold bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                                                        >
                                                                            Remove Access
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {filteredUsers.length === 0 && (
                                                  <tr>
                                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                                      No users found for selected filter.
                                                    </td>
                                                  </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    {filteredUsers.length > 5 && (
                                      <div className="p-4 border-t border-slate-100 flex justify-center">
                                        <button
                                          type="button"
                                          onClick={() => setUserVisibleCount((prev) => (prev >= filteredUsers.length ? 5 : filteredUsers.length))}
                                          className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
                                        >
                                          {userVisibleCount >= filteredUsers.length ? 'Show Less' : `Show More (${filteredUsers.length - userVisibleCount})`}
                                        </button>
                                      </div>
                                    )}
                                </div>
                {staffAudienceFilter === 'staff' && (
                  <>
                    <button 
                        onClick={() => openStaffModal()}
                        className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2 float-right relative -top-16"
                    >
                        <Plus className="w-4 h-4" />
                        Add Staff
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 clear-both">
                   {visibleStaffCards.map(s => (
                      <div key={s.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                         <div className="flex gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">{(typeof s?.name === 'string' && s.name.length > 0 ? s.name.charAt(0) : 'U')}</div>
                            <div>
                               <div className="font-bold text-slate-900">{s.name}</div>
                               <div className="text-sm text-slate-500">{s.role}</div>
                               <div className="text-xs text-indigo-600 mt-1">{s.branch}</div>
                            </div>
                         </div>
                         <div className="flex flex-col gap-2">
                            <button
                              onClick={() => openAgentDetails(s)}
                              className="text-slate-700 hover:text-slate-900 flex items-center gap-1 text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" /> View
                            </button>
                            <button onClick={() => openStaffModal(s)} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm font-medium">
                                <Edit className="w-4 h-4" /> Edit
                            </button>
                            <button onClick={() => confirmDelete('staff', s.id, 'Delete Staff', 'Are you sure you want to delete this staff member?')} className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm font-medium">
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                         </div>
                      </div>
                   ))}
                    </div>
                    {filteredStaffCards.length > 5 && (
                      <div className="flex justify-center mt-4">
                        <button
                          type="button"
                          onClick={() => setStaffVisibleCount((prev) => (prev >= filteredStaffCards.length ? 5 : filteredStaffCards.length))}
                          className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
                        >
                          {staffVisibleCount >= filteredStaffCards.length ? 'Show Less' : `Show More (${filteredStaffCards.length - staffVisibleCount})`}
                        </button>
                      </div>
                    )}
                  </>
                )}
             </div>
        )}

                {view === 'shipments' && (
             <div className="space-y-6">
                 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Shipment Management</h1>
                        <p className="text-slate-600">Manage all shipments: delete, assign/reassign agents, and monitor live totals</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleRefresh}
                          disabled={isRefreshing}
                          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-60"
                        >
                          {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                        <button
                          type="button"
                          onClick={requestDeleteAllManagedShipments}
                          disabled={isDeletingAllShipments || shipments.length === 0}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                        >
                          {isDeletingAllShipments ? 'Deleting...' : `Delete All (${shipments.length})`}
                        </button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-xs uppercase tracking-wider text-slate-500">Total Shipments</div>
                      <div className="text-2xl font-bold text-slate-900 mt-2">{adminShipmentMetrics.total}</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-xs uppercase tracking-wider text-slate-500">Delivered</div>
                      <div className="text-2xl font-bold text-emerald-600 mt-2">{adminShipmentMetrics.delivered}</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-xs uppercase tracking-wider text-slate-500">Assigned</div>
                      <div className="text-2xl font-bold text-indigo-600 mt-2">{adminShipmentMetrics.assigned}</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-xs uppercase tracking-wider text-slate-500">Unassigned</div>
                      <div className="text-2xl font-bold text-amber-600 mt-2">{adminShipmentMetrics.unassigned}</div>
                    </div>
                 </div>

                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-3">
                    <input
                      value={shipmentSearch}
                      onChange={(e) => setShipmentSearch(e.target.value)}
                      placeholder="Search by tracking id, city, customer, agent..."
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                      value={shipmentStatusFilter}
                      onChange={(e) => setShipmentStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {allShipmentStatusOptions.map((status) => (
                        <option key={`shipment-status-${status}`} value={status}>
                          {status === 'ALL' ? 'All Statuses' : formatShipmentStatus(status)}
                        </option>
                      ))}
                    </select>
                 </div>

                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tracking</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Route</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assign / Change Agent</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visibleManagedShipments.length > 0 ? visibleManagedShipments.map((shipment) => {
                            const shipmentId = getShipmentIdentifier(shipment);
                            const shipmentStatusKey = normalizeShipmentStatus(shipment.status);
                            const isLockedShipment = shipmentStatusKey === 'DELIVERED' || shipmentStatusKey === 'CANCELLED';
                            const assignedAgentId = String(shipment.assignedAgentId || shipment.assignedToAgentId || '').trim();
                            const selectedAgentId = String(shipmentAgentDrafts[shipmentId] ?? assignedAgentId).trim();
                            const assignActionKey = `assign:${shipmentId}`;
                            const isAssigning = Boolean(shipmentActionState[assignActionKey]);
                            const hasAssignedOption = assignedAgentId && agentUsers.some((agent) => (
                              [agent.userId, agent.id, agent.email]
                                .filter(Boolean)
                                .map((value) => String(value).trim().toLowerCase())
                                .includes(assignedAgentId.toLowerCase())
                            ));
                            const receiver = shipment.receiver || shipment.receiverAddress || {};
                            const sender = shipment.sender || shipment.senderAddress || {};
                            return (
                              <tr key={`admin-shipment-${shipmentId}`} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-mono text-slate-700">{shipmentId}</td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-slate-900">{sender.name || shipment.customerName || shipment.customerEmail || 'N/A'}</div>
                                  <div className="text-xs text-slate-500">{sender.phone || shipment.customerEmail || '-'}</div>
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {sender.city || 'N/A'} to {receiver.city || 'N/A'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                                    {formatShipmentStatus(shipment.status || 'Unknown')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-900">
                                  Rs {Math.round(Number(shipment.cost) || 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <select
                                      value={selectedAgentId}
                                      onChange={(e) => setShipmentAgentDrafts((prev) => ({ ...prev, [shipmentId]: e.target.value }))}
                                      disabled={isLockedShipment}
                                      className="min-w-[180px] px-2 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                      <option value="">Select agent</option>
                                      {hasAssignedOption ? null : (assignedAgentId ? (
                                        <option value={assignedAgentId}>
                                          {userNameById[assignedAgentId] || assignedAgentId}
                                        </option>
                                      ) : null)}
                                      {agentUsers.map((agent) => {
                                        const agentKey = agent.userId || agent.id || agent.email;
                                        const agentLabel = agent.name || agent.email || 'Unnamed Agent';
                                        return (
                                          <option key={`manage-agent-${agentKey}`} value={agentKey}>
                                            {agentLabel}
                                          </option>
                                        );
                                      })}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleAssignManagedShipment(shipment)}
                                      disabled={!selectedAgentId || isAssigning || isLockedShipment}
                                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                                    >
                                      {isLockedShipment ? 'Locked' : (isAssigning ? 'Saving...' : (assignedAgentId ? 'Change' : 'Assign'))}
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteManagedShipment(shipment)}
                                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          }) : (
                            <tr>
                              <td className="px-4 py-8 text-center text-slate-500" colSpan="7">
                                No shipments found for current filters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                 </div>

                 {filteredManagedShipments.length > shipmentVisibleCount && (
                   <div className="flex justify-center">
                     <button
                       type="button"
                       onClick={() => setShipmentVisibleCount((prev) => (prev >= filteredManagedShipments.length ? 10 : filteredManagedShipments.length))}
                       className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
                     >
                       {shipmentVisibleCount >= filteredManagedShipments.length ? 'Show Less' : `Show More (${filteredManagedShipments.length - shipmentVisibleCount})`}
                     </button>
                   </div>
                 )}
             </div>
        )}

                {view === 'performance' && (
             <div className="space-y-6">
                 <div>
                    <h1 className="text-2xl font-bold text-slate-800">Performance Analytics & Reports</h1>
                    <p className="text-slate-600">Live operational analysis based on current shipment data</p>
                 </div>

                 <SectionDownloader title="Download Full Report" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                             <FileText className="w-5 h-5 text-indigo-600" />
                             Master Shipment Report
                        </h3>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100">
                        <div>
                             <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider mb-4">Service Type Breakdown</h4>
                             <table className="w-full text-sm text-left">
                                 <thead className="bg-slate-50 text-slate-500">
                                     <tr>
                                         <th className="px-3 py-2">Service</th>
                                         <th className="px-3 py-2">Shipments</th>
                                         <th className="px-3 py-2">Volume %</th>
                                         <th className="px-3 py-2">Revenue %</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                     {serviceTypeBreakdown.length > 0 ? serviceTypeBreakdown.map((row) => (
                                       <tr key={`service-${row.service}`}>
                                         <td className="px-3 py-2 font-medium text-slate-900">{row.service}</td>
                                         <td className="px-3 py-2">{row.count}</td>
                                         <td className="px-3 py-2 text-slate-600">{row.volumeShare}%</td>
                                         <td className="px-3 py-2 text-slate-600">{row.revenueShare}%</td>
                                       </tr>
                                     )) : (
                                       <tr>
                                         <td className="px-3 py-4 text-slate-500" colSpan="4">No shipments available.</td>
                                       </tr>
                                     )}
                                 </tbody>
                             </table>
                        </div>
                        <div>
                             <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider mb-4">City Delivery Distribution</h4>
                             <table className="w-full text-sm text-left">
                               <thead className="bg-slate-50 text-slate-500">
                                 <tr>
                                   <th className="px-3 py-2">City</th>
                                   <th className="px-3 py-2">Volume</th>
                                   <th className="px-3 py-2">Delivered</th>
                                   <th className="px-3 py-2">Revenue</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100">
                                 {cityPerformance.slice(0, 6).length > 0 ? cityPerformance.slice(0, 6).map((row) => (
                                   <tr key={`city-${row.city}`}>
                                     <td className="px-3 py-2 font-medium text-slate-900">{row.city}</td>
                                     <td className="px-3 py-2">{row.volume}</td>
                                     <td className="px-3 py-2">{row.delivered}</td>
                                     <td className="px-3 py-2 text-slate-600">Rs {Math.round(row.revenue).toLocaleString()}</td>
                                   </tr>
                                 )) : (
                                   <tr>
                                     <td className="px-3 py-4 text-slate-500" colSpan="4">No city-level shipment data yet.</td>
                                   </tr>
                                 )}
                               </tbody>
                             </table>
                        </div>
                    </div>

                    <div className="p-6">
                        <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider mb-4">Recent Shipment Activity</h4>
                        <table className="w-full text-left text-sm">
                             <thead>
                                 <tr className="text-slate-500 border-b border-slate-200">
                                     <th className="pb-3">Tracking</th>
                                     <th className="pb-3">Date</th>
                                     <th className="pb-3">Receiver</th>
                                     <th className="pb-3">Amount</th>
                                     <th className="pb-3">Status</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                 {recentShipmentTransactions.length > 0 ? recentShipmentTransactions.map((shipment) => (
                                   <tr key={`recent-${shipment.id}`}>
                                     <td className="py-3 font-mono text-slate-600">{shipment.trackingNumber || shipment.trackingId || shipment.id}</td>
                                     <td className="py-3 text-slate-600">{shipment.deliveryDate || shipment.date || 'N/A'}</td>
                                     <td className="py-3 font-medium text-slate-900">{shipment.receiver?.name || shipment.customerName || 'N/A'}</td>
                                     <td className="py-3 text-slate-900 font-bold">Rs {Math.round(Number(shipment.cost) || 0).toLocaleString()}</td>
                                     <td className="py-3 text-slate-700 font-medium">{shipment.status || 'Unknown'}</td>
                                   </tr>
                                 )) : (
                                   <tr>
                                     <td className="py-4 text-slate-500" colSpan="5">No shipment activity available.</td>
                                   </tr>
                                 )}
                             </tbody>
                        </table>
                    </div>
                 </SectionDownloader>
             </div>
        )}

                {view === 'reports' && (
             <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Reports & Downloads</h1>
                        <p className="text-slate-600">Live project achievements and operational summaries</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleDownloadShipmentCsv}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download Shipment CSV
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-sm text-slate-500">Total Shipments</div>
                        <div className="text-3xl font-bold text-slate-900 mt-2">{shipments.length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-sm text-slate-500">Delivered Shipments</div>
                        <div className="text-3xl font-bold text-emerald-600 mt-2">{shipmentKpis.delivered}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-sm text-slate-500">Total Revenue</div>
                        <div className="text-3xl font-bold text-indigo-600 mt-2">Rs {Math.round(Number(totalRevenue)).toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-sm text-slate-500">Projected Profit ({profitPercentage}%)</div>
                        <div className="text-3xl font-bold text-emerald-600 mt-2">Rs {Math.round((Number(totalRevenue) * profitPercentage) / 100).toLocaleString()}</div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                   <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                     <div className="text-xs uppercase tracking-wider text-slate-500">Delivery Rate</div>
                     <div className="text-2xl font-bold text-emerald-600 mt-2">{shipmentKpis.deliveryRate}%</div>
                   </div>
                   <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                     <div className="text-xs uppercase tracking-wider text-slate-500">Active Agents</div>
                     <div className="text-2xl font-bold text-slate-900 mt-2">{activeAgentCount}</div>
                   </div>
                   <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                     <div className="text-xs uppercase tracking-wider text-slate-500">COD Delivered</div>
                     <div className="text-2xl font-bold text-amber-600 mt-2">Rs {Math.round(shipmentKpis.codDelivered).toLocaleString()}</div>
                   </div>
                   <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                     <div className="text-xs uppercase tracking-wider text-slate-500">Top Branch/Hub</div>
                     <div className="text-lg font-bold text-slate-900 mt-2">{topPerformingBranches[0]?.name || 'N/A'}</div>
                     <div className="text-xs text-slate-500 mt-1">{topPerformingBranches[0]?._shipments || 0} shipments</div>
                   </div>
                 </div>

                 <SectionDownloader title="Download Printable Report" className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Project Achievement Summary</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Status Performance</h4>
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-200">
                              <th className="py-2">Status</th>
                              <th className="py-2">Count</th>
                              <th className="py-2">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {statusPerformanceRows.length > 0 ? statusPerformanceRows.map((row) => (
                              <tr key={`status-${row.status}`}>
                                <td className="py-2 font-medium text-slate-900">{row.status}</td>
                                <td className="py-2">{row.count}</td>
                                <td className="py-2 text-slate-600">Rs {Math.round(row.revenue).toLocaleString()}</td>
                              </tr>
                            )) : (
                              <tr>
                                <td className="py-3 text-slate-500" colSpan="3">No status data available.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Top Delivery Cities</h4>
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-200">
                              <th className="py-2">City</th>
                              <th className="py-2">Volume</th>
                              <th className="py-2">Delivered</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {cityPerformance.slice(0, 6).length > 0 ? cityPerformance.slice(0, 6).map((row) => (
                              <tr key={`city-report-${row.city}`}>
                                <td className="py-2 font-medium text-slate-900">{row.city}</td>
                                <td className="py-2">{row.volume}</td>
                                <td className="py-2">{row.delivered}</td>
                              </tr>
                            )) : (
                              <tr>
                                <td className="py-3 text-slate-500" colSpan="3">No city records available.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                 </SectionDownloader>
             </div>
        )}

        {view === 'tickets' && (
             <AdminTicketsPanel />
        )}

        {view === 'runsheets' && (
             <AdminRunSheetView 
                 shipments={shipments}
                 contextBranches={contextBranches}
                 contextStaff={contextStaff}
                 users={users}
                 agentProfiles={agentProfiles}
                 onRefresh={handleRefresh}
             />
        )}
      </div>
  );
}


function AdminRunSheetView({ shipments = [], contextBranches = [], contextStaff, users = [], agentProfiles = {}, onRefresh }) {
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [generatedSheet, setGeneratedSheet] = useState(null);
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleQueueCount, setVisibleQueueCount] = useState(5);
    const [recentlyAssignedIds, setRecentlyAssignedIds] = useState([]);
    const [liveProfileIndex, setLiveProfileIndex] = useState({});

    const normalizeStatus = (value) => String(value || '').toUpperCase().replace(/_/g, ' ').trim();
    const normalizeAvailability = (value) => String(value || '').toUpperCase().replace(/ /g, '_').trim();
    const isLoggedInSession = (value) => ['online', 'logged_in', 'logged-in'].includes(String(value || '').toLowerCase());
    const isOnlineAvailability = (value) => ['AVAILABLE', 'ACTIVE', 'READY', 'IN_TRANSIT'].includes(normalizeAvailability(value));
    const isPendingStatus = (status) => ['BOOKED', 'RECEIVED AT HUB'].includes(normalizeStatus(status));
    const isInProgressStatus = (status) => ['IN TRANSIT', 'OUT FOR DELIVERY'].includes(normalizeStatus(status));
    const isSuccessStatus = (status) => normalizeStatus(status) === 'DELIVERED';
    const isFailedStatus = (status) => ['FAILED', 'FAILED ATTEMPT', 'CANCELLED'].includes(normalizeStatus(status));
    const getShipmentIdentifier = (shipment = {}) => shipment.trackingNumber || shipment.trackingId || shipment.id;
    const normalizeIdentity = (value) => String(value || '').trim().toLowerCase();
    const getAgentIdentityCandidates = (agent = {}) => (
      [...new Set([
        agent.assignmentAgentId,
        agent.userKey,
        agent.runtimeAgentId,
        agent.userId,
        agent.id,
        agent.email
      ].map((value) => String(value || '').trim()).filter(Boolean))]
    );

    useEffect(() => {
      let cancelled = false;
      const indexProfiles = (profiles = []) => {
        const next = {};
        (profiles || []).forEach((profile = {}) => {
          [profile.userId, profile.email, profile.agentId, profile.id]
            .map((value) => String(value || '').trim())
            .filter(Boolean)
            .forEach((key) => {
              next[key] = profile;
              next[key.toLowerCase()] = profile;
            });
        });
        return next;
      };
      const loadLiveProfiles = async () => {
        try {
          const profiles = await operationsService.getAgents();
          if (cancelled) return;
          setLiveProfileIndex(indexProfiles(profiles));
        } catch {
          if (cancelled) return;
          setLiveProfileIndex({});
        }
      };
      loadLiveProfiles();
      const intervalId = setInterval(loadLiveProfiles, 60000);
      return () => {
        cancelled = true;
        clearInterval(intervalId);
      };
    }, []);

    const mappedAgents = useMemo(() => {
        const byKey = new Map();
        const sourceAgents = [
          ...(users || []),
          ...((contextStaff || []).filter((entry) => String(entry?.role || '').trim().toLowerCase() === 'agent'))
        ];
        sourceAgents
          .filter((user) => String(user?.role || '').trim().toLowerCase() === 'agent')
          .forEach((user) => {
            const key = user.userId || user.id || user.email;
            if (!key || byKey.has(key)) return;
            byKey.set(key, {
              id: user.id || user.userId || user.email,
              userId: user.userId || user.id || user.email,
              email: user.email,
              name: user.name || user.email || 'Unnamed Agent',
              branch: user.branch || '',
              status: user.status || 'active',
              sessionStatus: String(user.sessionStatus || ''),
              role: 'agent'
            });
          });
        return Array.from(byKey.values())
          .map((staff) => {
            const userKey = String(staff.userId || staff.id || staff.email || '').trim();
            const lookupKeys = [
              userKey,
              staff.userId,
              staff.id,
              staff.email
            ].map((value) => String(value || '').trim()).filter(Boolean);
            const profile = lookupKeys
              .map((key) => {
                const lowerKey = key.toLowerCase();
                return agentProfiles[key] || agentProfiles[lowerKey] || liveProfileIndex[key] || liveProfileIndex[lowerKey];
              })
              .find(Boolean) || null;
            const availabilityStatus = String(profile?.availabilityStatus || 'OFFLINE').toUpperCase();
            const normalizedUserStatus = String(staff.status || '').toLowerCase();
            return {
              ...staff,
              userKey,
              assignmentAgentId: userKey || 'AGENT-' + Math.random().toString(36).substr(2, 9),
              runtimeAgentId: profile?.agentId || userKey,
              identityCandidates: getAgentIdentityCandidates({
                assignmentAgentId: userKey,
                userKey,
                runtimeAgentId: profile?.agentId || userKey,
                userId: staff.userId,
                id: staff.id,
                email: staff.email
              }),
              verificationStatus: String(profile?.verificationStatus || '').toUpperCase() || 'PENDING',
              availabilityStatus,
              isLoggedIn: isOnlineAvailability(availabilityStatus)
            };
          })
          .filter((staff) => Boolean(staff.assignmentAgentId) && String(staff.assignmentAgentId).trim().length > 0);
    }, [users, contextStaff, agentProfiles, liveProfileIndex]);

    const selectableAgents = useMemo(() => (
      mappedAgents.filter((agent) => Boolean(String(agent.assignmentAgentId || '').trim()))
    ), [mappedAgents]);

    const dropdownAgents = useMemo(() => (
      [...selectableAgents].sort((a, b) => String(a.name || a.email || '').localeCompare(String(b.name || b.email || '')))
    ), [selectableAgents]);
    const agentNameByAssignmentId = useMemo(() => {
      const map = {};
      mappedAgents.forEach((agent) => {
        const name = agent.name || agent.email || 'Agent';
        getAgentIdentityCandidates(agent).forEach((key) => {
          map[key] = name;
          map[normalizeIdentity(key)] = name;
        });
      });
      return map;
    }, [mappedAgents]);

    const getAssignedAgentName = (assignedId) => {
      const raw = String(assignedId || '').trim();
      if (!raw) return 'Awaiting assignment';
      return agentNameByAssignmentId[raw] || agentNameByAssignmentId[normalizeIdentity(raw)] || 'Assigned Agent';
    };

    const shipmentMetrics = useMemo(() => {
        const total = shipments.length;
        const successful = shipments.filter((s) => isSuccessStatus(s.status)).length;
        const failed = shipments.filter((s) => isFailedStatus(s.status)).length;
        const inProgress = shipments.filter((s) => isInProgressStatus(s.status)).length;
        return { total, successful, failed, inProgress };
    }, [shipments]);

    const filteredShipments = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return shipments.filter((shipment) => {
            const status = normalizeStatus(shipment.status);
            if (statusFilter === 'PENDING' && !isPendingStatus(status)) return false;
            if (statusFilter === 'IN_PROGRESS' && !isInProgressStatus(status)) return false;
            if (statusFilter === 'SUCCESS' && !isSuccessStatus(status)) return false;
            if (statusFilter === 'FAILED' && !isFailedStatus(status)) return false;

            if (!query) return true;
            const receiver = shipment.receiver || shipment.receiverAddress || {};
            return [
                shipment.id,
                shipment.trackingId,
                shipment.trackingNumber,
                shipment.type,
                shipment.status,
                receiver.name,
                receiver.city
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [shipments, searchTerm, statusFilter]);

    const assignableShipments = useMemo(
        () => filteredShipments.filter((s) => {
          const shipmentId = getShipmentIdentifier(s);
          return isPendingStatus(s.status) && !s.assignedAgentId && !s.assignedToAgentId && !recentlyAssignedIds.includes(shipmentId);
        }),
        [filteredShipments, recentlyAssignedIds]
    );
    const assignedPendingShipments = useMemo(
      () => filteredShipments.filter((s) => isPendingStatus(s.status) && (s.assignedAgentId || s.assignedToAgentId)),
      [filteredShipments]
    );
    const defaultHubId = useMemo(() => {
      const hub = (contextBranches || []).find((b) => String(b.type || '').toLowerCase() === 'hub');
      return hub?.id || hub?.hubId || 'HUB-DEFAULT';
    }, [contextBranches]);

    const visibleAssignableShipments = useMemo(
      () => assignableShipments.slice(0, visibleQueueCount),
      [assignableShipments, visibleQueueCount]
    );

    useEffect(() => {
      setVisibleQueueCount(5);
    }, [searchTerm, statusFilter]);

    useEffect(() => {
      const validIds = new Set(assignableShipments.map((shipment) => getShipmentIdentifier(shipment)));
      setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
    }, [assignableShipments]);

    useEffect(() => {
      const activeIds = new Set(
        (shipments || [])
          .filter((shipment) => !shipment.assignedAgentId && !shipment.assignedToAgentId)
          .map((shipment) => getShipmentIdentifier(shipment))
      );
      setRecentlyAssignedIds((prev) => prev.filter((id) => activeIds.has(id)));
    }, [shipments]);

    const toggleSelection = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    useEffect(() => {
      const assignableIds = new Set(selectableAgents.map((agent) => agent.assignmentAgentId).filter(Boolean));
      if (!assignableIds.has(selectedAgentId)) {
        setSelectedAgentId('');
      }
    }, [selectedAgentId, selectableAgents]);

    const handleAssign = async () => {
        if (selectedIds.length === 0) return toast.error('Select shipments to assign');
        if (!selectedAgentId) return toast.error('Please select an agent to assign the run sheet.');

        const selectedShipments = assignableShipments.filter((s) => selectedIds.includes(getShipmentIdentifier(s)));
        if (selectedShipments.length === 0) return toast.error('No pending shipments selected');

        const selectedAgent = selectableAgents.find((agent) => (
          getAgentIdentityCandidates(agent).some((identity) => normalizeIdentity(identity) === normalizeIdentity(selectedAgentId))
        ));
        if (!selectedAgent) {
          setSelectedAgentId('');
          return toast.error('Selected agent is not available. Please choose another agent.');
        }
        const targetAgentId = selectedAgent.assignmentAgentId;
        const agentName = selectedAgent?.name || selectedAgent?.email || 'Selected Agent';
        const trackingIds = selectedShipments.map((s) => getShipmentIdentifier(s));

        try {
            const response = await operationsService.createRunSheet({
                agentId: targetAgentId,
                hubId: defaultHubId,
                shipmentTrackingNumbers: trackingIds
            });

            const sheet = {
                id: response?.runSheetId || `RS-${Date.now()}`,
                date: response?.date ? new Date(response.date).toLocaleDateString() : new Date().toLocaleDateString(),
                items: selectedShipments,
                agent: agentName
            };
            setGeneratedSheet(sheet);
            setSelectedIds([]);
            setRecentlyAssignedIds((prev) => [...new Set([...prev, ...trackingIds])]);
            toast.success(`Run Sheet ${sheet.id} generated`);
            await onRefresh?.();
        } catch (error) {
            const fallbackAssignments = await Promise.allSettled(
              trackingIds.map(async (trackingId) => {
                const assignmentIds = getAgentIdentityCandidates(selectedAgent);
                for (const agentId of assignmentIds) {
                  try {
                    await shipmentService.assignShipment(trackingId, agentId);
                    return trackingId;
                  } catch {
                    // try next identifier
                  }
                }
                throw new Error(`Failed to assign ${trackingId}`);
              })
            );
            const successfulTrackingIds = fallbackAssignments
              .filter((result) => result.status === 'fulfilled')
              .map((result) => result.value);
            const sheet = {
                id: `RS-${Date.now()}`,
                date: new Date().toLocaleDateString(),
                items: selectedShipments,
                agent: agentName
            };
            setGeneratedSheet(sheet);
            setSelectedIds([]);
            if (successfulTrackingIds.length > 0) {
              setRecentlyAssignedIds((prev) => [...new Set([...prev, ...successfulTrackingIds])]);
              toast.warning(`Run sheet synced partially (${successfulTrackingIds.length}/${trackingIds.length})`);
            } else {
              toast.warning(`Run sheet saved locally (${error.message || 'backend unavailable'})`);
            }
            await onRefresh?.();
        }
    };

    return (
         <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Admin Run Sheet Master</h1>
                <p className="text-slate-600">Global shipment orchestration with live assignment controls</p>
                <p className="text-xs text-slate-500 mt-1">
                  Agents in list: {dropdownAgents.length}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:gap-4 items-stretch md:items-center">
                  {generatedSheet && (
                      <SectionDownloader 
                        title="Download Sheet"
                        className="inline-block"
                      >
                           <div className="p-4 sm:p-8 bg-white" id="run-sheet-content">
                               <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6 border-b pb-4">
                                   <div>
                                       <h1 className="text-2xl font-bold text-slate-900">Delivery Run Sheet</h1>
                                       <p className="text-slate-500">ID: {generatedSheet.id}</p>
                                   </div>
                                   <div className="text-left sm:text-right">
                                       <p className="font-bold">{generatedSheet.date}</p>
                                       <p className="text-sm text-slate-500">Agent: {generatedSheet.agent}</p>
                                       <p className="text-sm text-slate-500">Items: {generatedSheet.items.length}</p>
                                   </div>
                               </div>
                               <div className="overflow-x-auto">
                               <table className="w-full min-w-[720px] text-left text-sm border-collapse">
                                   <thead>
                                       <tr className="bg-slate-100">
                                           <th className="p-3 border text-slate-700">Tracking ID</th>
                                           <th className="p-3 border text-slate-700">Receiver / Address</th>
                                           <th className="p-3 border text-slate-700">Type</th>
                                           <th className="p-3 border text-slate-700">COD Amount</th>
                                           <th className="p-3 border text-slate-700">Signature</th>
                                       </tr>
                                   </thead>
                                   <tbody>
                                       {generatedSheet.items.map((s) => {
                                           const shipmentId = getShipmentIdentifier(s);
                                           const receiverDetails = s.receiver || s.receiverAddress || {};
                                           return (
                                           <tr key={`gen-${shipmentId}`}>
                                               <td className="p-3 border font-mono">{shipmentId}</td>
                                               <td className="p-3 border">
                                                   <div className="font-bold">{receiverDetails.name || 'N/A'}</div>
                                                   <div className="text-slate-500">{receiverDetails.address || ''}, {receiverDetails.city || ''}</div>
                                               </td>
                                               <td className="p-3 border">{s.type}</td>
                                               <td className="p-3 border font-mono">{s.paymentMode === 'Cash' || s.paymentMode === 'COD' ? `Rs ${s.cost}` : '-'}</td>
                                               <td className="p-3 border"></td>
                                           </tr>
                                       );})}
                                   </tbody>
                               </table>
                               </div>
                               <div className="mt-8 pt-4 border-t flex flex-col gap-2 sm:flex-row sm:justify-between text-sm text-slate-500">
                                   <div>Master Admin Log</div>
                                   <div>Authorized Signature _________________</div>
                               </div>
                           </div>
                      </SectionDownloader>
                  )}

                  <select 
                      className="w-full md:w-auto px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                  >
                      <option value="">Select Agent</option>
                      {dropdownAgents.length === 0 && (
                        <option value="" disabled>No agents found</option>
                      )}
                      {dropdownAgents.map((agent) => (
                          <option key={`opt-${agent.assignmentAgentId}`} value={agent.assignmentAgentId}>
                              {agent.name || agent.email}
                          </option>
                      ))}
                   </select>

                  <button 
                    onClick={handleAssign}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2 h-10"
                  >
                    <FileText className="w-4 h-4" />
                    Assign ({selectedIds.length})
                  </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Total Shipments</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{shipmentMetrics.total}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Successful</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">{shipmentMetrics.successful}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">In Progress</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1">{shipmentMetrics.inProgress}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Failed</div>
                <div className="text-2xl font-bold text-red-600 mt-1">{shipmentMetrics.failed}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Ready To Assign</div>
                <div className="text-2xl font-bold text-amber-600 mt-1">{assignableShipments.length}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by tracking ID, city, receiver..."
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="SUCCESS">Successful</option>
                <option value="FAILED">Failed</option>
                <option value="ALL">All</option>
              </select>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                  <span className="font-semibold text-slate-700">Shipment Assignment Queue</span>
                  <span className="text-sm bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">{assignableShipments.length} pending</span>
               </div>
               <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                        {assignableShipments.length > 0 ? visibleAssignableShipments.map((s) => {
                            const shipmentId = getShipmentIdentifier(s);
                            const receiverDetails = s.receiver || s.receiverAddress || {};
                            return (
                            <div key={`pend-${shipmentId}`} className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 cursor-pointer" onClick={() => toggleSelection(shipmentId)}>
                        <div className="relative flex items-center justify-center p-2 self-start sm:self-auto">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                                checked={selectedIds.includes(shipmentId)}
                                onChange={() => {}} 
                            />
                        </div>
                        <div className="flex-1 w-full">
                           <div className="font-medium text-slate-900">{shipmentId}</div>
                           <div className="text-sm text-slate-500">{receiverDetails.city || 'N/A'} - <span className="text-indigo-600 font-medium">{s.type}</span></div>
                           <div className="text-xs text-slate-500 mt-1">Status: {s.status}</div>
                        </div>
                        <div className="text-left sm:text-right text-sm w-full sm:w-auto">
                           <div className="font-medium text-slate-900">COD: Rs {s.cost}</div>
                           <div className="text-slate-500">{s.weight} kg</div>
                        </div>
                     </div>
                        );}) : (
                      <div className="p-8 text-center text-slate-500">No pending shipments for selected filter.</div>
                  )}
               </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <span className="font-semibold text-slate-700">Pending Shipments With Assigned Agent</span>
                <span className="text-sm bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">{assignedPendingShipments.length} assigned</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                {assignedPendingShipments.length > 0 ? assignedPendingShipments.map((shipment) => {
                  const shipmentId = getShipmentIdentifier(shipment);
                  const receiverDetails = shipment.receiver || shipment.receiverAddress || {};
                  const assignedId = shipment.assignedAgentId || shipment.assignedToAgentId;
                  const assignedName = getAssignedAgentName(assignedId);
                  return (
                    <div key={`assigned-${shipmentId}`} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50">
                      <div>
                        <div className="font-medium text-slate-900">{shipmentId}</div>
                        <div className="text-xs text-slate-500 mt-1">{receiverDetails.city || 'N/A'} | {shipment.status}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-indigo-700">{assignedName}</div>
                        <div className="text-xs text-slate-500">Assigned Agent</div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-6 text-center text-slate-500 text-sm">No pending shipments with assigned agents.</div>
                )}
              </div>
            </div>
            {assignableShipments.length > 5 && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleQueueCount((prev) => (prev >= assignableShipments.length ? 5 : assignableShipments.length))}
                  className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
                >
                  {visibleQueueCount >= assignableShipments.length ? 'Show Less' : `Show More (${assignableShipments.length - visibleQueueCount})`}
                </button>
              </div>
            )}
         </div>
    );
}

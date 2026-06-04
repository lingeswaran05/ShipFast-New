import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { LayoutDashboard, Package, Scan, FileText, CheckCircle, MapPin, Phone, Truck, Clock, AlertTriangle, ChevronRight, Filter, Search, Calendar, User, Printer, Download, History, CreditCard, Camera, Upload, Send, MessageSquare } from 'lucide-react';
import { useShipment } from '../../context/ShipmentContext';
import { toast } from 'sonner';
import { SectionDownloader } from '../shared/SectionDownloader';
import { operationsService } from '../../lib/operationsService';
import { shipmentService } from '../../lib/shipmentService';
import { BarcodeGenerator } from '../shared/BarcodeGenerator';
import { printElementById } from '../../lib/printUtils';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';

const normalizeStatus = (value) => String(value || '').toUpperCase().replace(/_/g, ' ');
const isCodPayment = (shipment) => ['cash', 'cod'].includes(String(shipment?.paymentMode || shipment?.paymentMethod || '').toLowerCase());
const isCodPaymentSettled = (shipment) => {
  const paymentStatus = String(shipment?.paymentStatus || '').toUpperCase();
  return paymentStatus === 'SUCCESS' || paymentStatus === 'PAID' || paymentStatus === 'COMPLETED';
};
const STATUS_SEQUENCE = ['BOOKED', 'IN TRANSIT', 'OUT FOR DELIVERY', 'DELIVERED'];
const AGENT_AVAILABILITY = ['AVAILABLE', 'ACTIVE', 'READY', 'IN_TRANSIT', 'OFFLINE'];
const normalizeAvailability = (value) => String(value || '').toUpperCase().replace(/ /g, '_');
const isAvailableForAssignment = (value) => ['AVAILABLE', 'ACTIVE', 'READY'].includes(normalizeAvailability(value));
const SCAN_STATUS_TRANSITIONS = {
  BOOKED: ['In Transit', 'Failed'],
  'IN TRANSIT': ['Out for Delivery', 'Failed'],
  'OUT FOR DELIVERY': ['Delivered', 'Failed'],
  FAILED: ['Out for Delivery']
};
const TERMINAL_SCAN_STATUSES = new Set(['DELIVERED', 'CANCELLED']);
const SCAN_BARCODE_FORMATS = ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'];
const AGENT_SCAN_TARGET_KEY = 'sf_agent_scan_target';
const toIdentityValue = (value) => String(value || '').trim().toLowerCase();

const toCanonicalStatus = (value) => {
    const normalized = normalizeStatus(value).replace(/\s+/g, ' ').trim();
    if (normalized === 'FAILED ATTEMPT') return 'FAILED';
    return normalized;
};

const isNoBarcodeFoundError = (error) => {
    const name = String(error?.name || '');
    const message = String(error?.message || '');
    return (
        name.includes('NotFound') ||
        message.includes('No MultiFormat Readers were able to detect the code')
    );
};

const isForwardStatusChange = (current, next) => {
    const currentStatus = toCanonicalStatus(current);
    const nextStatus = toCanonicalStatus(next);

    if (!nextStatus) return false;
    if (!currentStatus) return true;

    if (nextStatus === 'FAILED') {
        return currentStatus !== 'DELIVERED' && currentStatus !== 'FAILED';
    }

    const currentIndex = STATUS_SEQUENCE.indexOf(currentStatus);
    const nextIndex = STATUS_SEQUENCE.indexOf(nextStatus);
    if (currentIndex === -1 || nextIndex === -1) return true;
    return nextIndex > currentIndex;
};

const getPartyDetails = (shipment, type) => {
    const primary = type === 'sender' ? shipment?.sender : shipment?.receiver;
    const fallback = type === 'sender' ? shipment?.senderAddress : shipment?.receiverAddress;
    const details = primary || fallback || {};

    return {
        name: details.name || details.fullName || 'N/A',
        city: details.city || 'N/A',
        address: details.address || details.addressLine || '',
        phone: details.phone || 'N/A'
    };
};

const getNextScanStatusOptions = (currentStatus) => {
  const normalized = normalizeStatus(currentStatus).replace(/\s+/g, ' ').trim();
  return SCAN_STATUS_TRANSITIONS[normalized] || [];
};

const getShipmentScanIdentifiers = (shipment) => (
  [shipment?.shipmentId, shipment?.id, shipment?.trackingId, shipment?.trackingNumber]
    .filter(Boolean)
    .map((value) => String(value || '').trim().toUpperCase())
);

export function AgentDashboard({ view }) {
    const {
      shipments,
      users,
      updateShipmentStatus,
      currentUser,
      refreshShipments,
      lastDataSyncAt,
      getRoleNotifications,
      notifyAdminFromAgent,
      getSupportTickets,
      replySupportTicket
    } = useShipment();
  const navigate = useNavigate();
  const [scanId, setScanId] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanStatusMode, setScanStatusMode] = useState('');
  const [scanEntryMode, setScanEntryMode] = useState('manual');
  const [showBarcodeCamera, setShowBarcodeCamera] = useState(false);
  const [isBarcodeDecoding, setIsBarcodeDecoding] = useState(false);
  const [podImage, setPodImage] = useState('');
  const [showPodCamera, setShowPodCamera] = useState(false);
  const [activeTab, setActiveTab] = useState('deliveries'); 
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCity, setFilterCity] = useState('');
  const [stableOverviewShipments, setStableOverviewShipments] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [adminMessage, setAdminMessage] = useState('');
    const [isSendingAdminMessage, setIsSendingAdminMessage] = useState(false);
    const [supportTickets, setSupportTickets] = useState([]);
    const [selectedSupportTicketId, setSelectedSupportTicketId] = useState(null);
    const [isSupportLoading, setIsSupportLoading] = useState(false);
    const [availabilityStatus, setAvailabilityStatus] = useState('AVAILABLE');
    const agentNotifications = getRoleNotifications('agent');
    const podFileInputRef = useRef(null);
    const podWebcamRef = useRef(null);
    const barcodeFileInputRef = useRef(null);
    const barcodeWebcamRef = useRef(null);
    const autoReassigningRef = useRef(new Set());
    const autoScanTimerRef = useRef(null);

    const onboardingStorageKey = `sf_agent_onboarding_${currentUser?.email || currentUser?.id || currentUser?.userId || 'default'}`;
    const legacyOnboardingStorageKey = `agent_onboarding_${currentUser?.email || currentUser?.id || currentUser?.userId || 'default'}`;
    const [agentOnboarding, setAgentOnboarding] = useState({
        agentId: '',
        licenseNumber: '',
        vehicleNumber: '',
        rcBookNumber: '',
        bloodType: '',
        organDonor: false,
        verifiedAt: null,
        profilePhoto: null,
        aadharCopy: null,
        licenseCopy: null,
        rcBookCopy: null
    });
    const [isAgentProfileLoading, setIsAgentProfileLoading] = useState(true);
  
  // Shift Timer Logic
  const [shiftDuration, setShiftDuration] = useState('00:00');
  useEffect(() => {
    const agentKey = currentUser?.userId || currentUser?.id || currentUser?.email || 'default';
    const todayKey = new Date().toISOString().slice(0, 10);
    const storageKey = `sf_agent_shift_start_${agentKey}_${todayKey}`;
    let startIso = localStorage.getItem(storageKey);
    if (!startIso) {
      startIso = new Date().toISOString();
      localStorage.setItem(storageKey, startIso);
    }
    const startTime = new Date(startIso);

    const updateShiftDuration = () => {
      const now = new Date();
      const diff = Math.max(now.getTime() - startTime.getTime(), 0);
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setShiftDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    };

    updateShiftDuration();
    const timer = setInterval(updateShiftDuration, 60000);
    return () => clearInterval(timer);
  }, [currentUser?.userId, currentUser?.id, currentUser?.email]);

    useEffect(() => {
        if (currentUser?.role !== 'agent') return;

        const loadOnboarding = async () => {
            setIsAgentProfileLoading(true);
            let localDocs = {};
            const cached = localStorage.getItem(onboardingStorageKey) || localStorage.getItem(legacyOnboardingStorageKey);
            if (cached) {
                try {
                    localDocs = JSON.parse(cached) || {};
                } catch {
                    localDocs = {};
                }
            }

            const userId = currentUser?.userId || currentUser?.id || currentUser?.email;
            try {
                const profile = await operationsService.getAgentProfile(userId);
                if (profile) {
                    const normalizedAvailability = normalizeAvailability(profile.availabilityStatus || 'AVAILABLE');
                    setAvailabilityStatus(AGENT_AVAILABILITY.includes(normalizedAvailability) ? normalizedAvailability : 'AVAILABLE');
                    setAgentOnboarding(prev => ({
                        ...prev,
                        agentId: profile.agentId || prev.agentId || '',
                        licenseNumber: profile.licenseNumber || '',
                        vehicleNumber: profile.vehicleNumber || '',
                        rcBookNumber: profile.rcBookNumber || '',
                        bloodType: profile.bloodType || '',
                        organDonor: Boolean(profile.organDonor),
                        verifiedAt: profile.updatedAt || profile.joinDate || new Date().toISOString(),
                        profilePhoto: profile.profileImage || localDocs.profilePhoto || prev.profilePhoto,
                        aadharCopy: localDocs.aadharCopy || prev.aadharCopy,
                        licenseCopy: localDocs.licenseCopy || prev.licenseCopy,
                        rcBookCopy: localDocs.rcBookCopy || prev.rcBookCopy
                    }));
                    setIsAgentProfileLoading(false);
                    return;
                }
            } catch {
                // non-blocking fallback to local cache
            }

            if (Object.keys(localDocs).length > 0) {
                setAgentOnboarding(prev => ({ ...prev, ...localDocs }));
            }
            setIsAgentProfileLoading(false);
        };

        loadOnboarding();
    }, [currentUser?.role, currentUser?.userId, currentUser?.id, currentUser?.email, onboardingStorageKey, legacyOnboardingStorageKey]);

    useEffect(() => {
      if (view !== 'scan') return;
      const pendingScanId = localStorage.getItem(AGENT_SCAN_TARGET_KEY);
      if (pendingScanId) {
        setScanId(pendingScanId);
        localStorage.removeItem(AGENT_SCAN_TARGET_KEY);
      }
    }, [view]);

    const agentIdentifiers = useMemo(() => {
      return [
        agentOnboarding.agentId,
        currentUser?.userId,
        currentUser?.id,
        currentUser?.email
      ].filter(Boolean);
    }, [agentOnboarding.agentId, currentUser?.userId, currentUser?.id, currentUser?.email]);

    const agentIdentitySet = useMemo(() => {
      return new Set(agentIdentifiers.map(toIdentityValue));
    }, [agentIdentifiers]);

    const isAgentShipment = useCallback((shipment) => {
      const candidates = [
        shipment?.assignedAgentId,
        shipment?.assignedToAgentId,
        shipment?.deliveredByAgentId,
        shipment?.agentId
      ].map(toIdentityValue).filter(Boolean);
      if (candidates.length === 0) return false;
      return candidates.some((candidate) => agentIdentitySet.has(candidate));
    }, [agentIdentitySet]);

    const agentShipments = useMemo(() => {
      return (shipments || []).filter((shipment) => isAgentShipment(shipment));
    }, [shipments, isAgentShipment]);

    const isBarcodeSupported = useMemo(() => typeof window !== 'undefined', []);

    const matchedScanShipment = useMemo(() => {
      const normalizedScan = String(scanId || '').trim().toUpperCase();
      if (!normalizedScan) return null;
      return agentShipments.find((shipment) => getShipmentScanIdentifiers(shipment).includes(normalizedScan)) || null;
    }, [scanId, agentShipments]);

    const nextScanStatusOptions = useMemo(() => (
      matchedScanShipment ? getNextScanStatusOptions(matchedScanShipment.status) : []
    ), [matchedScanShipment]);

    useEffect(() => {
      if (!matchedScanShipment) {
        setScanStatusMode('');
        return;
      }
      if (nextScanStatusOptions.length === 0) {
        setScanStatusMode('');
        return;
      }
      const hasCurrentSelection = nextScanStatusOptions.some(
        (option) => normalizeStatus(option) === normalizeStatus(scanStatusMode)
      );
      if (!hasCurrentSelection) {
        setScanStatusMode(nextScanStatusOptions[0]);
      }
    }, [matchedScanShipment, nextScanStatusOptions, scanStatusMode]);

    const selectedSupportTicket = useMemo(
      () => supportTickets.find((ticket) => ticket.id === selectedSupportTicketId) || null,
      [supportTickets, selectedSupportTicketId]
    );

    const computeAgentPerformance = useCallback((source = agentShipments) => {
      const deliveredCount = source.filter((s) => normalizeStatus(s.status) === 'DELIVERED').length;
      const failedCount = source.filter((s) => ['FAILED', 'FAILED ATTEMPT', 'CANCELLED'].includes(normalizeStatus(s.status))).length;
      const inTransitCount = source.filter((s) => ['IN TRANSIT', 'OUT FOR DELIVERY'].includes(normalizeStatus(s.status))).length;
      return { deliveredCount, failedCount, inTransitCount };
    }, [agentShipments]);

    const persistAgentProfileSnapshot = useCallback(async (override = {}) => {
      const userId = currentUser?.userId || currentUser?.id || currentUser?.email;
      if (!userId) return;
      const metrics = computeAgentPerformance();
      await operationsService.upsertAgentProfile(userId, {
        licenseNumber: agentOnboarding.licenseNumber,
        vehicleNumber: agentOnboarding.vehicleNumber,
        rcBookNumber: agentOnboarding.rcBookNumber,
        bloodType: agentOnboarding.bloodType,
        organDonor: Boolean(agentOnboarding.organDonor),
        profileImage: agentOnboarding.profilePhoto,
        availabilityStatus: override.availabilityStatus || availabilityStatus,
        deliveredCount: override.deliveredCount ?? metrics.deliveredCount,
        failedCount: override.failedCount ?? metrics.failedCount,
        inTransitCount: override.inTransitCount ?? metrics.inTransitCount
      });
    }, [
      currentUser?.userId,
      currentUser?.id,
      currentUser?.email,
      computeAgentPerformance,
      agentOnboarding.licenseNumber,
      agentOnboarding.vehicleNumber,
      agentOnboarding.rcBookNumber,
      agentOnboarding.bloodType,
      agentOnboarding.organDonor,
      agentOnboarding.profilePhoto,
      availabilityStatus
    ]);

    // Derived state for stats
    const stats = useMemo(() => {
       return {
           toDeliver: agentShipments.filter(s => ['IN TRANSIT', 'OUT FOR DELIVERY', 'BOOKED'].includes(normalizeStatus(s.status))).length,
           completed: agentShipments.filter(s => ['DELIVERED', 'CANCELLED', 'FAILED'].includes(normalizeStatus(s.status))).length,
           cashCollected: agentShipments
              .filter((s) => normalizeStatus(s.status) === 'DELIVERED' && isCodPayment(s) && !isCodPaymentSettled(s))
              .reduce((acc, s) => acc + (parseFloat(s.cost) || 0), 0)
       };
    }, [agentShipments]);

    // Dynamic Shipment List based on Tab & Filters
    const shipmentList = useMemo(() => {
      let list = [];
      const normalize = (s) => s?.toUpperCase().replace(/_/g, ' ') || '';
      const includesTerm = (value, term) => String(value || '').toLowerCase().includes(term);

      if (activeTab === 'deliveries') {
          list = agentShipments.filter((s) => normalize(s.status) === 'BOOKED');
      } else if (activeTab === 'pickups') {
          list = agentShipments.filter((s) => ['IN TRANSIT', 'OUT FOR DELIVERY'].includes(normalize(s.status)));
      } else if (activeTab === 'history') {
          list = agentShipments.filter((s) => ['DELIVERED', 'CANCELLED', 'FAILED', 'FAILED ATTEMPT'].includes(normalize(s.status)));
      }

      if (filterStatus !== 'All') {
          list = list.filter(s => normalize(s.status) === normalize(filterStatus));
      }

      if (filterCity) {
          const term = filterCity.toLowerCase();
          list = list.filter(s => {
              if (activeTab === 'pickups') {
                  return (
                    includesTerm(s.receiver?.city, term) ||
                    includesTerm(s.receiverAddress?.city, term) ||
                    includesTerm(s.destination, term)
                  );
              }
              if (activeTab === 'deliveries') {
                  return (
                    includesTerm(s.sender?.city, term) ||
                    includesTerm(s.senderAddress?.city, term) ||
                    includesTerm(s.origin, term)
                  );
              }
              return (
                includesTerm(s.sender?.city, term) ||
                includesTerm(s.senderAddress?.city, term) ||
                includesTerm(s.origin, term) ||
                includesTerm(s.receiver?.city, term) ||
                includesTerm(s.receiverAddress?.city, term) ||
                includesTerm(s.destination, term)
              );
          });
      }
      return list;
    }, [agentShipments, activeTab, filterStatus, filterCity]);

    useEffect(() => {
      if (shipmentList.length > 0) {
        setStableOverviewShipments(shipmentList);
        return;
      }

      if (!isRefreshing) {
        setStableOverviewShipments([]);
      }
    }, [shipmentList, isRefreshing]);

    const overviewShipmentList = shipmentList.length > 0
      ? shipmentList
      : (isRefreshing ? stableOverviewShipments : shipmentList);

  const handleQuickStatusUpdate = async (id, newStatus) => {
      if (normalizeStatus(newStatus) === 'DELIVERED') {
          toast.info('Use Scan Parcels with Delivered status to upload proof of delivery.');
          return;
      }
      const shipment = agentShipments.find((item) => item.id === id || item.trackingId === id || item.trackingNumber === id);
      if (shipment && !isForwardStatusChange(shipment.status, newStatus)) {
          toast.error(`Status can only move forward. Current: ${shipment.status}`);
          return;
      }
      try {
          await updateShipmentStatus(id, newStatus, 'Agent Update');
          const normalizedNext = normalizeStatus(newStatus);
          const updatedSnapshot = agentShipments.map((item) => (
            item.id === id || item.trackingId === id || item.trackingNumber === id
              ? { ...item, status: newStatus }
              : item
          ));
          const metrics = computeAgentPerformance(updatedSnapshot);
          const nextAvailability =
            normalizedNext === 'IN TRANSIT' || normalizedNext === 'OUT FOR DELIVERY' || metrics.inTransitCount > 0
              ? 'IN_TRANSIT'
              : 'AVAILABLE';
          setAvailabilityStatus(nextAvailability);
          try {
            await persistAgentProfileSnapshot({
              availabilityStatus: nextAvailability,
              deliveredCount: metrics.deliveredCount,
              failedCount: metrics.failedCount,
              inTransitCount: metrics.inTransitCount
            });
          } catch {
            // non-blocking
          }
          toast.success(`Shipment updated to ${newStatus}`);
      } catch (error) {
          toast.error(error.message || 'Failed to update shipment');
      }
  };

  const getShipmentIdentifier = useCallback((shipment) => shipment?.trackingNumber || shipment?.trackingId || shipment?.id, []);

  const pickAvailableAgentForReassign = useCallback(async () => {
      const currentIdentitySet = new Set(
        [currentUser?.userId, currentUser?.id, currentUser?.email]
          .map(toIdentityValue)
          .filter(Boolean)
      );
      const blockedNames = new Set(['kyle reese', 'kyle rease', 'kyle resse']);
      const candidates = (users || [])
        .filter((user) => String(user?.role || '').toLowerCase() === 'agent')
        .filter((user) => !blockedNames.has(String(user?.name || '').trim().toLowerCase()))
        .map((user) => ({
          assignmentAgentId: String(user?.userId || user?.email || '').trim(),
          userId: user?.userId || user?.id || user?.email,
          identityCandidates: [...new Set([user?.userId, user?.id, user?.email].map((value) => String(value || '').trim()).filter(Boolean))],
          name: user?.name || user?.email || 'Agent',
          status: String(user?.status || 'active').toLowerCase(),
          availabilityHint: normalizeAvailability(user?.availabilityStatus || user?.status || '')
        }))
        .filter((agent) => {
          if (!agent.assignmentAgentId) return false;
          const agentIdentitySet = new Set(agent.identityCandidates.map(toIdentityValue).filter(Boolean));
          if ([...agentIdentitySet].some((identity) => currentIdentitySet.has(identity))) return false;
          return agent.status !== 'inactive';
        });

      if (candidates.length === 0) return null;

      const profiles = await Promise.allSettled(
        candidates.map(async (agent) => {
          let profile = null;
          for (const identity of agent.identityCandidates) {
            profile = await operationsService.getAgentProfile(identity);
            if (profile) break;
          }
          const runtimeAgentId = String(profile?.agentId || '').trim();
          const assignmentIds = [...new Set([
            agent.assignmentAgentId,
            runtimeAgentId,
            ...agent.identityCandidates
          ].filter(Boolean))];
          return { ...agent, profile, runtimeAgentId, assignmentIds };
        })
      );

      const available = profiles
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)
        .filter((agent) => {
          const profileAvailability = normalizeAvailability(agent.profile?.availabilityStatus || '');
          const hintAvailability = normalizeAvailability(agent.availabilityHint || '');
          if (isAvailableForAssignment(profileAvailability)) return true;
          if (!profileAvailability && isAvailableForAssignment(hintAvailability)) return true;
          return false;
        });

      return available[0] || null;
  }, [users, currentUser?.userId, currentUser?.id, currentUser?.email]);

  const reassignShipmentToAnotherAgent = useCallback(async (shipment, reason = 'Reassigned by agent', options = {}) => {
      if (!shipment) return false;
      const shipmentId = getShipmentIdentifier(shipment);
      if (!shipmentId) return false;

      if (autoReassigningRef.current.has(shipmentId)) return false;
      autoReassigningRef.current.add(shipmentId);

      try {
        const nextAgent = await pickAvailableAgentForReassign();
        if (!nextAgent?.assignmentAgentId) {
          // If no agent is available, push the parcel back to admin runsheet queue for manual assignment.
          try {
            await shipmentService.assignShipment(shipmentId, null);
          } catch {
            // best effort: continue even if backend does not support explicit unassign
          }
          await updateShipmentStatus(shipmentId, 'Booked', {
            remarks: `${reason} | waiting for admin manual assignment`,
            reassignedByAgentId: currentUser?.userId || currentUser?.id || currentUser?.email,
            reassignedToAgentId: null,
            assignedAgentId: null
          });
          await refreshShipments();
          if (!options.silent) {
            toast.info('No available agent. Shipment returned to admin runsheet queue');
            navigate('/agent/scan');
          }
          return true;
        }
        const targetAgentId = nextAgent.assignmentAgentId;

        try {
          await operationsService.createRunSheet({
            agentId: targetAgentId,
            hubId: 'HUB-DEFAULT',
            shipmentTrackingNumbers: [shipmentId]
          });
        } catch (createError) {
          let assigned = false;
          const fallbackIds = [...new Set([targetAgentId, ...(nextAgent.assignmentIds || [])].filter(Boolean))];
          for (const agentId of fallbackIds) {
            try {
              await shipmentService.assignShipment(shipmentId, agentId);
              assigned = true;
              break;
            } catch {
              // try next fallback id
            }
          }
          if (!assigned) throw createError;
        }

        await updateShipmentStatus(shipmentId, 'Booked', {
          remarks: reason,
          reassignedByAgentId: currentUser?.userId || currentUser?.id || currentUser?.email,
          reassignedToAgentId: targetAgentId,
          assignedAgentId: targetAgentId
        });
        await refreshShipments();
        if (!options.silent) {
          toast.success(`Shipment sent to ${nextAgent.name}`);
          navigate('/agent/scan');
        }
        return true;
      } catch (error) {
        if (!options.silent) toast.error(error.message || 'Failed to send shipment to another agent');
        return false;
      } finally {
        autoReassigningRef.current.delete(shipmentId);
      }
  }, [
      getShipmentIdentifier,
      pickAvailableAgentForReassign,
      updateShipmentStatus,
      currentUser?.userId,
      currentUser?.id,
      currentUser?.email,
      refreshShipments,
      navigate
  ]);

  useEffect(() => {
      if (currentUser?.role !== 'agent') return;
      const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
      const processStaleShipments = async () => {
          const now = Date.now();
          const staleBooked = (agentShipments || []).filter((shipment) => {
            if (normalizeStatus(shipment.status) !== 'BOOKED') return false;
            const bookedEvent = [...(shipment.history || [])]
              .reverse()
              .find((entry) => normalizeStatus(entry.status) === 'BOOKED' && entry.timestamp);
            const reference = bookedEvent?.timestamp || shipment.updatedAt || shipment.createdAt || shipment.date;
            if (!reference) return false;
            const age = now - new Date(reference).getTime();
            return Number.isFinite(age) && age >= FIVE_HOURS_MS;
          });

          for (const shipment of staleBooked) {
            await reassignShipmentToAnotherAgent(shipment, 'Auto reassigned after 5 hours without pickup', { silent: true });
          }
      };
      const timer = setInterval(processStaleShipments, 60000);

      return () => clearInterval(timer);
  }, [agentShipments, currentUser?.role, reassignShipmentToAnotherAgent]);
  
  const handlePodFile = async (file) => {
    if (!file) return;
    try {
      const base64 = await convertFileToBase64(file);
      setPodImage(base64);
    } catch {
      toast.error('Failed to read proof image');
    }
  };

  const capturePodImage = useCallback(() => {
    const imageSrc = podWebcamRef.current?.getScreenshot?.();
    if (!imageSrc) {
      toast.error('Unable to capture image');
      return;
    }
    setPodImage(imageSrc);
    setShowPodCamera(false);
  }, []);

  const decodeBarcodeValueFromSource = useCallback(async (source) => {
    if (!isBarcodeSupported) {
      throw new Error('Barcode scan is not supported on this browser. Use manual entry.');
    }

    // Try BarcodeDetector API first if available (works better with data URLs)
    if (typeof window.BarcodeDetector !== 'undefined' && typeof createImageBitmap === 'function') {
      try {
        const detector = new window.BarcodeDetector({ formats: SCAN_BARCODE_FORMATS });
        const blob = typeof source === 'string' ? await (await fetch(source)).blob() : source;
        const bitmap = await createImageBitmap(blob);
        try {
          const barcodes = await detector.detect(bitmap);
          const value = String(barcodes?.[0]?.rawValue || '').trim();
          if (value) return value;
        } finally {
          if (typeof bitmap.close === 'function') {
            bitmap.close();
          }
        }
      } catch (error) {
        console.warn('BarcodeDetector failed:', error);
        // Fall through to ZXing
      }
    }

    // Fallback to ZXing library
    const reader = new BrowserMultiFormatReader();
    let objectUrl = '';
    try {
      let imageUrl = source;
      
      // If source is a data URL string from webcam screenshot, use it directly
      if (typeof source === 'string' && source.startsWith('data:')) {
        imageUrl = source;
      } else if (typeof source === 'string') {
        // If it's a URL, try to fetch and convert to object URL
        imageUrl = source;
      } else {
        // If it's a blob/file, create object URL
        imageUrl = URL.createObjectURL(source);
        objectUrl = imageUrl;
      }
      
      try {
        const result = await reader.decodeFromImageUrl(imageUrl);
        const value = String(result?.getText?.() || result?.text || '').trim();
        if (value) return value;
      } catch (error) {
        console.warn('ZXing decodeFromImageUrl failed:', error);
        
        // If it's a data URL, try converting to blob and decoding
        if (imageUrl.startsWith('data:')) {
          try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const tempUrl = URL.createObjectURL(blob);
            try {
              const result = await reader.decodeFromImageUrl(tempUrl);
              const value = String(result?.getText?.() || result?.text || '').trim();
              if (value) return value;
            } finally {
              URL.revokeObjectURL(tempUrl);
            }
          } catch (e) {
            console.warn('Failed to decode data URL as blob:', e);
          }
        }
        if (!isNoBarcodeFoundError(error)) throw error;
      }
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
    return '';
  }, [isBarcodeSupported]);

  const handleBarcodeFile = async (file) => {
    if (!file) return;
    setIsBarcodeDecoding(true);
    try {
      const decodedValue = await decodeBarcodeValueFromSource(file);
      if (!decodedValue) {
        throw new Error('No barcode detected in uploaded image');
      }
      setScanId(decodedValue);
      setScanEntryMode('manual');
      toast.success(`Barcode detected: ${decodedValue}`);
    } catch (error) {
      toast.error(error.message || 'Unable to read barcode');
    } finally {
      setIsBarcodeDecoding(false);
    }
  };

  const captureBarcodeFromCamera = useCallback(async () => {
    const imageSrc = barcodeWebcamRef.current?.getScreenshot?.();
    if (!imageSrc) {
      toast.error('Unable to capture barcode image');
      return;
    }

    setIsBarcodeDecoding(true);
    try {
      const decodedValue = await decodeBarcodeValueFromSource(imageSrc);
      if (!decodedValue) {
        throw new Error('No barcode detected. Keep barcode inside frame and retry.');
      }
      setScanId(decodedValue);
      setScanEntryMode('manual');
      setShowBarcodeCamera(false);
      toast.success(`Barcode detected: ${decodedValue}`);
    } catch (error) {
      toast.error(error.message || 'Unable to read barcode');
    } finally {
      setIsBarcodeDecoding(false);
    }
  }, [decodeBarcodeValueFromSource]);

  useEffect(() => {
    if (!showBarcodeCamera) {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
      return;
    }

    autoScanTimerRef.current = setInterval(async () => {
      if (isBarcodeDecoding) return;
      const imageSrc = barcodeWebcamRef.current?.getScreenshot?.();
      if (!imageSrc) return;
      try {
        setIsBarcodeDecoding(true);
        const decodedValue = await decodeBarcodeValueFromSource(imageSrc);
        if (!decodedValue) return;
        setScanId(decodedValue);
        setScanEntryMode('manual');
        setShowBarcodeCamera(false);
        toast.success(`Barcode detected: ${decodedValue}`);
      } catch (error) {
        if (!isNoBarcodeFoundError(error)) {
          console.warn('Live barcode scan failed', error);
        }
      } finally {
        setIsBarcodeDecoding(false);
      }
    }, 250);

    return () => {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
    };
  }, [showBarcodeCamera, isBarcodeDecoding, decodeBarcodeValueFromSource]);

  const handleScan = async (e) => {
    e.preventDefault();
    const enteredScanId = String(scanId || '').trim();
    if (!enteredScanId) {
      toast.error('Enter shipment ID or scan barcode');
      return;
    }

    let shipment = matchedScanShipment;
    if (!shipment) {
      try {
        const refreshedShipments = await refreshShipments();
        const normalizedScan = enteredScanId.toUpperCase();
        shipment = (refreshedShipments || []).find((item) => (
          getShipmentScanIdentifiers(item).includes(normalizedScan) && isAgentShipment(item)
        )) || null;
      } catch {
        // keep local fallback behavior
      }
    }

    if (!shipment) {
      setScanResult({
        id: enteredScanId,
        status: 'Not assigned to this agent',
        timestamp: new Date().toLocaleString(),
        success: false
      });
      toast.error('Shipment not found in your queue');
      return;
    }

    const currentStatus = normalizeStatus(shipment.status);
    if (TERMINAL_SCAN_STATUSES.has(currentStatus)) {
      setScanResult({
        id: shipment.trackingNumber || shipment.id,
        status: `Already ${shipment.status}`,
        timestamp: new Date().toLocaleString(),
        success: false
      });
      toast.info(`Shipment is already ${shipment.status}`);
      return;
    }

    const allowedStatuses = getNextScanStatusOptions(shipment.status);
    if (allowedStatuses.length === 0) {
      setScanResult({
        id: shipment.trackingNumber || shipment.id,
        status: `No next status available from ${shipment.status}`,
        timestamp: new Date().toLocaleString(),
        success: false
      });
      toast.error(`No status update available from ${shipment.status}`);
      return;
    }

    const nextStatus = scanStatusMode || allowedStatuses[0];
    const isAllowedStatus = allowedStatuses.some((statusOption) => (
      normalizeStatus(statusOption) === normalizeStatus(nextStatus)
    ));
    if (!isAllowedStatus) {
      toast.error(`Choose one of: ${allowedStatuses.join(', ')}`);
      return;
    }

    if (normalizeStatus(nextStatus) === 'DELIVERED' && !podImage) {
      toast.error('Proof of delivery image is required for Delivered status');
      return;
    }

    const targetShipmentId = shipment.shipmentId || shipment.id || shipment.trackingId || shipment.trackingNumber;
    try {
      await updateShipmentStatus(targetShipmentId, nextStatus, {
        remarks: 'Updated via agent scan',
        proofOfDeliveryImage: normalizeStatus(nextStatus) === 'DELIVERED' ? podImage : null,
        deliveredBy: currentUser?.name || currentUser?.email || 'Agent',
        deliveredByAgentId: agentOnboarding.agentId || currentUser?.userId || currentUser?.id || currentUser?.email
      });

      setScanResult({
        id: shipment.trackingNumber || shipment.id,
        status: nextStatus,
        timestamp: new Date().toLocaleString(),
        success: true
      });

      const shipmentIdentifierSet = new Set(getShipmentScanIdentifiers(shipment));
      const updatedSnapshot = agentShipments.map((item) => (
        getShipmentScanIdentifiers(item).some((value) => shipmentIdentifierSet.has(value))
          ? { ...item, status: nextStatus }
          : item
      ));
      const metrics = computeAgentPerformance(updatedSnapshot);
      const normalizedNext = normalizeStatus(nextStatus);
      const nextAvailability =
        normalizedNext === 'IN TRANSIT' || normalizedNext === 'OUT FOR DELIVERY' || metrics.inTransitCount > 0
          ? 'IN_TRANSIT'
          : 'AVAILABLE';
      setAvailabilityStatus(nextAvailability);
      try {
        await persistAgentProfileSnapshot({
          availabilityStatus: nextAvailability,
          deliveredCount: metrics.deliveredCount,
          failedCount: metrics.failedCount,
          inTransitCount: metrics.inTransitCount
        });
      } catch {
        // non-blocking
      }

      if (TERMINAL_SCAN_STATUSES.has(normalizeStatus(nextStatus))) {
        setScanId('');
        setScanStatusMode('');
      } else {
        setScanStatusMode('');
      }
      if (normalizeStatus(nextStatus) === 'DELIVERED') {
        setPodImage('');
        setShowPodCamera(false);
      }
      toast.success(`Status updated to ${nextStatus}`);
    } catch (error) {
      toast.error(error.message || 'Failed to update shipment status');
    }

    setTimeout(() => setScanResult(null), 3000);
  };

    const hasMandatoryProfile = Boolean(
        agentOnboarding.licenseNumber &&
        agentOnboarding.vehicleNumber &&
        agentOnboarding.rcBookNumber &&
        agentOnboarding.bloodType
    );

    const hasLocalDocs = Boolean(
        agentOnboarding.profilePhoto &&
        agentOnboarding.aadharCopy &&
        agentOnboarding.licenseCopy &&
        agentOnboarding.rcBookCopy
    );

    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    const handleOnboardingFile = async (fieldName, file) => {
        if (!file) return;
        const base64 = await convertFileToBase64(file);
        setAgentOnboarding(prev => ({ ...prev, [fieldName]: base64 }));
    };

    const handleAgentOnboardingSubmit = async (e) => {
        e.preventDefault();
        if (!hasMandatoryProfile) {
            toast.error('Please complete all mandatory agent details');
            return;
        }
        if (!hasLocalDocs) {
            toast.error('Please upload profile photo, Aadhaar, License and RC copy');
            return;
        }

        try {
            const userId = currentUser?.userId || currentUser?.id || currentUser?.email;
            const metrics = computeAgentPerformance();
            const savedProfile = await operationsService.upsertAgentProfile(userId, {
                licenseNumber: agentOnboarding.licenseNumber,
                vehicleNumber: agentOnboarding.vehicleNumber,
                rcBookNumber: agentOnboarding.rcBookNumber,
                bloodType: agentOnboarding.bloodType,
                organDonor: Boolean(agentOnboarding.organDonor),
                profileImage: agentOnboarding.profilePhoto,
                availabilityStatus,
                deliveredCount: metrics.deliveredCount,
                failedCount: metrics.failedCount,
                inTransitCount: metrics.inTransitCount
            });

            localStorage.setItem(onboardingStorageKey, JSON.stringify({
                profilePhoto: agentOnboarding.profilePhoto,
                aadharCopy: agentOnboarding.aadharCopy,
                licenseCopy: agentOnboarding.licenseCopy,
                rcBookCopy: agentOnboarding.rcBookCopy
            }));
            setAgentOnboarding(prev => ({
                ...prev,
                agentId: savedProfile?.agentId || prev.agentId || '',
                verifiedAt: savedProfile?.updatedAt || new Date().toISOString()
            }));
            toast.success('Agent details saved successfully');
            setActiveTab('deliveries');
        } catch (error) {
            toast.error('Failed to save agent details. ' + error.message);
        }
    };

    const handleRefreshAgentData = async () => {
        setIsRefreshing(true);
        try {
            await refreshShipments();
            toast.success('Live shipments refreshed');
        } catch (error) {
            toast.error(error.message || 'Refresh failed');
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
      if (view !== 'notifications' || !currentUser) return;
      let mounted = true;
      const loadTickets = async ({ silent = false } = {}) => {
        try {
          if (!silent && mounted) setIsSupportLoading(true);
          const data = await getSupportTickets(currentUser?.userId || currentUser?.id || currentUser?.email);
          if (!mounted) return;
          setSupportTickets(data || []);
          if (!data || data.length === 0) {
            setSelectedSupportTicketId(null);
          } else if (!selectedSupportTicketId || !data.some((ticket) => ticket.id === selectedSupportTicketId)) {
            setSelectedSupportTicketId(data[0].id);
          }
        } catch {
          if (mounted && !silent) toast.error('Failed to load support conversation');
        } finally {
          if (mounted && !silent) setIsSupportLoading(false);
        }
      };

      loadTickets();
      const interval = setInterval(() => {
        loadTickets({ silent: true });
      }, 10000);

      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }, [view, currentUser?.userId, currentUser?.id, currentUser?.email, getSupportTickets, selectedSupportTicketId]);

    const handleSendAdminMessage = async () => {
        const text = String(adminMessage || '').trim();
        if (!text) return;
        try {
            setIsSendingAdminMessage(true);
            let updatedTicket = null;
            const currentStatus = String(selectedSupportTicket?.status || '').toUpperCase();
            const canReply =
              selectedSupportTicket &&
              currentStatus !== 'CLOSED' &&
              currentStatus !== 'RESOLVED';

            if (canReply) {
              updatedTicket = await replySupportTicket(selectedSupportTicket.id, text);
              setSupportTickets((prev) => prev.map((ticket) => (
                ticket.id === updatedTicket.id ? updatedTicket : ticket
              )));
            } else {
              updatedTicket = await notifyAdminFromAgent(text);
              if (updatedTicket?.id) {
                setSupportTickets((prev) => [updatedTicket, ...prev.filter((ticket) => ticket.id !== updatedTicket.id)]);
                setSelectedSupportTicketId(updatedTicket.id);
              }
            }
            setAdminMessage('');
            toast.success('Message sent to admin');
        } catch (error) {
            toast.error(error.message || 'Failed to send message to admin');
        } finally {
            setIsSendingAdminMessage(false);
        }
    };

    // Do not block dashboard access on first login; KYC comes from customer role-request flow.
    const isActuallyOnboarded = Boolean(agentOnboarding.verifiedAt || hasMandatoryProfile);
    const shouldBlockForOnboarding = false;

    if (currentUser?.role === 'agent' && isAgentProfileLoading) {
        return (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-600">
                Loading agent profile...
            </div>
        );
    }

    if (shouldBlockForOnboarding && currentUser?.role === 'agent' && !isActuallyOnboarded) {
        return (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in-up">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Complete Agent Verification</h2>
                    <p className="text-slate-600">Fill mandatory details before accessing agent operations.</p>
                </div>

                <form onSubmit={handleAgentOnboardingSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">License Number *</label>
                            <input
                                type="text"
                                value={agentOnboarding.licenseNumber}
                                onChange={(e) => setAgentOnboarding(prev => ({ ...prev, licenseNumber: e.target.value }))}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Vehicle Number *</label>
                            <input
                                type="text"
                                value={agentOnboarding.vehicleNumber}
                                onChange={(e) => setAgentOnboarding(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">RC Book Number *</label>
                            <input
                                type="text"
                                value={agentOnboarding.rcBookNumber}
                                onChange={(e) => setAgentOnboarding(prev => ({ ...prev, rcBookNumber: e.target.value }))}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Blood Type *</label>
                            <select
                                value={agentOnboarding.bloodType}
                                onChange={(e) => setAgentOnboarding(prev => ({ ...prev, bloodType: e.target.value }))}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                required
                            >
                                <option value="">Select</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Organ Donor</label>
                            <select
                                value={agentOnboarding.organDonor ? 'yes' : 'no'}
                                onChange={(e) => setAgentOnboarding(prev => ({ ...prev, organDonor: e.target.value === 'yes' }))}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Profile Photo *</label>
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png"
                                onChange={(e) => handleOnboardingFile('profilePhoto', e.target.files?.[0])}
                                className="w-full text-sm"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Aadhaar Copy *</label>
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => handleOnboardingFile('aadharCopy', e.target.files?.[0])}
                                className="w-full text-sm"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">License Copy *</label>
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => handleOnboardingFile('licenseCopy', e.target.files?.[0])}
                                className="w-full text-sm"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">RC Book Copy *</label>
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => handleOnboardingFile('rcBookCopy', e.target.files?.[0])}
                                className="w-full text-sm"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                    >
                        Save & Continue
                    </button>
                </form>
            </div>
        );
    }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-slate-500 text-xs font-semibold uppercase mb-1">Active Shipments</div>
            <div className="text-2xl font-bold text-slate-800">{stats.toDeliver}</div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-slate-500 text-xs font-semibold uppercase mb-1">Completed</div>
            <div className="text-2xl font-bold text-slate-800">{stats.completed}</div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-slate-500 text-xs font-semibold uppercase mb-1">Cash in Hand</div>
            <div className="text-2xl font-bold text-emerald-600">Rs {Number(stats.cashCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
             <div className="text-slate-500 text-xs font-semibold uppercase mb-1">Shift Timer</div>
             <div className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
                {shiftDuration} <span className="text-xs font-normal text-slate-400">Hrs</span>
             </div>
         </div>
      </div>

      {view === 'overview' && (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-2 overflow-x-auto pb-2 w-full sm:w-auto">
                    {['deliveries', 'pickups', 'history'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-full font-bold text-sm capitalize whitespace-nowrap transition-all ${
                                activeTab === tab 
                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                         <input 
                            type="text" 
                            placeholder="Filter city..." 
                            className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                            value={filterCity}
                            onChange={(e) => setFilterCity(e.target.value)}
                         />
                    </div>
                    <select 
                        className="pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Booked">Booked</option>
                        <option value="In Transit">In Transit</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Failed">Failed</option>
                    </select>
                </div>
            </div>
                <div className="space-y-4">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                        {activeTab === 'deliveries' && <Truck className="w-5 h-5 text-indigo-600" />}
                        {activeTab === 'pickups' && <Package className="w-5 h-5 text-indigo-600" />}
                        {activeTab === 'history' && <Clock className="w-5 h-5 text-slate-600" />}
                        
                        <span className="capitalize">{activeTab}</span> 
                      <span className="text-slate-400 font-normal text-sm ml-2">({overviewShipmentList.length})</span>
                    </h2>
                    
                    {overviewShipmentList.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-slate-200 border-dashed animate-fade-in">
                             <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                             <p className="text-slate-500">No {activeTab} found matching your filters.</p>
                             <button onClick={() => {setFilterStatus('All'); setFilterCity('');}} className="mt-4 text-indigo-600 font-bold hover:underline">Clear Filters</button>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {overviewShipmentList.map(shipment => {
                                const senderDetails = getPartyDetails(shipment, 'sender');
                                const receiverDetails = getPartyDetails(shipment, 'receiver');
                                return (
                                <div key={shipment.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-lg text-slate-900">{shipment.id}</span>
                                            </div>
                                            <div className="flex gap-2 mb-2">
                                                 <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                    isCodPayment(shipment) ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {shipment.paymentMode}
                                                </span>
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">
                                                    {shipment.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-xl text-slate-900">&#8377;{shipment.cost}</div>
                                            <div className="text-xs text-slate-400">Value</div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">
                                                    {activeTab === 'pickups' ? senderDetails.name : receiverDetails.name}
                                                </div>
                                                <div className="text-sm text-slate-600 leading-snug">
                                                    {activeTab === 'pickups' ? senderDetails.city : receiverDetails.city}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {activeTab === 'deliveries' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button 
                                                onClick={async () => {
                                                  await handleQuickStatusUpdate(shipment.id, 'In Transit');
                                                  setActiveTab('pickups');
                                                }}
                                                className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                                            >
                                                <Package className="w-4 h-4" /> Pick Up
                                            </button>
                                            <button 
                                                onClick={() => reassignShipmentToAnotherAgent(shipment, 'Reassigned from agent delivery queue')}
                                                className="py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                                            >
                                                <AlertTriangle className="w-4 h-4" /> Send Other Agent
                                            </button>
                                        </div>
                                    )}
                                    {activeTab === 'pickups' && (
                                        <div className="grid grid-cols-2 gap-3">
                                          <button
                                              onClick={() => {
                                                const targetId = shipment.trackingNumber || shipment.trackingId || shipment.id;
                                                localStorage.setItem(AGENT_SCAN_TARGET_KEY, targetId);
                                                navigate('/agent/scan');
                                              }}
                                              className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                                          >
                                              <Scan className="w-4 h-4" /> Move To Scan
                                          </button>
                                          <button
                                              onClick={() => reassignShipmentToAnotherAgent(shipment, 'Reassigned from pickup queue')}
                                              className="py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                                          >
                                              <AlertTriangle className="w-4 h-4" /> Send Other Agent
                                          </button>
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                    )}
                </div>
        </div>
      )}

      {view === 'scan' && (
          <div className="max-w-xl mx-auto space-y-8">
            <div className="text-center">
               <h2 className="text-2xl font-bold text-slate-900">Scan Parcels</h2>
               <p className="text-slate-500">Update status of incoming/outgoing packages</p>
            </div>

            <form onSubmit={handleScan} className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                <div className="mb-6 text-center">
                   <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Scan className="w-10 h-10 text-indigo-600" />
                   </div>
                   <p className="text-sm font-medium text-indigo-600">
                     {matchedScanShipment
                       ? `Current: ${matchedScanShipment.status}`
                       : 'Enter shipment ID to start'}
                   </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl border border-slate-200 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setScanEntryMode('manual')}
                      className={`py-2 rounded-lg text-sm font-semibold ${scanEntryMode === 'manual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
                    >
                      Manual ID
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanEntryMode('barcode')}
                      className={`py-2 rounded-lg text-sm font-semibold ${scanEntryMode === 'barcode' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
                    >
                      Scan Barcode
                    </button>
                  </div>

                  {scanEntryMode === 'barcode' && (
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                      <div className="text-sm text-slate-600">Choose barcode scan method</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isBarcodeDecoding}
                          onClick={() => barcodeFileInputRef.current?.click()}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Upload className="w-4 h-4" /> Upload
                        </button>
                        <button
                          type="button"
                          disabled={isBarcodeDecoding}
                          onClick={() => setShowBarcodeCamera(true)}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Camera className="w-4 h-4" /> Camera
                        </button>
                      </div>
                      {!isBarcodeSupported && (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          Browser barcode API is unavailable. Enter shipment ID manually.
                        </div>
                      )}
                      <input
                        ref={barcodeFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleBarcodeFile(e.target.files?.[0])}
                        className="hidden"
                      />
                    </div>
                  )}

                  <input
                    type="text"
                    value={scanId}
                    onChange={(e) => setScanId(e.target.value)}
                    placeholder="Enter or scan shipment ID"
                    className="w-full text-center text-lg font-mono py-4 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    autoFocus
                  />

                  {scanId && !matchedScanShipment && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Shipment not found in your assigned queue.
                    </div>
                  )}

                  {matchedScanShipment && (
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">Next Status</label>
                      <select
                        value={scanStatusMode}
                        onChange={(e) => setScanStatusMode(e.target.value)}
                        disabled={nextScanStatusOptions.length === 0}
                        className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium disabled:opacity-60"
                      >
                        {nextScanStatusOptions.length === 0 && (
                          <option value="">No further status available</option>
                        )}
                        {nextScanStatusOptions.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>{statusOption}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {normalizeStatus(scanStatusMode) === 'DELIVERED' && (
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                      <div className="text-sm font-semibold text-slate-700">Proof of Delivery (required)</div>
                      {podImage ? (
                        <img src={podImage} alt="POD" className="w-full h-44 object-cover rounded-lg border border-slate-200" />
                      ) : (
                        <div className="h-44 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-sm">
                          Upload or capture delivery image
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => podFileInputRef.current?.click()}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
                        >
                          <Upload className="w-4 h-4" /> Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPodCamera(true)}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
                        >
                          <Camera className="w-4 h-4" /> Camera
                        </button>
                      </div>
                      <input
                        ref={podFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePodFile(e.target.files?.[0])}
                        className="hidden"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!matchedScanShipment || nextScanStatusOptions.length === 0 || !scanStatusMode}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {isBarcodeDecoding ? 'Reading Barcode...' : 'Process Scan'}
                  </button>
                </div>
             </form>

            {scanResult && (
               <div className={`border rounded-xl p-4 flex items-center gap-4 animate-fade-in-up ${scanResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${scanResult.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                     {scanResult.success ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>
                  <div>
                     <div className={`font-bold ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {scanResult.success ? 'Status Updated Successfully' : 'Shipment Not Found'}
                     </div>
                     <div className={`text-sm ${scanResult.success ? 'text-green-700' : 'text-red-700'}`}>
                        {scanResult.id} : {scanResult.status}
                     </div>
                  </div>
               </div>
            )}

            {showBarcodeCamera && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowBarcodeCamera(false)}>
                <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Scan Shipment Barcode</h3>
                    <button type="button" onClick={() => setShowBarcodeCamera(false)} className="text-slate-500">Close</button>
                  </div>
                  <div className="bg-black">
                    <Webcam
                      audio={false}
                      ref={barcodeWebcamRef}
                      screenshotFormat="image/jpeg"
                      screenshotQuality={1}
                      forceScreenshotSourceSize
                      className="w-full h-full object-cover"
                      videoConstraints={{
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                      }}
                    />
                  </div>
                  <div className="p-4 bg-slate-50">
                    <button
                      type="button"
                      disabled={isBarcodeDecoding}
                      onClick={captureBarcodeFromCamera}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {isBarcodeDecoding ? 'Scanning...' : 'Scan Barcode'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showPodCamera && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowPodCamera(false)}>
                <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Capture Proof of Delivery</h3>
                    <button type="button" onClick={() => setShowPodCamera(false)} className="text-slate-500">Close</button>
                  </div>
                  <div className="bg-black">
                    <Webcam
                      audio={false}
                      ref={podWebcamRef}
                      screenshotFormat="image/jpeg"
                      className="w-full h-full object-cover"
                      videoConstraints={{ facingMode: 'environment' }}
                    />
                  </div>
                  <div className="p-4 bg-slate-50">
                    <button
                      type="button"
                      onClick={capturePodImage}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                    >
                      Capture
                    </button>
                  </div>
                </div>
              </div>
            )}
         </div>
      )}
      {view === 'quick-book' && (
         <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
               <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  Quick Walk-in Booking
               </h2>
            </div>
            <QuickBookingForm />
         </div>
      )}

      {view === 'runsheets' && (
        <RunSheetView
            todaysDeliveries={agentShipments.filter(s => {
                const allowed = ['BOOKED', 'IN TRANSIT', 'OUT FOR DELIVERY'].includes(normalizeStatus(s.status));
                if (!allowed) return false;
                const allowedAgentIds = [
                  agentOnboarding.agentId,
                  currentUser?.userId,
                  currentUser?.id,
                  currentUser?.email
                ].filter(Boolean);
                return !s.assignedAgentId || allowedAgentIds.includes(s.assignedAgentId);
            })}
            currentUser={currentUser}
            agentIdentifier={agentOnboarding.agentId || currentUser?.userId || currentUser?.id || currentUser?.email}
            refreshShipments={refreshShipments}
        />
      )}

      {view === 'cash' && (
         <CashCollectionView
            shipments={agentShipments}
            currentUser={currentUser}
            agentIdentifier={agentOnboarding.agentId || currentUser?.userId || currentUser?.id || currentUser?.email}
            updateShipmentStatus={updateShipmentStatus}
            refreshShipments={refreshShipments}
         />
      )}

            {view === 'notifications' && (
                <div className="space-y-4 animate-fade-in-up">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-slate-900">Agent Support Conversation</h2>
                        <p className="text-sm text-slate-500">Chat with admin and track replies in real time</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50">
                                <h3 className="font-bold text-slate-900 text-sm">My Support Tickets</h3>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                                {isSupportLoading ? (
                                  <div className="p-6 text-sm text-center text-slate-500">Loading conversation...</div>
                                ) : supportTickets.length > 0 ? supportTickets.map((ticket) => (
                                  <button
                                    key={ticket.id}
                                    type="button"
                                    onClick={() => setSelectedSupportTicketId(ticket.id)}
                                    className={`w-full text-left p-4 hover:bg-slate-50 ${selectedSupportTicketId === ticket.id ? 'bg-indigo-50/60' : ''}`}
                                  >
                                    <div className="font-semibold text-slate-900 text-sm">{ticket.subject}</div>
                                    <div className="text-xs text-slate-500 font-mono mt-1">{ticket.id}</div>
                                    <div className="text-xs text-slate-500 mt-1">{String(ticket.status || 'OPEN').replace(/_/g, ' ')}</div>
                                  </button>
                                )) : (
                                  <div className="p-8 text-center text-slate-500 text-sm">No conversation yet.</div>
                                )}
                            </div>
                        </div>
                        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50">
                                <h3 className="font-bold text-slate-900 text-sm">{selectedSupportTicket?.subject || 'Start a conversation with admin'}</h3>
                            </div>
                            <div className="p-4 space-y-3 max-h-[430px] overflow-y-auto">
                                {selectedSupportTicket && (selectedSupportTicket.messages || []).length > 0 ? (
                                  selectedSupportTicket.messages.map((message) => {
                                    const senderRole = String(message.senderRole || '').toUpperCase();
                                    const isMine = senderRole === 'AGENT';
                                    return (
                                      <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 border ${isMine ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-800 border-slate-200'}`}>
                                          <div className={`text-xs mb-1 ${isMine ? 'text-indigo-100' : 'text-slate-500'}`}>
                                            {message.senderName} ({senderRole || 'ADMIN'})
                                          </div>
                                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                                          <div className={`text-[11px] mt-2 ${isMine ? 'text-indigo-100' : 'text-slate-500'}`}>{message.createdLabel}</div>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="py-10 text-center text-slate-500 text-sm">
                                    {isSupportLoading ? 'Loading conversation...' : 'No messages yet. Send a note to admin.'}
                                  </div>
                                )}
                            </div>
                            <div className="p-4 border-t border-slate-100">
                                <div className="flex gap-2">
                                    <input
                                        value={adminMessage}
                                        onChange={(e) => setAdminMessage(e.target.value)}
                                        placeholder="Type an operational note for admin..."
                                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSendAdminMessage();
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSendAdminMessage}
                                        disabled={isSendingAdminMessage || !adminMessage.trim()}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 inline-flex items-center gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        {isSendingAdminMessage ? 'Sending...' : 'Send'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {agentNotifications.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 text-sm font-semibold text-slate-800">System Alerts</div>
                        <div className="divide-y divide-slate-100">
                          {agentNotifications.slice(0, 5).map((item) => (
                            <div key={item.id} className="px-4 py-3 text-sm">
                              <div className="text-slate-900">{item.message}</div>
                              <div className="text-xs text-slate-500 mt-1">{item.timestamp}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
            )}
    </div>
  );
}

function QuickBookingForm() {
    const { addShipment, calculateRate } = useShipment();
    const normalizePhoneInput = (value = '') => {
      const digits = String(value || '').replace(/\D/g, '');
      const localDigits = digits.startsWith('91') ? digits.slice(2, 12) : digits.slice(0, 10);
      return `+91${localDigits}`;
    };
    const isValidIndianPhone = (value) => /^\+91\d{10}$/.test(String(value || '').trim());
    const composeAddressLine = (details = {}) => (
      [details.doorAddress, details.city, details.state, details.pincode]
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .join(', ')
    );
    const normalizeComparable = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const defaultParty = () => ({
      name: '',
      phone: '+91',
      doorAddress: '',
      city: '',
      state: 'Tamil Nadu',
      pincode: ''
    });

    const [formData, setFormData] = useState({
      sender: defaultParty(),
      receiver: defaultParty(),
      weight: '',
      type: 'Standard'
    });
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [trackingId, setTrackingId] = useState('');
    const estimatedCost = calculateRate(formData.weight || 0, formData.type);

    const handlePartyChange = (section, field, value) => {
      const nextValue = field === 'phone' ? normalizePhoneInput(value) : value;
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: nextValue
        }
      }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      const senderAddress = composeAddressLine(formData.sender);
      const receiverAddress = composeAddressLine(formData.receiver);

      if (!isValidIndianPhone(formData.sender.phone) || !isValidIndianPhone(formData.receiver.phone)) {
        toast.error('Phone number must be in +91XXXXXXXXXX format');
        return;
      }
      if (formData.sender.phone === formData.receiver.phone) {
        toast.error('Sender and receiver phone numbers cannot be the same');
        return;
      }
      if (
        !formData.sender.doorAddress.trim() || !formData.sender.city.trim() || !formData.sender.state.trim() || !/^\d{6}$/.test(formData.sender.pincode) ||
        !formData.receiver.doorAddress.trim() || !formData.receiver.city.trim() || !formData.receiver.state.trim() || !/^\d{6}$/.test(formData.receiver.pincode)
      ) {
        toast.error('Enter door address, city, state and valid 6-digit pincode');
        return;
      }
      if (normalizeComparable(senderAddress) === normalizeComparable(receiverAddress)) {
        toast.error('Sender and receiver addresses cannot be the same');
        return;
      }

      try {
        const shipment = await addShipment({
          sender: formData.sender,
          receiver: formData.receiver,
          weight: formData.weight,
          cost: estimatedCost,
          type: formData.type,
          paymentMode: 'COD'
        });
        setTrackingId(shipment?.trackingNumber || shipment?.trackingId || shipment?.id || `SF-${Date.now()}`);
        setIsSubmitted(true);
      } catch (error) {
        toast.error(error?.message || 'Failed to create booking');
      }
    };

    if (isSubmitted) {
      return (
        <div className="p-12 text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 print:hidden">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="print:hidden">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Booking Confirmed!</h3>
            <p className="text-slate-500 mb-6">Label generated and sent to printer.</p>
          </div>

          <div id="agent-quick-booking-label" className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md mx-auto relative overflow-hidden group print:shadow-none print:border-2 print:max-w-none print:p-4 print:w-full printable">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600 print:hidden"></div>
            <div className="hidden print:block text-2xl font-bold mb-4 text-center border-b pb-4">SHIPFAST LOGISTICS</div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Tracking ID</p>
            <div className="text-4xl font-mono font-bold text-slate-900 tracking-widest mb-4 selection:bg-indigo-100">{trackingId}</div>

            <div className="mb-6 flex justify-center">
              <BarcodeGenerator value={trackingId} />
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center text-sm">
              <div className="text-left">
                <p className="text-xs text-slate-400 font-semibold uppercase">Amount To Pay</p>
                <p className="font-bold text-slate-800">&#8377;{estimatedCost}</p>
                <span className="text-[10px] text-slate-500">(Includes COD Fee)</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 text-left text-sm text-slate-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-bold block mb-1">From:</span>
                  <p>{formData.sender.name}</p>
                  <p>{formData.sender.phone}</p>
                  <p>{composeAddressLine(formData.sender)}</p>
                </div>
                <div>
                  <span className="font-bold block mb-1">To:</span>
                  <p>{formData.receiver.name}</p>
                  <p>{formData.receiver.phone}</p>
                  <p>{composeAddressLine(formData.receiver)}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p><span className="font-bold">Service:</span> {formData.type}</p>
                <p><span className="font-bold">Weight:</span> {formData.weight} kg</p>
                <p><span className="font-bold">Payment Method:</span> COD</p>
                <p><span className="font-bold">Payment Status:</span> PENDING</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-8 print:hidden">
            <button
              onClick={() => printElementById('agent-quick-booking-label', 'Quick Booking Label')}
              className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Print Label
            </button>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setTrackingId('');
                setFormData({
                  sender: defaultParty(),
                  receiver: defaultParty(),
                  weight: '',
                  type: 'Standard'
                });
              }}
              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30"
            >
              Book Another
            </button>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Sender Details</h3>
            <input required placeholder="Ilango K" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.sender.name} onChange={e => handlePartyChange('sender', 'name', e.target.value)} />
            <input required placeholder="+91XXXXXXXXXX" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.sender.phone} onChange={e => handlePartyChange('sender', 'phone', e.target.value)} />
            <input required placeholder="Door / Street Address" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.sender.doorAddress} onChange={e => handlePartyChange('sender', 'doorAddress', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="City" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.sender.city} onChange={e => handlePartyChange('sender', 'city', e.target.value)} />
              <input required placeholder="State" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.sender.state} onChange={e => handlePartyChange('sender', 'state', e.target.value)} />
            </div>
            <input required placeholder="Pincode" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.sender.pincode} onChange={e => handlePartyChange('sender', 'pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} />
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Receiver Details</h3>
            <input required placeholder="Yazhini R" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.receiver.name} onChange={e => handlePartyChange('receiver', 'name', e.target.value)} />
            <input required placeholder="+91XXXXXXXXXX" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.receiver.phone} onChange={e => handlePartyChange('receiver', 'phone', e.target.value)} />
            <input required placeholder="Door / Street Address" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.receiver.doorAddress} onChange={e => handlePartyChange('receiver', 'doorAddress', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="City" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.receiver.city} onChange={e => handlePartyChange('receiver', 'city', e.target.value)} />
              <input required placeholder="State" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.receiver.state} onChange={e => handlePartyChange('receiver', 'state', e.target.value)} />
            </div>
            <input required placeholder="Pincode" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.receiver.pincode} onChange={e => handlePartyChange('receiver', 'pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-700">Weight (kg)</label>
              <input required type="number" min="0.1" step="0.1" placeholder="0.5" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-700">Service Type</label>
              <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                <option>Standard</option>
                <option>Express</option>
                <option>Same Day</option>
              </select>
            </div>
            <div className="flex-1">
              <div className="text-right mb-1 text-sm text-slate-500">Estimated Cost</div>
              <div className="text-2xl font-bold text-slate-900 text-right">&#8377;{estimatedCost}</div>
            </div>
          </div>
        </div>

        <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">
          Confirm Booking & Print Label
        </button>
      </form>
    );
}
function RunSheetView({ todaysDeliveries, currentUser, agentIdentifier, refreshShipments }) {
    const [selectedIds, setSelectedIds] = useState([]);
    const [generatedSheet, setGeneratedSheet] = useState(null);

    const toggleSelection = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleAssign = async () => {
        if (selectedIds.length === 0) return toast.error("Select shipments to assign");

        const selectedShipments = todaysDeliveries.filter(s => selectedIds.includes(s.id));

        try {
            const response = await operationsService.createRunSheet({
                agentId: agentIdentifier || currentUser?.userId || currentUser?.id || currentUser?.email || 'AGENT-DEFAULT',
                hubId: 'HUB-DEFAULT',
                shipmentTrackingNumbers: selectedIds
            });

            const sheet = {
                id: response?.runSheetId || `RS-${Date.now()}`,
                date: response?.date ? new Date(response.date).toLocaleDateString() : new Date().toLocaleDateString(),
                items: selectedShipments,
                agent: response?.agentId || (agentIdentifier || currentUser?.name || 'Current Agent')
            };
            setGeneratedSheet(sheet);
            toast.success(`Run Sheet ${sheet.id} Generated`);
            await refreshShipments?.();
        } catch (error) {
            const sheet = {
                id: `RS-${Date.now()}`,
                date: new Date().toLocaleDateString(),
                items: selectedShipments,
                agent: currentUser?.name || 'Current Agent'
            };
            setGeneratedSheet(sheet);
            toast.warning(`Run sheet saved locally (${error.message || 'backend unavailable'})`);
        }
    };
    
    // Filtering for logic demo
    const eligibleForRunSheet = todaysDeliveries.filter(s => ['BOOKED', 'IN TRANSIT', 'OUT FOR DELIVERY'].includes(normalizeStatus(s.status)));

    return (
         <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Run Sheet Generation</h1>
                <p className="text-slate-600">Assign pending deliveries to drivers</p>
              </div>
              <div className="flex flex-wrap gap-2 items-stretch md:items-center">
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
                                       {generatedSheet.items.map(s => {
                                           const receiverDetails = getPartyDetails(s, 'receiver');
                                           return (
                                           <tr key={s.id}>
                                               <td className="p-3 border font-mono">{s.id}</td>
                                               <td className="p-3 border">
                                                   <div className="font-bold">{receiverDetails.name}</div>
                                                   <div className="text-slate-500">{receiverDetails.address}{receiverDetails.address && receiverDetails.city ? ', ' : ''}{receiverDetails.city}</div>
                                                   <div className="text-xs text-slate-400">Ph: {receiverDetails.phone}</div>
                                               </td>
                                               <td className="p-3 border">{s.type}</td>
                                               <td className="p-3 border font-mono">
                                                   {isCodPayment(s) ? `\u20b9${s.cost}` : '-'}
                                               </td>
                                               <td className="p-3 border"></td>
                                           </tr>
                                       )})}
                                   </tbody>
                               </table>
                               </div>
                               <div className="mt-8 pt-4 border-t flex flex-col gap-2 sm:flex-row sm:justify-between text-sm text-slate-500">
                                   <div>Generated by System</div>
                                   <div>Authorized Signature _________________</div>
                               </div>
                           </div>
                      </SectionDownloader>
                  )}

                  <button 
                    onClick={handleAssign}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2 h-10"
                  >
                    <FileText className="w-4 h-4" />
                    Generate Sheet ({selectedIds.length})
                  </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                  <span className="font-semibold text-slate-700">Pending for Delivery (Today)</span>
                  <span className="text-sm bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">{eligibleForRunSheet.length} Shipments</span>
               </div>
               <div className="divide-y divide-slate-100">
                        {eligibleForRunSheet.length > 0 ? eligibleForRunSheet.map(s => {
                            const receiverDetails = getPartyDetails(s, 'receiver');
                            return (
                            <div key={s.id} className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 cursor-pointer" onClick={() => toggleSelection(s.id)}>
                        <div className="relative flex items-center justify-center p-2 self-start sm:self-auto">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                                checked={selectedIds.includes(s.id)}
                                onChange={() => {}} 
                            />
                        </div>
                        <div className="flex-1 w-full">
                           <div className="font-medium text-slate-900">{s.id}</div>
                                    <div className="text-sm text-slate-500">{receiverDetails.city} • <span className="text-indigo-600">{s.type}</span></div>
                        </div>
                        <div className="text-left sm:text-right text-sm w-full sm:w-auto">
                           <div className="font-medium text-slate-900">COD: &#8377;{s.cost}</div>
                           <div className="text-slate-500">{s.weight} kg</div>
                        </div>
                     </div>
                        )}) : (
                      <div className="p-8 text-center text-slate-500">No shipments pending for run sheet</div>
                  )}
               </div>
            </div>
         </div>
    );
}

function CashCollectionView({ shipments, currentUser, agentIdentifier, updateShipmentStatus, refreshShipments }) {
    const [historyInfo, setHistoryInfo] = useState(false);
    const [submittedTransactions, setSubmittedTransactions] = useState([]);
    const [verifyAmount, setVerifyAmount] = useState('');
    const [syncedRunSheetIds, setSyncedRunSheetIds] = useState([]);
    const [selectedRunSheetId, setSelectedRunSheetId] = useState('');
    const agentCashHistoryKey = `sf_agent_cash_txn_${currentUser?.userId || currentUser?.id || currentUser?.email || 'default'}`;
    const toCents = (value) => Math.max(0, Math.round((Number(value) || 0) * 100));
    const fromCents = (value) => (Number(value) || 0) / 100;
    const formatAmount = (value) => Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    useEffect(() => {
        try {
            const raw = localStorage.getItem(agentCashHistoryKey);
            const parsed = raw ? JSON.parse(raw) : [];
            setSubmittedTransactions(Array.isArray(parsed) ? parsed : []);
        } catch {
            setSubmittedTransactions([]);
        }
    }, [agentCashHistoryKey]);

    useEffect(() => {
        localStorage.setItem(agentCashHistoryKey, JSON.stringify(submittedTransactions));
    }, [agentCashHistoryKey, submittedTransactions]);

    useEffect(() => {
      const loadRunSheets = async () => {
        if (!agentIdentifier) {
          setSyncedRunSheetIds([]);
          return;
        }
        try {
          const runSheets = await operationsService.getRunSheetsByAgent(agentIdentifier);
          const ids = Array.from(new Set((runSheets || []).map((sheet) => sheet?.runSheetId).filter(Boolean)));
          setSyncedRunSheetIds(ids);
        } catch {
          setSyncedRunSheetIds([]);
        }
      };
      loadRunSheets();
    }, [agentIdentifier, shipments]);
    
    // Categorization Logic
    const deliveredCod = shipments
        .filter((s) => normalizeStatus(s.status) === 'DELIVERED')
        .filter((s) => isCodPayment(s));

    const pendingCodShipments = deliveredCod.filter((shipment) => !isCodPaymentSettled(shipment));
    const paidCodShipments = deliveredCod.filter((shipment) => isCodPaymentSettled(shipment));

    const breakdown = deliveredCod.reduce((acc, s) => {
        const mode = 'COD';
        acc[mode] = (acc[mode] || 0) + toCents(s.cost);
        return acc;
    }, {});

    const totalCollected = fromCents(paidCodShipments.reduce((sum, shipment) => sum + toCents(shipment.cost), 0));
    const verifiedSubmittedTotal = fromCents(submittedTransactions
      .filter((transaction) => String(transaction.status || '').toUpperCase() === 'VERIFIED')
      .reduce((sum, transaction) => sum + toCents(transaction.amount), 0));
    const pendingCodAmountCents = pendingCodShipments.reduce((sum, shipment) => sum + toCents(shipment.cost), 0);
    const cashOnHandCents = Math.max(pendingCodAmountCents, 0);
    const cashOnHand = fromCents(cashOnHandCents);
    const totalVerifiedRevenue = verifiedSubmittedTotal;
    const runSheetIds = Array.from(new Set([
      ...(shipments || []).map((s) => s.runSheetId).filter(Boolean),
      ...syncedRunSheetIds
    ]));

    useEffect(() => {
      if (!runSheetIds.length) {
        setSelectedRunSheetId('');
        return;
      }
      if (!selectedRunSheetId || !runSheetIds.includes(selectedRunSheetId)) {
        setSelectedRunSheetId(runSheetIds[0]);
      }
    }, [runSheetIds, selectedRunSheetId]);

    const markCodShipmentsAsPaid = async (amount, runSheetId = '') => {
      const sortedPending = [...pendingCodShipments].sort((a, b) => {
        const aDate = new Date(a.deliveryDate || a.date || 0).getTime();
        const bDate = new Date(b.deliveryDate || b.date || 0).getTime();
        return aDate - bDate;
      });

      let remainingCents = toCents(amount);
      const updatedIds = [];
      for (const shipment of sortedPending) {
        const shipmentAmountCents = toCents(shipment.cost);
        if (shipmentAmountCents <= 0 || remainingCents < shipmentAmountCents) continue;
        const mutationId = shipment.shipmentId || shipment.id;
        await updateShipmentStatus(mutationId, 'Delivered', {
          remarks: runSheetId
            ? `COD payment collected and submitted by agent against run sheet ${runSheetId}`
            : 'COD payment collected and submitted by agent',
          paymentStatus: 'SUCCESS',
          paymentCollectedAt: new Date().toISOString()
        });
        remainingCents -= shipmentAmountCents;
        updatedIds.push(shipment.trackingNumber || shipment.trackingId || shipment.id);
      }
      return updatedIds;
    };

    const handleDeposit = async () => {
        if (cashOnHandCents <= 0) {
            toast.info('No pending cash to deposit.');
            return;
        }
        try {
          const updatedIds = await markCodShipmentsAsPaid(cashOnHand, selectedRunSheetId);
          if (updatedIds.length === 0) {
            toast.error('No COD shipment matched for payment update');
            return;
          }
          await refreshShipments?.();
          toast.success(`COD updated as paid for ${updatedIds.length} shipments`);
        } catch (error) {
          toast.error(error.message || 'Failed to submit COD deposit');
          return;
        }
        const newTxn = {
            id: `DEP-${Date.now()}`,
            date: new Date().toLocaleString(),
            amount: Number(cashOnHand.toFixed(2)),
            type: 'Deposit',
            status: 'VERIFIED',
            runSheetId: selectedRunSheetId || '-'
        };
        setSubmittedTransactions((prev) => [newTxn, ...prev]);
    };

        const handleSubmitCash = async () => {
        if (!verifyAmount || parseFloat(verifyAmount) <= 0) return toast.error("Enter valid amount");

        const amountCents = toCents(verifyAmount);
        if (amountCents > cashOnHandCents) {
            toast.error(`Entered amount exceeds cash on hand (Rs ${formatAmount(cashOnHand)}).`);
            return;
        }
        const amount = fromCents(amountCents);
        try {
          const updatedIds = await markCodShipmentsAsPaid(amount, selectedRunSheetId);
          if (updatedIds.length === 0) {
            toast.error('No COD shipment matched for this amount');
            return;
          }
          await refreshShipments?.();
          toast.success(`Cash verified. ${updatedIds.length} shipment(s) marked paid`);
        } catch (error) {
          toast.error(error.message || 'Failed to verify cash');
          return;
        }
        const newTxn = {
             id: `CSH-${Date.now()}`,
             date: new Date().toLocaleString(),
             amount: Number(amount.toFixed(2)),
             type: 'Cash Submission',
             status: 'VERIFIED',
             runSheetId: selectedRunSheetId || '-'
        };
        setSubmittedTransactions((prev) => [newTxn, ...prev]);
        setVerifyAmount('');
    };

    return (
         <div className="max-w-4xl mx-auto animate-fade-in-up">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Cash Collection & Reconciliation</h1>
            
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
                     <div className="text-slate-400 text-sm font-medium mb-1">Cash On Hand (COD)</div>
                     <div className="text-4xl font-bold">Rs {formatAmount(cashOnHand)}</div>
                     <div className="text-xs text-slate-300 mt-1">Submitted & verified: Rs {formatAmount(totalVerifiedRevenue)}</div>
                     <div className="mt-4 flex gap-2">
                        <button 
                            onClick={handleDeposit}
                            className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <CreditCard className="w-4 h-4" /> Deposit All
                        </button>
                        <button 
                            onClick={() => setHistoryInfo(!historyInfo)}
                            className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <History className="w-4 h-4" /> {historyInfo ? 'Hide History' : 'View History'}
                        </button>
                     </div>
                  </div>
                  
                  {historyInfo && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                          <h3 className="font-bold text-slate-900 mb-2 text-sm">Recent Transactions</h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                              {submittedTransactions.length > 0 ? submittedTransactions.map(txn => (
                                  <div key={txn.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded">
                                      <div>
                                          <div className="font-medium text-slate-800">{txn.type}</div>
                                          <div className="text-xs text-slate-500">{txn.date}</div>
                                      </div>
                                      <div className="text-right">
                                          <div className="font-bold text-indigo-600">Rs {formatAmount(txn.amount)}</div>
                                          <div className="text-xs text-green-600">{txn.status}</div>
                                      </div>
                                  </div>
                              )) : (
                                  <p className="text-slate-400 text-xs italic">No recent deposits.</p>
                              )}
                          </div>
                      </div>
                  )}
                  
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                     <h3 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wider">Breakdown by Method</h3>
                     <div className="space-y-3">
                         {Object.entries(breakdown).map(([method, amountCents]) => (
                             <div key={method} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                 <span className="font-medium text-slate-700">{method}</span>
                                 <span className="font-bold text-slate-900">Rs {formatAmount(fromCents(amountCents))}</span>
                             </div>
                         ))}
                         {Object.keys(breakdown).length === 0 && <p className="text-slate-400 text-sm italic">No collected payments yet</p>}
                     </div>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4">Submit Collected Cash</h3>
                  <div className="space-y-4">
                     <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Run Sheet ID</label>
                        {runSheetIds.length > 0 ? (
                          <select
                              value={selectedRunSheetId}
                              onChange={(e) => setSelectedRunSheetId(e.target.value)}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                              {runSheetIds.map((id) => (
                                <option key={id} value={id}>{id}</option>
                              ))}
                          </select>
                        ) : (
                          <div className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500">
                            No run sheets synced yet
                          </div>
                        )}
                     </div>
                     <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Total COD Amount (Cash Only)</label>
                        <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rs</span>
                           <input 
                                type="number"
                                step="0.01"
                                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-lg" 
                                placeholder="Enter amount"
                                value={verifyAmount}
                                onChange={(e) => setVerifyAmount(e.target.value)}
                           />
                        </div>
                     </div>
                     <button 
                        onClick={handleSubmitCash}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
                     >
                        Verify & Submit
                     </button>
                  </div>
               </div>
            </div>
         </div>
    );
}

function AgentProfileView({ currentUser }) {
    const [profile, setProfile] = useState(null);
    const [docs, setDocs] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingDocs, setIsSavingDocs] = useState(false);
    const userKey = currentUser?.userId || currentUser?.id || currentUser?.email || 'default';
    const storageKeys = [`sf_agent_onboarding_${userKey}`, `agent_onboarding_${userKey}`];

    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    const persistDocs = (nextDocs) => {
        storageKeys.forEach((key) => {
            localStorage.setItem(key, JSON.stringify(nextDocs));
        });
    };

    const handleDocUpload = async (docKey, file) => {
        if (!file) return;
        try {
            setIsSavingDocs(true);
            const base64 = await convertFileToBase64(file);
            const nextDocs = { ...docs, [docKey]: base64 };
            setDocs(nextDocs);
            persistDocs(nextDocs);
            if (docKey === 'profilePhoto') {
                try {
                    await operationsService.upsertAgentProfile(userKey, { profileImage: base64 });
                    setProfile((prev) => ({ ...(prev || {}), profileImage: base64 }));
                } catch {
                    // local docs still preserved
                }
            }
            toast.success('Document uploaded');
        } catch {
            toast.error('Failed to upload document');
        } finally {
            setIsSavingDocs(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        const loadProfile = async () => {
            setIsLoading(true);
            try {
                const fetched = await operationsService.getAgentProfile(userKey);
                if (!cancelled) setProfile(fetched || null);
            } catch {
                if (!cancelled) setProfile(null);
            }

            if (!cancelled) {
                let parsedDocs = {};
                for (const key of storageKeys) {
                    try {
                        const raw = localStorage.getItem(key);
                        if (raw) {
                            parsedDocs = JSON.parse(raw) || {};
                            break;
                        }
                    } catch {
                        parsedDocs = {};
                    }
                }
                setDocs(parsedDocs);
                setIsLoading(false);
            }
        };

        loadProfile();
        return () => {
            cancelled = true;
        };
    }, [userKey]);

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-600">
                Loading profile details...
            </div>
        );
    }

    const displayName = currentUser?.name || currentUser?.fullName || 'Agent';
    const profilePhoto = profile?.profileImage || docs?.profilePhoto || null;
    const averageRating = Number(profile?.averageRating || 0);
    const totalRatings = Number(profile?.totalRatings || 0);
    const joinedOn = profile?.joinDate ? new Date(profile.joinDate).toLocaleDateString() : 'N/A';
    const verificationStatus = String(profile?.verificationStatus || 'PENDING').toUpperCase();

    return (
         <div className="animate-fade-in-up space-y-6">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                My Profile & Performance
            </h2>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
                    {profilePhoto ? (
                        <img src={profilePhoto} alt="Agent profile" className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100 shadow-sm" />
                    ) : (
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 border-2 border-indigo-100 shadow-sm">
                            {(displayName || 'A').charAt(0)}
                        </div>
                    )}
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{displayName}</h3>
                        <div className="text-slate-500">Agent | {currentUser?.email || currentUser?.userId || 'N/A'}</div>
                        <div className="flex items-center gap-2 mt-1">
                             <span className={`px-2 py-0.5 rounded text-xs font-bold ${verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' : verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                 {verificationStatus}
                             </span>
                             <span className="text-xs text-slate-400">ID: {profile?.agentId || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider border-b border-slate-100 pb-2">Personal Details</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="text-slate-500 mb-1">Email</div>
                                <div className="font-medium">{currentUser?.email || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-slate-500 mb-1">Phone</div>
                                <div className="font-medium">{currentUser?.phone || currentUser?.phoneNumber || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-slate-500 mb-1">Blood Group</div>
                                <div className="font-medium">{profile?.bloodType || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-slate-500 mb-1">Organ Donor</div>
                                <div className="font-medium">{profile?.organDonor ? 'Yes' : 'No'}</div>
                            </div>
                            <div className="col-span-2">
                                <div className="text-slate-500 mb-1">Vehicle Details</div>
                                <div className="font-medium">Vehicle: {profile?.vehicleNumber || 'N/A'} | RC: {profile?.rcBookNumber || 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider border-b border-slate-100 pb-2">Work & Performance</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                             <div>
                                <div className="text-slate-500 mb-1">Shift Timing</div>
                                <div className="font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block">
                                    {profile?.shiftTiming || 'Flexible'}
                                </div>
                            </div>
                             <div>
                                <div className="text-slate-500 mb-1">Joining Date</div>
                                <div className="font-medium">{joinedOn}</div>
                            </div>
                             <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="text-slate-500 mb-1">Customer Rating</div>
                                <div className="font-bold text-lg text-emerald-600 flex items-center gap-1">
                                    {averageRating.toFixed(1)} / 5.0
                                    <span className="text-xs font-normal text-slate-400">({totalRatings} ratings)</span>
                                </div>
                            </div>
                             <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="text-slate-500 mb-1">Success Rate</div>
                                <div className="font-bold text-lg text-slate-900">
                                    {Number(profile?.successRate || 0).toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200">
                     <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider mb-4">Uploaded Documents</h4>
                     <div className="grid md:grid-cols-2 gap-4">
                         {[
                            { label: 'Profile', key: 'profilePhoto', dbKey: 'profileImage' },
                            { label: 'Aadhaar', key: 'aadharCopy' },
                            { label: 'License', key: 'licenseCopy' },
                            { label: 'RC Book', key: 'rcBookCopy' }
                         ].map((doc) => {
                             const hasDoc = docs?.[doc.key] || (doc.dbKey ? profile?.[doc.dbKey] : null);
                             return (
                                 <div key={doc.label} className={`p-3 rounded-lg border ${hasDoc ? 'bg-white border-green-200' : 'bg-slate-100 border-slate-200'}`}>
                                     <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                          <FileText className={`w-4 h-4 ${hasDoc ? 'text-green-700' : 'text-slate-400'}`} />
                                          <span className={`text-sm font-medium ${hasDoc ? 'text-green-700' : 'text-slate-500'}`}>{doc.label}</span>
                                          {hasDoc && <CheckCircle className="w-3 h-3 text-green-700" />}
                                        </div>
                                        {hasDoc && (
                                          <a
                                            href={hasDoc}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-indigo-600 hover:underline"
                                          >
                                            View
                                          </a>
                                        )}
                                     </div>
                                     <label className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 cursor-pointer">
                                        <Upload className="w-3.5 h-3.5" />
                                        {isSavingDocs ? 'Uploading...' : `Upload ${doc.label}`}
                                        <input
                                          type="file"
                                          accept=".jpg,.jpeg,.png,.pdf"
                                          className="hidden"
                                          onChange={(e) => handleDocUpload(doc.key, e.target.files?.[0])}
                                        />
                                     </label>
                                 </div>
                             )
                         })}
                     </div>
                </div>
            </div>
         </div>
    );
}

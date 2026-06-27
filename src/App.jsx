import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShipmentProvider, useShipment } from './context/ShipmentContext';
import { ContactPage } from './components/customer-page/ContactPage';
import { Homepage } from './components/other/Homepage';
import { LoginPage } from './components/other/LoginPage';
import { RegistrationPage } from './components/other/RegistrationPage';
import { ForgotPasswordPage } from './components/other/ForgotPasswordPage';
import { TrackingPortal } from './components/other/TrackingPortal';
import { AboutPage } from './components/other/AboutPage';
import { TermsPage } from './components/other/TermsPage';
import { PrivacyPage } from './components/other/PrivacyPage';

import { DashboardLayout } from './components/layout/DashboardLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { AnimatedPage } from './components/layout/AnimatedPage';

import { CustomerDashboard } from './components/customer-page/CustomerDashboard';
import { AdminDashboard } from './components/admin-page/AdminDashboard';
import { AgentDashboard } from './components/agent-page/AgentDashboard';

import { BookingForm } from './components/customer-page/BookingForm';
import { MyShipments } from './components/customer-page/MyShipments';
import { Payments } from './components/customer-page/Payments';
import { InvoicePage } from './components/customer-page/InvoicePage';
import { SupportPage } from './components/customer-page/SupportPage';
import { SettingsPage } from './components/shared/SettingsPage';

import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Users, 
  Truck, 
  IndianRupee, 
  Building2, 
  TrendingUp,
  Package,
  PlusCircle,
  CreditCard,
  Scan,
  FileText,
  Bell,
  Printer,
  LifeBuoy,
  MessageSquare
} from 'lucide-react';

function ProtectedRoute({ children, allowedRole }) {
  const { currentUser, isLoading, activeRole } = useShipment();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const effectiveRole = activeRole || currentUser.role;

  if (allowedRole) {
    if (allowedRole === 'admin') {
      if (currentUser.role !== 'admin') return <Navigate to="/" replace />;
      return children;
    }

    if (allowedRole === 'agent') {
      if (currentUser.role !== 'agent') return <Navigate to="/dashboard" replace />;
      if (effectiveRole !== 'agent') return <Navigate to="/dashboard" replace />;
      return children;
    }

    if (allowedRole === 'customer') {
      if (currentUser.role === 'customer') return children;
      if (currentUser.role === 'agent' && effectiveRole === 'customer') return children;
      return <Navigate to="/agent" replace />;
    }
  }

  return children;
}

function AppRoutes() {
  const { currentUser, logout, activeRole } = useShipment();
  const effectiveRole = activeRole || currentUser?.role;

  const customerSidebar = [
    { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { path: '/dashboard/book', label: 'Book Shipment', icon: PlusCircle },
    { path: '/dashboard/shipments', label: 'My Shipments', icon: Package },
    { path: '/dashboard/payments', label: 'Payments', icon: CreditCard },
    { path: '/dashboard/support', label: 'Support', icon: LifeBuoy },
  ];

  const adminSidebar = [
    { path: '/admin', label: 'Overview', icon: LayoutDashboard },
    { path: '/admin/branches', label: 'Branches', icon: Building2 },
    { path: '/admin/fleet', label: 'Fleet', icon: Truck },
    { path: '/admin/staff', label: 'Staff', icon: Users },
    { path: '/admin/pricing', label: 'Pricing', icon: IndianRupee },
    { path: '/admin/shipments', label: 'Shipments', icon: Package },
    { path: '/admin/runsheets', label: 'Runsheets', icon: Package },
    { path: '/admin/tickets', label: 'Tickets', icon: MessageSquare },
    { path: '/admin/performance', label: 'Analytics', icon: TrendingUp },
    { path: '/admin/reports', label: 'Reports', icon: FileText },
  ];

  const agentSidebar = [
    { path: '/agent', label: 'Overview', icon: LayoutDashboard },
    { path: '/agent/quick-book', label: 'Quick Book', icon: Package },
    { path: '/agent/scan', label: 'Scan Parcels', icon: Scan },
    { path: '/agent/runsheets', label: 'Run Sheets', icon: FileText },
    { path: '/agent/cash', label: 'Cash Collection', icon: IndianRupee },
    { path: '/agent/notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <Routes>
        <Route path="/" element={<AnimatedPage><Homepage /></AnimatedPage>} />
        <Route path="/login" element={<AnimatedPage><LoginPage /></AnimatedPage>} />
        <Route path="/register" element={<AnimatedPage><RegistrationPage /></AnimatedPage>} />
        <Route path="/signup" element={<AnimatedPage><RegistrationPage /></AnimatedPage>} />
        <Route path="/forgot-password" element={<AnimatedPage><ForgotPasswordPage /></AnimatedPage>} />
        <Route path="/track" element={<AnimatedPage><TrackingPortal /></AnimatedPage>} />
        
        {/* Public Pages with Layout */}
        <Route element={<PublicLayout />}>
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>

        <Route path="/dashboard" element={
          <ProtectedRoute allowedRole="customer">
            <DashboardLayout user={currentUser} onLogout={logout} sidebarItems={customerSidebar} />
          </ProtectedRoute>
        }>
          <Route index element={<CustomerDashboard />} />
          <Route path="book" element={<BookingForm />} />
          <Route path="shipments" element={<MyShipments />} />
          <Route path="payments" element={<Payments />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="invoice/:id" element={<InvoicePage />} />
        </Route>

        <Route path="/admin" element={
          <ProtectedRoute allowedRole="admin">
            <DashboardLayout user={currentUser} onLogout={logout} sidebarItems={adminSidebar} />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard view="overview" />} />
          <Route path="branches" element={<AdminDashboard view="branches" />} />
          <Route path="fleet" element={<AdminDashboard view="fleet" />} />
          <Route path="staff" element={<AdminDashboard view="staff" />} />
          <Route path="pricing" element={<AdminDashboard view="pricing" />} />
          <Route path="shipments" element={<AdminDashboard view="shipments" />} />
          <Route path="runsheets" element={<AdminDashboard view="runsheets" />} />
          <Route path="tickets" element={<AdminDashboard view="tickets" />} />
          <Route path="performance" element={<AdminDashboard view="performance" />} />
          <Route path="reports" element={<AdminDashboard view="reports" />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="/agent" element={
          <ProtectedRoute allowedRole="agent">
            <DashboardLayout user={currentUser} onLogout={logout} sidebarItems={agentSidebar} />
          </ProtectedRoute>
        }>
          <Route index element={<AgentDashboard view="overview" />} />
          <Route path="quick-book" element={<AgentDashboard view="quick-book" />} />
          <Route path="scan" element={<AgentDashboard view="scan" />} />
          <Route path="runsheets" element={<AgentDashboard view="runsheets" />} />
          <Route path="cash" element={<AgentDashboard view="cash" />} />
          <Route path="notifications" element={<AgentDashboard view="notifications" />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={
          currentUser
            ? <Navigate to={effectiveRole === 'admin' ? '/admin' : effectiveRole === 'agent' ? '/agent' : '/dashboard'} replace />
            : <Navigate to="/" replace />
        } />
      </Routes>
  );
}

function App() {
  return (
    <ShipmentProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ShipmentProvider>
  );
}

export default App;

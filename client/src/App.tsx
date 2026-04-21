import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';

import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import PendingPaymentPage from '@/pages/PendingPaymentPage';
import DashboardPage from '@/pages/DashboardPage';
import EventsPage from '@/pages/EventsPage';
import CreateEventPage from '@/pages/CreateEventPage';
import EventDetailPage from '@/pages/EventDetailPage';
import EditEventPage from '@/pages/EditEventPage';
import InvitationsPage from '@/pages/InvitationsPage';
import UpgradePage from '@/pages/UpgradePage';
import RsvpPage from '@/pages/RsvpPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import AdminPlansPage from '@/pages/AdminPlansPage';
import AdminTemplatesPage from '@/pages/AdminTemplatesPage';
import AdminSettingsPage from '@/pages/AdminSettingsPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/pending-payment" element={<PendingPaymentPage />} />
            <Route path="/rsvp/:token" element={<RsvpPage />} />

            {/* Protected */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
            <Route path="/events/new" element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
            <Route path="/events/:id" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
            <Route path="/events/:id/edit" element={<ProtectedRoute><EditEventPage /></ProtectedRoute>} />
            <Route path="/invitations" element={<ProtectedRoute><InvitationsPage /></ProtectedRoute>} />
            <Route path="/upgrade" element={<ProtectedRoute><UpgradePage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboardPage /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsersPage /></ProtectedRoute>} />
            <Route path="/admin/plans" element={<ProtectedRoute adminOnly><AdminPlansPage /></ProtectedRoute>} />
            <Route path="/admin/templates" element={<ProtectedRoute adminOnly><AdminTemplatesPage /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminSettingsPage /></ProtectedRoute>} />

            {/* Default */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

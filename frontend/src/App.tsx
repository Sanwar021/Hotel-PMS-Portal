import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { AppLayout } from './components/layout/AppLayout';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';

import { LoginPage } from './pages/login/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { FrontDeskPage } from './pages/frontdesk/FrontDeskPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { ReservationsPage } from './pages/reservations/ReservationsPage';
import { RoomsPage } from './pages/rooms/RoomsPage';
import { HousekeepingPage } from './pages/housekeeping/HousekeepingPage';
import { GuestsPage } from './pages/guests/GuestsPage';
import { RestaurantPage } from './pages/restaurant/RestaurantPage';
import { FinancePage } from './pages/finance/FinancePage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { ProcurementPage } from './pages/procurement/ProcurementPage';
import { MaintenancePage } from './pages/maintenance/MaintenancePage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { RevenuePage } from './pages/revenue/RevenuePage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hotel-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hotel-accent border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppErrorBoundary>{children}</AppErrorBoundary>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Operations Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/frontdesk" element={<FrontDeskPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/reservations" element={<ReservationsPage />} />
                <Route path="/rooms" element={<RoomsPage />} />
                <Route path="/housekeeping" element={<HousekeepingPage />} />
                <Route path="/guests" element={<GuestsPage />} />
                <Route path="/restaurant" element={<RestaurantPage />} />
                <Route path="/finance" element={<FinancePage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/procurement" element={<ProcurementPage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/revenue" element={<RevenuePage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

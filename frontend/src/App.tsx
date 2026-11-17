import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';

const LoginPage = lazy(() => import('./pages/login/LoginPage').then((module) => ({ default: module.LoginPage })));
const AppLayout = lazy(() => import('./components/layout/AppLayout').then((module) => ({ default: module.AppLayout })));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const FrontDeskPage = lazy(() => import('./pages/frontdesk/FrontDeskPage').then((module) => ({ default: module.FrontDeskPage })));
const CalendarPage = lazy(() => import('./pages/calendar/CalendarPage').then((module) => ({ default: module.CalendarPage })));
const ReservationsPage = lazy(() => import('./pages/reservations/ReservationsPage').then((module) => ({ default: module.ReservationsPage })));
const RoomsPage = lazy(() => import('./pages/rooms/RoomsPage').then((module) => ({ default: module.RoomsPage })));
const HousekeepingPage = lazy(() => import('./pages/housekeeping/HousekeepingPage').then((module) => ({ default: module.HousekeepingPage })));
const GuestsPage = lazy(() => import('./pages/guests/GuestsPage').then((module) => ({ default: module.GuestsPage })));
const RestaurantPage = lazy(() => import('./pages/restaurant/RestaurantPage').then((module) => ({ default: module.RestaurantPage })));
const FinancePage = lazy(() => import('./pages/finance/FinancePage').then((module) => ({ default: module.FinancePage })));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage').then((module) => ({ default: module.InventoryPage })));
const ProcurementPage = lazy(() => import('./pages/procurement/ProcurementPage').then((module) => ({ default: module.ProcurementPage })));
const MaintenancePage = lazy(() => import('./pages/maintenance/MaintenancePage').then((module) => ({ default: module.MaintenancePage })));
const EmployeesPage = lazy(() => import('./pages/employees/EmployeesPage').then((module) => ({ default: module.EmployeesPage })));
const RevenuePage = lazy(() => import('./pages/revenue/RevenuePage').then((module) => ({ default: module.RevenuePage })));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));

const PageLoader = () => (
  <div className="flex min-h-[45vh] items-center justify-center" role="status" aria-label="Loading page">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-hotel-accent border-t-transparent" />
  </div>
);

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
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
    </ThemeProvider>
  );
}

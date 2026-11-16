export const preloadDashboard = () => Promise.all([
  import('./components/layout/AppLayout'),
  import('./pages/dashboard/DashboardPage'),
]);

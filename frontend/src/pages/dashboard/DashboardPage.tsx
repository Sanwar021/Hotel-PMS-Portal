import React, { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BedDouble,
  DoorOpen,
  CalendarCheck,
  Sparkles,
  Wrench,
  DollarSign,
  TrendingUp,
  Percent,
  Clock,
  ArrowRight,
  ArrowUpRight,
  LogOut,
  Calendar,
} from 'lucide-react';
import { dashboardApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Link } from 'react-router-dom';
const DashboardCharts = lazy(() => import('./DashboardCharts').then((module) => ({ default: module.DashboardCharts })));

export const DashboardPage: React.FC = () => {
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month'>('today');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', dateFilter],
    queryFn: dashboardApi.getStats,
    refetchInterval: 15000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-hotel-accent border-t-transparent" />
          <span className="text-xs text-hotel-muted font-medium">Loading HotelOS metrics...</span>
        </div>
      </div>
    );
  }

  const { stats, revenue_trend, source_breakdown, recent_reservations, upcoming_arrivals, upcoming_departures } = data;

  return (
    <div className="dashboard-glass space-y-6">
      {/* Page Header */}
      <PageHeader
        kicker="Executive Hotel Control Center"
        title="Operations Dashboard"
        description="Real-time occupancy metrics, live room turnover states, and consolidated financial telemetry for HotelOS Grand Residence."
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-hotel-line bg-white/[0.02] p-1">
            <button
              onClick={() => setDateFilter('today')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                dateFilter === 'today'
                  ? 'bg-hotel-accent text-[#14110f] font-bold shadow'
                  : 'text-hotel-muted hover:text-hotel-text'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                dateFilter === '7days'
                  ? 'bg-hotel-accent text-[#14110f] font-bold shadow'
                  : 'text-hotel-muted hover:text-hotel-text'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                dateFilter === 'month'
                  ? 'bg-hotel-accent text-[#14110f] font-bold shadow'
                  : 'text-hotel-muted hover:text-hotel-text'
              }`}
            >
              This Month
            </button>
          </div>
        }
      />

      {/* Row 1: Primary Key Performance Indicators */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Occupancy Rate"
          value={`${stats.occupancy_percentage.toFixed(1)}%`}
          subtitle={`${stats.occupied_rooms} of ${stats.total_rooms} rooms filled`}
          icon={Percent}
          variant="amber"
          trend={{ value: '4.2% vs last week', isPositive: true }}
        />
        <StatCard
          title="Average Daily Rate (ADR)"
          value={`${Math.round(stats.adr).toLocaleString()} BDT`}
          subtitle="Revenue per sold room"
          icon={TrendingUp}
          variant="gold"
          trend={{ value: '8.5% yield', isPositive: true }}
        />
        <StatCard
          title="RevPAR"
          value={`${Math.round(stats.revpar).toLocaleString()} BDT`}
          subtitle="Revenue per available room"
          icon={DollarSign}
          variant="emerald"
        />
        <StatCard
          title="Today's Revenue"
          value={`${stats.today_revenue.toLocaleString()} BDT`}
          subtitle={`Monthly: ${stats.monthly_revenue.toLocaleString()} BDT`}
          icon={DollarSign}
          variant="emerald"
        />
      </div>

      {/* Row 2: Secondary Operational Statuses */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-hotel-line bg-hotel-panel p-3.5">
          <div className="flex items-center justify-between text-hotel-muted text-[11px]">
            <span>Available</span>
            <DoorOpen className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 font-serif text-2xl font-bold text-emerald-400">
            {stats.available_rooms}
          </div>
          <span className="text-[10px] text-hotel-muted">Ready for booking</span>
        </div>

        <div className="rounded-xl border border-hotel-line bg-hotel-panel p-3.5">
          <div className="flex items-center justify-between text-hotel-muted text-[11px]">
            <span>Occupied</span>
            <BedDouble className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 font-serif text-2xl font-bold text-purple-300">
            {stats.occupied_rooms}
          </div>
          <span className="text-[10px] text-hotel-muted">{stats.current_guests} In-house guests</span>
        </div>

        <div className="rounded-xl border border-hotel-line bg-hotel-panel p-3.5">
          <div className="flex items-center justify-between text-hotel-muted text-[11px]">
            <span>Reserved</span>
            <CalendarCheck className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 font-serif text-2xl font-bold text-sky-400">
            {stats.reserved_rooms}
          </div>
          <span className="text-[10px] text-hotel-muted">Upcoming arrivals</span>
        </div>

        <div className="rounded-xl border border-hotel-line bg-hotel-panel p-3.5">
          <div className="flex items-center justify-between text-hotel-muted text-[11px]">
            <span>Dirty Rooms</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 font-serif text-2xl font-bold text-amber-400">
            {stats.dirty_rooms}
          </div>
          <span className="text-[10px] text-hotel-muted">Requires turnover</span>
        </div>

        <div className="rounded-xl border border-hotel-line bg-hotel-panel p-3.5">
          <div className="flex items-center justify-between text-hotel-muted text-[11px]">
            <span>Today's Check-ins</span>
            <Calendar className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 font-serif text-2xl font-bold text-indigo-300">
            {stats.today_check_ins}
          </div>
          <span className="text-[10px] text-hotel-muted">Front desk arrivals</span>
        </div>

        <div className="rounded-xl border border-hotel-line bg-hotel-panel p-3.5">
          <div className="flex items-center justify-between text-hotel-muted text-[11px]">
            <span>Maintenance</span>
            <Wrench className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 font-serif text-2xl font-bold text-rose-400">
            {stats.maintenance_rooms}
          </div>
          <span className="text-[10px] text-hotel-muted">Service work orders</span>
        </div>
      </div>

      <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl" aria-label="Loading analytics" />}>
        <DashboardCharts revenueTrend={revenue_trend} sourceBreakdown={source_breakdown} />
      </Suspense>

      {/* Row 4: Front Desk Quick Glance Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Arrivals */}
        <div className="rounded-2xl border border-hotel-line bg-hotel-panel p-6">
          <div className="flex items-center justify-between border-b border-hotel-line pb-4">
            <div>
              <span className="kicker">Arrivals Manifest</span>
              <h3 className="font-serif text-lg font-medium text-hotel-text">
                Incoming Guest Arrivals
              </h3>
            </div>
            <Link
              to="/frontdesk"
              className="flex items-center gap-1 text-xs text-hotel-gold hover:text-hotel-accent transition-colors"
            >
              <span>Front Desk</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-hotel-line">
            {upcoming_arrivals.length === 0 ? (
              <p className="py-6 text-center text-xs text-hotel-muted">No pending arrivals today</p>
            ) : (
              upcoming_arrivals.map((arr) => (
                <div key={arr.id} className="flex items-center justify-between py-3 text-xs">
                  <div>
                    <div className="font-semibold text-hotel-text">
                      {arr.guest?.first_name} {arr.guest?.last_name}
                    </div>
                    <div className="text-[11px] text-hotel-muted">
                      {arr.room_type?.name} • {arr.nights} Nights
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-serif text-xs font-semibold text-hotel-gold">
                      {arr.total_amount.toLocaleString()} BDT
                    </span>
                    <div className="text-[10px] text-hotel-muted">
                      {arr.check_in_date.split('T')[0]}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Departures */}
        <div className="rounded-2xl border border-hotel-line bg-hotel-panel p-6">
          <div className="flex items-center justify-between border-b border-hotel-line pb-4">
            <div>
              <span className="kicker">Departures Manifest</span>
              <h3 className="font-serif text-lg font-medium text-hotel-text">
                Scheduled Check-Outs
              </h3>
            </div>
            <Link
              to="/frontdesk"
              className="flex items-center gap-1 text-xs text-hotel-gold hover:text-hotel-accent transition-colors"
            >
              <span>Departures List</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-hotel-line">
            {upcoming_departures.length === 0 ? (
              <p className="py-6 text-center text-xs text-hotel-muted">No departures scheduled</p>
            ) : (
              upcoming_departures.map((dep) => (
                <div key={dep.id} className="flex items-center justify-between py-3 text-xs">
                  <div>
                    <div className="font-semibold text-hotel-text">
                      {dep.guest?.first_name} {dep.guest?.last_name}
                    </div>
                    <div className="text-[11px] text-hotel-muted">
                      Room {dep.room?.room_number || 'TBD'} • Checkout 11:00 AM
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status="occupied" size="sm" />
                    <div className="mt-1 text-[10px] text-hotel-muted">
                      Folio balance: {(dep.total_amount - dep.paid_amount).toLocaleString()} BDT
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 5: Recent Reservations Table */}
      <div className="rounded-2xl border border-hotel-line bg-hotel-panel p-6">
        <div className="flex items-center justify-between border-b border-hotel-line pb-4">
          <div>
            <span className="kicker">Master Ledger</span>
            <h3 className="font-serif text-lg font-medium text-hotel-text">
              Recent Reservations
            </h3>
          </div>
          <Link
            to="/reservations"
            className="flex items-center gap-1 text-xs text-hotel-gold hover:text-hotel-accent transition-colors"
          >
            <span>View All Bookings</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-hotel-line text-[11px] text-hotel-muted uppercase tracking-wider">
                <th className="pb-3 font-medium">Reservation #</th>
                <th className="pb-3 font-medium">Guest</th>
                <th className="pb-3 font-medium">Room Category</th>
                <th className="pb-3 font-medium">Stay Dates</th>
                <th className="pb-3 font-medium">Source</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Total (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hotel-line">
              {recent_reservations.map((res) => (
                <tr key={res.id} className="hover:bg-[#f7f8f4] transition-colors">
                  <td className="py-3 font-medium text-hotel-accent">
                    {res.reservation_number}
                  </td>
                  <td className="py-3">
                    <div className="font-semibold text-hotel-text">
                      {res.guest?.first_name} {res.guest?.last_name}
                    </div>
                    <div className="text-[10px] text-hotel-muted">{res.guest?.email}</div>
                  </td>
                  <td className="py-3 text-hotel-muted">
                    {res.room_type?.name} {res.room && `(Room ${res.room.room_number})`}
                  </td>
                  <td className="py-3 text-hotel-muted">
                    {res.check_in_date.split('T')[0]} → {res.check_out_date.split('T')[0]} ({res.nights}n)
                  </td>
                  <td className="py-3 capitalize text-hotel-muted">
                    {res.booking_source}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={res.status} type="reservation" size="sm" />
                  </td>
                  <td className="py-3 text-right font-serif font-semibold text-hotel-text">
                    {res.total_amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


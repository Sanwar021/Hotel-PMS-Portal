import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Percent,
  DollarSign,
  Tag,
  CheckCircle,
  HelpCircle,
  Calendar,
} from 'lucide-react';
import { dashboardApi, roomsApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';

export const RevenuePage: React.FC = () => {
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getStats,
  });

  const { data: roomTypes = [] } = useQuery({
    queryKey: ['room_types'],
    queryFn: roomsApi.getRoomTypes,
  });

  const stats = dashboardData?.stats;

  const ratePlans = [
    {
      name: 'Best Available Rate (BAR - Room Only)',
      code: 'BAR-RO',
      mealPlan: 'Room Only',
      modifier: 'Standard base tariff',
      cancellation: 'Flexible up to 24h prior to check-in',
      channel: 'Direct, OTA, Telephone',
      active: true,
    },
    {
      name: 'Bed & Breakfast Gourmet Experience',
      code: 'BAR-BB',
      mealPlan: 'Bed & Breakfast',
      modifier: '+12% markup (Buffet breakfast included)',
      cancellation: 'Flexible up to 24h',
      channel: 'Website & Direct',
      active: true,
    },
    {
      name: 'Corporate Preferred Tariff',
      code: 'CORP-EXEC',
      mealPlan: 'Bed & Breakfast',
      modifier: '15% negotiated discount',
      cancellation: 'Flexible up to 12h',
      channel: 'Corporate Contracts',
      active: true,
    },
    {
      name: 'Half Board Culinary Package',
      code: 'HB-PACKAGE',
      mealPlan: 'Half Board',
      modifier: '+25% markup (Dinner & Breakfast included)',
      cancellation: 'Non-refundable tariff',
      channel: 'Direct Booking Portal',
      active: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Yield & Revenue Optimization"
        title="Revenue Management & Tariff Strategies"
        description="Dynamic pricing structures, rate plan distribution channels, and revenue metrics (ADR, RevPAR, Yield)."
      />

      {/* Revenue Formula KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Average Daily Rate (ADR)"
          value={`${Math.round(stats?.adr || 0).toLocaleString()} BDT`}
          subtitle="Formula: Room Revenue ÷ Rooms Sold"
          icon={TrendingUp}
          variant="gold"
        />
        <StatCard
          title="RevPAR (Revenue Per Available Room)"
          value={`${Math.round(stats?.revpar || 0).toLocaleString()} BDT`}
          subtitle="Formula: Room Revenue ÷ Total Sellable Inventory"
          icon={DollarSign}
          variant="amber"
        />
        <StatCard
          title="Occupancy Yield"
          value={`${(stats?.occupancy_percentage || 0).toFixed(1)}%`}
          subtitle="Formula: (Occupied ÷ Total Rooms) × 100"
          icon={Percent}
          variant="emerald"
        />
      </div>

      {/* Rate Plans Table */}
      <div className="rounded-2xl border border-hotel-line bg-hotel-panel p-6">
        <div className="flex items-center justify-between border-b border-hotel-line pb-4">
          <div>
            <span className="kicker">Tariff Architecture</span>
            <h3 className="font-serif text-lg font-bold text-hotel-text">Active Rate Plans</h3>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-hotel-line text-[11px] text-hotel-muted uppercase tracking-wider">
                <th className="pb-3 font-medium">Plan Name</th>
                <th className="pb-3 font-medium">Meal Plan</th>
                <th className="pb-3 font-medium">Pricing Modifier</th>
                <th className="pb-3 font-medium">Cancellation Terms</th>
                <th className="pb-3 font-medium">Channels</th>
                <th className="pb-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hotel-line">
              {ratePlans.map((plan) => (
                <tr key={plan.code} className="hover:bg-[#f7f8f4] transition-colors">
                  <td className="py-3.5">
                    <div className="font-semibold text-hotel-text">{plan.name}</div>
                    <div className="font-mono text-[10px] text-hotel-accent">{plan.code}</div>
                  </td>
                  <td className="py-3.5 text-hotel-gold font-medium">{plan.mealPlan}</td>
                  <td className="py-3.5 text-hotel-muted">{plan.modifier}</td>
                  <td className="py-3.5 text-hotel-muted">{plan.cancellation}</td>
                  <td className="py-3.5 text-hotel-muted">{plan.channel}</td>
                  <td className="py-3.5 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Room Category Pricing Matrix */}
      <div className="rounded-2xl border border-hotel-line bg-hotel-panel p-6">
        <div className="border-b border-hotel-line pb-4">
          <span className="kicker">Room Inventory Grid</span>
          <h3 className="font-serif text-lg font-bold text-hotel-text">Base & Weekend Pricing Matrix</h3>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roomTypes.map((rt) => (
            <div
              key={rt.id}
              className="rounded-xl border border-hotel-line bg-white/[0.02] p-4 text-xs space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-serif text-base font-bold text-hotel-text">{rt.name}</h4>
                  <span className="text-[10px] text-hotel-muted font-mono">{rt.code}</span>
                </div>
                <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-hotel-gold">
                  {rt.bed_type}
                </span>
              </div>

              <div className="border-t border-hotel-line pt-2 space-y-1">
                <div className="flex justify-between text-hotel-muted">
                  <span>Weekday Tariff:</span>
                  <span className="font-serif font-bold text-hotel-text">
                    {rt.base_price.toLocaleString()} BDT
                  </span>
                </div>
                <div className="flex justify-between text-hotel-muted">
                  <span>Weekend Tariff:</span>
                  <span className="font-serif font-bold text-hotel-gold">
                    {rt.weekend_price.toLocaleString()} BDT
                  </span>
                </div>
                <div className="flex justify-between text-hotel-muted text-[10px]">
                  <span>Max Capacity:</span>
                  <span>{rt.max_occupancy} Guests</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


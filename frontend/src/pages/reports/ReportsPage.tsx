import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileBarChart2,
  Printer,
  Calendar,
  Download,
  DollarSign,
  BedDouble,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { reportsApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';

export const ReportsPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const { data: report, isLoading } = useQuery({
    queryKey: ['daily_business_report', selectedDate],
    queryFn: () => reportsApi.getDailyBusinessReport(selectedDate),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Management Audit & Intelligence"
        title="Reports & Analytics Center"
        description="Consolidated Night Audit business reports, revenue reconciliation, room turnover rates, and statutory VAT compliance figures."
        actions={
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-hotel-line bg-hotel-panel px-3 py-1.5 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
            />
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-4 py-2 text-xs font-bold text-[#14110f] hover:opacity-95 transition-opacity"
            >
              <Printer className="h-4 w-4" />
              <span>Print Audit Report</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      {report && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Occupancy Ratio"
            value={`${report.occupancy_rate.toFixed(1)}%`}
            subtitle={`${report.rooms_sold} of ${report.total_rooms} rooms sold`}
            icon={Percent}
            variant="amber"
          />
          <StatCard
            title="Total Room Revenue"
            value={`${report.total_room_revenue.toLocaleString()} BDT`}
            subtitle="Accommodation charges"
            icon={DollarSign}
            variant="gold"
          />
          <StatCard
            title="F&B Dining Revenue"
            value={`${report.total_fb_revenue.toLocaleString()} BDT`}
            subtitle="Restaurant & Room Service"
            icon={DollarSign}
            variant="sapphire"
          />
          <StatCard
            title="Collected Payments"
            value={`${report.total_payments.toLocaleString()} BDT`}
            subtitle={`VAT: ${report.total_tax_collected.toLocaleString()} BDT`}
            icon={TrendingUp}
            variant="emerald"
          />
        </div>
      )}

      {/* Report Summary Manifest */}
      {report && (
        <div className="rounded-2xl border border-hotel-line bg-hotel-panel p-6 space-y-6">
          <div className="flex items-start justify-between border-b border-hotel-line pb-4">
            <div>
              <span className="kicker">Official Daily Audit</span>
              <h3 className="font-serif text-xl font-bold text-hotel-text">
                HotelOS Grand Residence — Daily Operations Summary
              </h3>
              <p className="text-xs text-hotel-muted mt-0.5">
                Audit Cycle: {report.report_date} (00:00 to 23:59 BST)
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-hotel-muted uppercase font-bold">System Status</span>
              <div className="text-emerald-400 font-semibold text-xs mt-0.5">Audit Balanced</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Rooms Telemetry */}
            <div className="rounded-xl border border-hotel-line bg-white/[0.02] p-4 text-xs space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-hotel-gold block">
                Rooms & Occupancy Ledger
              </span>

              <div className="flex justify-between py-1 text-hotel-muted border-b border-white/4">
                <span>Total Physical Inventory:</span>
                <span className="font-semibold text-hotel-text">{report.total_rooms} Rooms</span>
              </div>
              <div className="flex justify-between py-1 text-hotel-muted border-b border-white/4">
                <span>Rooms Sold / Occupied:</span>
                <span className="font-semibold text-hotel-accent">{report.rooms_sold} Rooms</span>
              </div>
              <div className="flex justify-between py-1 text-hotel-muted border-b border-white/4">
                <span>Available Sellable Inventory:</span>
                <span className="font-semibold text-emerald-400">{report.available_rooms} Rooms</span>
              </div>
              <div className="flex justify-between py-1 text-hotel-muted border-b border-white/4">
                <span>Daily Check-Ins Recorded:</span>
                <span className="font-semibold text-hotel-text">{report.check_ins_count} Guests</span>
              </div>
              <div className="flex justify-between py-1 text-hotel-muted border-b border-white/4">
                <span>Daily Check-Outs Settled:</span>
                <span className="font-semibold text-hotel-text">{report.check_outs_count} Guests</span>
              </div>
              <div className="flex justify-between py-1 text-hotel-muted">
                <span>Total In-House Guests:</span>
                <span className="font-semibold text-hotel-gold">{report.in_house_guests_count} Patrons</span>
              </div>
            </div>

            {/* Financial Telemetry */}
            <div className="rounded-xl border border-hotel-line bg-white/[0.02] p-4 text-xs space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-hotel-gold block">
                Financial Telemetry & Taxes
              </span>

              <div className="flex justify-between py-1 text-hotel-muted border-b border-white/4">
                <span>Total Room Accommodation Revenue:</span>
                <span className="font-serif font-semibold text-hotel-text">
                  {report.total_room_revenue.toLocaleString()} BDT
                </span>
              </div>
              <div className="flex justify-between py-1 text-hotel-muted border-b border-white/4">
                <span>Food & Beverage Net Revenue:</span>
                <span className="font-serif font-semibold text-hotel-text">
                  {report.total_fb_revenue.toLocaleString()} BDT
                </span>
              </div>
              <div className="flex justify-between py-1 text-hotel-muted border-b border-white/4">
                <span>Average Daily Rate (ADR):</span>
                <span className="font-serif font-bold text-hotel-gold">
                  {Math.round(report.adr).toLocaleString()} BDT
                </span>
              </div>
              <div className="flex justify-between py-1 text-hotel-muted border-b border-white/4">
                <span>RevPAR:</span>
                <span className="font-serif font-bold text-hotel-gold">
                  {Math.round(report.revpar).toLocaleString()} BDT
                </span>
              </div>
              <div className="flex justify-between py-1 text-hotel-muted border-b border-white/4">
                <span>Statutory Government VAT Collected:</span>
                <span className="font-serif font-semibold text-hotel-accent">
                  {report.total_tax_collected.toLocaleString()} BDT
                </span>
              </div>
              <div className="flex justify-between py-1 text-emerald-400 font-semibold pt-1">
                <span>Net Payments Settled:</span>
                <span className="font-serif font-bold text-base">
                  {report.total_payments.toLocaleString()} BDT
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


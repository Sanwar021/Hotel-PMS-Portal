import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Building,
  Shield,
  FileText,
  Save,
  CheckCircle2,
  Clock,
  DollarSign,
  Percent,
} from 'lucide-react';
import { settingsApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { Hotel, AuditLogItem } from '../../types';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'hotel' | 'audit'>('hotel');

  const { data: hotel, isLoading } = useQuery({
    queryKey: ['hotel_settings'],
    queryFn: settingsApi.getHotel,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit_logs'],
    queryFn: settingsApi.getAuditLogs,
    enabled: activeTab === 'audit',
  });

  const [form, setForm] = useState({
    name: '',
    tagline: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    currency: 'BDT',
    taxRate: 15.0,
    serviceChargeRate: 10.0,
    checkInTime: '14:00',
    checkOutTime: '11:00',
  });

  useEffect(() => {
    if (hotel) {
      setForm({
        name: hotel.name,
        tagline: hotel.tagline,
        description: hotel.description,
        address: hotel.address,
        phone: hotel.phone,
        email: hotel.email,
        currency: hotel.currency,
        taxRate: hotel.tax_rate,
        serviceChargeRate: hotel.service_charge_rate,
        checkInTime: hotel.check_in_time,
        checkOutTime: hotel.check_out_time,
      });
    }
  }, [hotel]);

  const handleSaveHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await settingsApi.updateHotel({
        name: form.name,
        tagline: form.tagline,
        description: form.description,
        address: form.address,
        phone: form.phone,
        email: form.email,
        currency: form.currency,
        tax_rate: Number(form.taxRate),
        service_charge_rate: Number(form.serviceChargeRate),
        check_in_time: form.checkInTime,
        check_out_time: form.checkOutTime,
      });
      alert('Hotel configuration saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['hotel_settings'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update hotel settings');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="System Administration"
        title="Settings & Audit Trail"
        description="Configure property policies, legal business tax rates, check-in schedules, and inspect the tamper-evident system audit log."
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-hotel-line pb-4">
        <button
          onClick={() => setActiveTab('hotel')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === 'hotel'
              ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
              : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
          }`}
        >
          Hotel Profile & Policies
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === 'audit'
              ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
              : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
          }`}
        >
          System Audit Trail
        </button>
      </div>

      {activeTab === 'hotel' && (
        <form onSubmit={handleSaveHotel} className="space-y-6 max-w-4xl">
          <div className="rounded-2xl border border-hotel-line bg-hotel-panel p-6 space-y-4">
            <span className="kicker">Brand Identity</span>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-hotel-muted font-medium">Hotel Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-hotel-muted font-medium">Tagline</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="text-hotel-muted font-medium">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-hotel-line bg-hotel-panel p-6 space-y-4">
            <span className="kicker">Financial & Tax Policies</span>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-hotel-muted font-medium">Base Currency</label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-hotel-muted font-medium">Government VAT Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.taxRate}
                  onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-hotel-muted font-medium">Hospitality Service Charge (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.serviceChargeRate}
                  onChange={(e) => setForm({ ...form, serviceChargeRate: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-hotel-muted font-medium">Standard Check-In Time</label>
                <input
                  type="text"
                  value={form.checkInTime}
                  onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-hotel-muted font-medium">Standard Check-Out Time</label>
                <input
                  type="text"
                  value={form.checkOutTime}
                  onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-5 py-2.5 text-xs font-bold text-[#14110f] shadow hover:opacity-95 transition-opacity"
            >
              <Save className="h-4 w-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-hotel-line bg-hotel-panel overflow-hidden">
          <div className="p-4 border-b border-hotel-line">
            <span className="kicker">Security Log</span>
            <h3 className="font-serif text-lg font-bold text-hotel-text">
              Real-Time Audit Trail
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-hotel-line bg-white/[0.02] text-[11px] text-hotel-muted uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Timestamp</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                  <th className="py-3 px-4 font-medium">Target Entity</th>
                  <th className="py-3 px-4 font-medium">Details</th>
                  <th className="py-3 px-4 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hotel-line">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-hotel-muted">
                      No security audit events recorded.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#f7f8f4] transition-colors">
                      <td className="py-3 px-4 text-hotel-muted">{log.created_at}</td>
                      <td className="py-3 px-4 font-semibold text-hotel-accent uppercase text-[10px]">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 font-mono text-hotel-text">{log.entity_type}</td>
                      <td className="py-3 px-4 text-hotel-muted max-w-sm truncate">{log.details}</td>
                      <td className="py-3 px-4 text-hotel-gold">{log.user?.username || 'System'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};


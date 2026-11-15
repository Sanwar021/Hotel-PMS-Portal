import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  Search,
  Plus,
  Filter,
  XCircle,
  FileText,
  Printer,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { reservationsApi, roomsApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Reservation } from '../../types';

export const ReservationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['reservations', statusFilter, search],
    queryFn: () => reservationsApi.getReservations({ status: statusFilter, search }),
  });

  const handleOpenCancel = (res: Reservation) => {
    setSelectedRes(res);
    setCancelReason('Guest requested schedule change');
    setIsCancelModalOpen(true);
  };

  const handleExecuteCancel = async () => {
    if (!selectedRes) return;
    try {
      await reservationsApi.cancelReservation(selectedRes.id, cancelReason);
      setIsCancelModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Cancellation failed');
    }
  };

  const handleOpenVoucher = (res: Reservation) => {
    setSelectedRes(res);
    setIsVoucherModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Central Booking Engine"
        title="Reservations Management"
        description="Search, validate, and issue confirmed hotel booking vouchers with automated rate calculation and double-booking concurrency protection."
      />

      {/* Filters Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-hotel-line pb-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {['', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
                  : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
              }`}
            >
              {st === '' ? 'All Bookings' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-hotel-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search booking # or guest name..."
            className="w-full rounded-lg border border-hotel-line bg-white/[0.03] py-1.5 pl-8 pr-3 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Master Reservations Table */}
      <div className="rounded-2xl border border-hotel-line bg-hotel-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-hotel-line bg-white/[0.02] text-[11px] text-hotel-muted uppercase tracking-wider">
                <th className="py-3.5 px-4 font-medium">Reservation #</th>
                <th className="py-3.5 px-4 font-medium">Guest Profile</th>
                <th className="py-3.5 px-4 font-medium">Room & Type</th>
                <th className="py-3.5 px-4 font-medium">Check-In / Check-Out</th>
                <th className="py-3.5 px-4 font-medium">Rate Plan</th>
                <th className="py-3.5 px-4 font-medium">Status</th>
                <th className="py-3.5 px-4 font-medium text-right">Total Amount</th>
                <th className="py-3.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hotel-line">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-hotel-muted">
                    Loading reservations...
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-hotel-muted">
                    No reservations matching filter.
                  </td>
                </tr>
              ) : (
                reservations.map((res) => (
                  <tr key={res.id} className="hover:bg-[#f7f8f4] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-hotel-accent">
                      {res.reservation_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-hotel-text">
                        {res.guest?.first_name} {res.guest?.last_name}
                      </div>
                      <div className="text-[10px] text-hotel-muted">{res.guest?.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-hotel-text font-medium">{res.room_type?.name}</div>
                      <div className="text-[10px] text-hotel-gold">
                        {res.room ? `Room ${res.room.room_number}` : 'Unassigned'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-hotel-muted">
                      <div>
                        {res.check_in_date.split('T')[0]} → {res.check_out_date.split('T')[0]}
                      </div>
                      <div className="text-[10px] text-hotel-accent font-medium">
                        {res.nights} {res.nights === 1 ? 'night' : 'nights'} • {res.adults} Adults
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-hotel-muted">
                      {res.rate_plan?.name || 'Best Available Rate'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={res.status} type="reservation" size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right font-serif font-bold text-hotel-text">
                      {res.total_amount.toLocaleString()} BDT
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenVoucher(res)}
                          title="Print Voucher"
                          className="rounded-lg border border-hotel-line bg-white/[0.04] p-1.5 text-hotel-gold hover:bg-white/[0.08] transition-colors"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        {res.status !== 'cancelled' && res.status !== 'checked_out' && (
                          <button
                            onClick={() => handleOpenCancel(res)}
                            title="Cancel Booking"
                            className="rounded-lg border border-rose-500/30 bg-rose-950/40 p-1.5 text-rose-400 hover:bg-rose-900/40 transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINTABLE BOOKING VOUCHER MODAL */}
      <Modal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        title="Official Reservation Voucher"
        subtitle="HotelOS Grand Residence"
        maxWidth="lg"
      >
        {selectedRes && (
          <div className="space-y-6 text-xs text-hotel-text">
            {/* Voucher Header */}
            <div className="flex items-start justify-between border-b border-hotel-line pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-hotel-gold">
                  HotelOS Grand Residence
                </h2>
                <p className="text-[11px] text-hotel-muted">
                  Road 79, Gulshan-2, Dhaka 1212 • Tel: +880 2 988 5000
                </p>
              </div>
              <div className="text-right">
                <span className="kicker">Confirmation Code</span>
                <div className="font-mono text-sm font-bold text-hotel-accent">
                  {selectedRes.reservation_number}
                </div>
              </div>
            </div>

            {/* Voucher Body Grid */}
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-hotel-line bg-white/[0.02] p-4">
              <div>
                <span className="text-[10px] text-hotel-muted uppercase font-semibold">
                  Guest Particulars
                </span>
                <div className="mt-1 font-serif text-base font-bold text-hotel-text">
                  {selectedRes.guest?.first_name} {selectedRes.guest?.last_name}
                </div>
                <div className="text-hotel-muted text-[11px] mt-0.5">
                  Email: {selectedRes.guest?.email}
                </div>
                <div className="text-hotel-muted text-[11px]">
                  Phone: {selectedRes.guest?.phone}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-hotel-muted uppercase font-semibold">
                  Accommodations
                </span>
                <div className="mt-1 font-serif text-base font-bold text-hotel-gold">
                  {selectedRes.room_type?.name}
                </div>
                <div className="text-hotel-muted text-[11px] mt-0.5">
                  Room: {selectedRes.room ? `Room ${selectedRes.room.room_number}` : 'Guaranteed Type'}
                </div>
                <div className="text-hotel-muted text-[11px]">
                  Occupancy: {selectedRes.adults} Adults
                </div>
              </div>

              <div>
                <span className="text-[10px] text-hotel-muted uppercase font-semibold">
                  Arrival & Departure
                </span>
                <div className="mt-1 font-medium text-hotel-text">
                  Check-in: {selectedRes.check_in_date.split('T')[0]} (14:00)
                </div>
                <div className="font-medium text-hotel-text">
                  Check-out: {selectedRes.check_out_date.split('T')[0]} (11:00)
                </div>
                <div className="text-hotel-accent font-semibold mt-0.5">
                  Total Duration: {selectedRes.nights} Nights
                </div>
              </div>

              <div>
                <span className="text-[10px] text-hotel-muted uppercase font-semibold">
                  Tariff Breakdown
                </span>
                <div className="flex justify-between text-hotel-muted mt-1">
                  <span>Room Subtotal:</span>
                  <span>{(selectedRes.base_rate * selectedRes.nights).toLocaleString()} BDT</span>
                </div>
                <div className="flex justify-between text-hotel-muted">
                  <span>VAT (15%) + Service (10%):</span>
                  <span>{(selectedRes.tax_amount + selectedRes.service_charge).toLocaleString()} BDT</span>
                </div>
                <div className="flex justify-between font-serif font-bold text-hotel-gold border-t border-hotel-line pt-1 mt-1 text-sm">
                  <span>Total Amount:</span>
                  <span>{selectedRes.total_amount.toLocaleString()} BDT</span>
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            {selectedRes.special_requests && (
              <div className="rounded-lg border border-hotel-line bg-white/[0.02] p-3 text-[11px]">
                <span className="font-semibold text-hotel-gold">Special Requests: </span>
                <span className="text-hotel-muted">{selectedRes.special_requests}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-hotel-line">
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="rounded-lg border border-hotel-line px-4 py-2 font-medium text-hotel-muted hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-4 py-2 font-bold text-[#14110f] hover:opacity-95 transition-opacity"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Official Voucher</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* CANCELLATION MODAL */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Reservation"
        subtitle={selectedRes?.reservation_number}
        maxWidth="md"
      >
        {selectedRes && (
          <div className="space-y-4 text-xs">
            <p className="text-hotel-muted">
              Are you sure you want to cancel the confirmed booking for{' '}
              <strong className="text-hotel-text">
                {selectedRes.guest?.first_name} {selectedRes.guest?.last_name}
              </strong>
              ? Any held room inventory will be immediately released back to available status.
            </p>

            <div>
              <label className="text-hotel-muted font-medium">Cancellation Reason *</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-hotel-line">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="rounded-lg border border-hotel-line px-4 py-2 font-medium text-hotel-muted hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleExecuteCancel}
                className="rounded-lg border border-rose-500 bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-500 transition-colors"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};


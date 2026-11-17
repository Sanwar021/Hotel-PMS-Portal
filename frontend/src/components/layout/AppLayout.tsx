import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Modal } from '../common/Modal';
import { reservationsApi, roomsApi } from '../../api/endpoints';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const AppLayout: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Load room types
  const { data: roomTypes = [] } = useQuery({
    queryKey: ['room_types'],
    queryFn: roomsApi.getRoomTypes,
  });

  // Form states for Quick Booking
  const [bookingForm, setBookingForm] = useState(() => {
    const today = new Date();
    const departure = new Date(today);
    departure.setDate(today.getDate() + 2);
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      roomTypeId: '',
      checkInDate: today.toISOString().split('T')[0],
      checkOutDate: departure.toISOString().split('T')[0],
      checkInType: 'scheduled' as 'instant' | 'scheduled',
      bookingSource: 'website',
      adults: 2,
      advancePayment: 0,
      specialRequests: '',
    };
  });

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await reservationsApi.createReservation({
        guest_first_name: bookingForm.firstName,
        guest_last_name: bookingForm.lastName,
        guest_email: bookingForm.email,
        guest_phone: bookingForm.phone,
        room_type_id: bookingForm.roomTypeId || roomTypes[0]?.id,
        check_in_date: bookingForm.checkInDate,
        check_out_date: bookingForm.checkOutDate,
        adults: Number(bookingForm.adults),
        advance_payment: Number(bookingForm.advancePayment),
        special_requests: bookingForm.specialRequests,
        booking_source: bookingForm.bookingSource,
        check_in_type: bookingForm.checkInType,
      });
      setIsBookingModalOpen(false);
      setToastMessage(res.message);
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create reservation');
    }
  };

  return (
    <div className="app-canvas admin-shell premium-glass-shell min-h-screen text-hotel-text">
      <div className="window-controls" aria-hidden="true"><span /><span /><span /></div>
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
      />
      {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-[#06231d]/55 backdrop-blur-sm lg:hidden" />}
      <div className={`min-h-screen transition-[padding] duration-300 ${sidebarCollapsed ? 'lg:pl-[102px]' : 'lg:pl-[294px]'}`}>
        <Topbar
          onOpenMenu={() => {
            setSidebarOpen(true);
            setSidebarCollapsed(false);
          }}
          onQuickBooking={() => setIsBookingModalOpen(true)}
          onQuickCheckIn={() => navigate('/frontdesk')}
          onQuickOrder={() => navigate('/restaurant')}
        />
        <main className="glass-workspace mx-auto max-w-[1680px] p-4 sm:p-6 lg:p-7">
          <Outlet />
        </main>
      </div>

      {/* Global Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/90 px-4 py-3 text-xs font-medium text-emerald-300 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Quick Booking Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title="Create New Reservation"
        subtitle="Reservation Desk"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateBooking} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-hotel-muted font-medium">First Name *</label>
              <input
                required
                type="text"
                value={bookingForm.firstName}
                onChange={(e) => setBookingForm({ ...bookingForm, firstName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-hotel-muted font-medium">Last Name *</label>
              <input
                required
                type="text"
                value={bookingForm.lastName}
                onChange={(e) => setBookingForm({ ...bookingForm, lastName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-hotel-muted font-medium">Check-In Type *</label>
              <select
                required
                value={bookingForm.checkInType}
                onChange={(e) => {
                  const checkInType = e.target.value as 'instant' | 'scheduled';
                  if (checkInType === 'instant') {
                    const today = new Date();
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);
                    setBookingForm({ ...bookingForm, checkInType, checkInDate: today.toISOString().split('T')[0], checkOutDate: tomorrow.toISOString().split('T')[0] });
                  } else {
                    setBookingForm({ ...bookingForm, checkInType });
                  }
                }}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-panel p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              >
                <option value="instant">Instant Check-In</option>
                <option value="scheduled">Scheduled Check-In</option>
              </select>
              <p className="mt-1 text-[10px] text-hotel-muted">Instant check-in uses today as the arrival date.</p>
            </div>
            <div>
              <label className="text-xs text-hotel-muted font-medium">Reservation Source *</label>
              <select
                required
                value={bookingForm.bookingSource}
                onChange={(e) => setBookingForm({ ...bookingForm, bookingSource: e.target.value })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-panel p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              >
                <option value="phone">Phone</option>
                <option value="website">Website</option>
                <option value="walk_in">Walk-In</option>
                <option value="email">Email</option>
                <option value="booking_com">Booking.com</option>
                <option value="expedia">Expedia</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-hotel-muted font-medium">Email Address</label>
              <input
                type="email"
                value={bookingForm.email}
                onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-hotel-muted font-medium">Phone Number</label>
              <input
                type="tel"
                value={bookingForm.phone}
                onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-hotel-muted font-medium">Room Category *</label>
            <select
              value={bookingForm.roomTypeId}
              onChange={(e) => setBookingForm({ ...bookingForm, roomTypeId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-panel p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
            >
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name} — {rt.base_price.toLocaleString()} BDT / night ({rt.bed_type})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-hotel-muted font-medium">Check-In Date *</label>
              <input
                required
                type="date"
                value={bookingForm.checkInDate}
                onChange={(e) => setBookingForm({ ...bookingForm, checkInDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-hotel-muted font-medium">Check-Out Date *</label>
              <input
                required
                type="date"
                value={bookingForm.checkOutDate}
                onChange={(e) => setBookingForm({ ...bookingForm, checkOutDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-hotel-muted font-medium">Adults</label>
              <input
                type="number"
                min="1"
                max="6"
                value={bookingForm.adults}
                onChange={(e) => setBookingForm({ ...bookingForm, adults: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-hotel-muted font-medium">Advance Deposit (BDT)</label>
              <input
                type="number"
                min="0"
                step="500"
                value={bookingForm.advancePayment}
                onChange={(e) => setBookingForm({ ...bookingForm, advancePayment: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-hotel-muted font-medium">Special Requests & Preferences</label>
            <textarea
              rows={2}
              value={bookingForm.specialRequests}
              onChange={(e) => setBookingForm({ ...bookingForm, specialRequests: e.target.value })}
              placeholder="e.g. Quiet floor, extra towels, airport taxi"
              className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-hotel-line">
            <button
              type="button"
              onClick={() => setIsBookingModalOpen(false)}
              className="rounded-lg border border-hotel-line px-4 py-2 text-xs font-medium text-hotel-muted hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-5 py-2 text-xs font-bold text-[#14110f] shadow-md hover:opacity-95 transition-opacity"
            >
              Confirm Reservation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


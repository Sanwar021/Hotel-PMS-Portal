import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Plus,
  Star,
  Building,
  Mail,
  Phone,
  Calendar,
  History,
  DollarSign,
  Tag,
} from 'lucide-react';
import { guestsApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Guest, Reservation } from '../../types';
import { SearchSortControls } from '../../components/common/SearchSortControls';

export const GuestsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [vipFilter, setVipFilter] = useState('');
  const [sort, setSort] = useState('name');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [guestHistory, setGuestHistory] = useState<Reservation[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isNewGuestModalOpen, setIsNewGuestModalOpen] = useState(false);

  // New guest form
  const [newGuest, setNewGuest] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationality: 'Bangladeshi',
    companyName: '',
    vipStatus: 'none',
    preferences: '',
  });

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests', search, vipFilter],
    queryFn: () => guestsApi.getGuests({ search, vip: vipFilter }),
  });
  const visibleGuests = [...guests].sort((a, b) => {
    if (sort === 'spent') return b.total_spent - a.total_spent;
    if (sort === 'stays') return b.total_stays - a.total_stays;
    if (sort === 'vip') return b.vip_status.localeCompare(a.vip_status);
    if (sort === 'company') return (a.company_name || '').localeCompare(b.company_name || '');
    return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
  });

  const handleOpenHistory = async (guest: Guest) => {
    setSelectedGuest(guest);
    try {
      const data = await guestsApi.getGuestById(guest.id);
      setGuestHistory(data.reservations || []);
    } catch {
      setGuestHistory([]);
    }
    setIsHistoryModalOpen(true);
  };

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await guestsApi.createGuest({
        first_name: newGuest.firstName,
        last_name: newGuest.lastName,
        email: newGuest.email,
        phone: newGuest.phone,
        nationality: newGuest.nationality,
        company_name: newGuest.companyName,
        vip_status: newGuest.vipStatus,
        preferences: newGuest.preferences,
      });
      setIsNewGuestModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create guest');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Guest CRM & Loyalty"
        title="Guest Profiles & Relationship Management"
        description="Detailed guest history, VIP status designations, corporate profiles, personalized preferences, and lifetime spending telemetry."
        actions={
          <button
            onClick={() => setIsNewGuestModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-4 py-2 text-xs font-bold text-[#14110f] shadow hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            <span>Register New Guest</span>
          </button>
        }
      />

      {/* Filter and Search */}
      <div className="flex flex-col justify-between gap-4 border-b border-hotel-line pb-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {['', 'platinum', 'gold', 'silver', 'none'].map((vip) => (
            <button
              key={vip}
              onClick={() => setVipFilter(vip)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                vipFilter === vip
                  ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
                  : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
              }`}
            >
              {vip === '' ? 'All Guests' : vip === 'none' ? 'Standard Tier' : `VIP ${vip}`}
            </button>
          ))}
        </div>

        <SearchSortControls compact search={search} onSearchChange={setSearch} sort={sort} onSortChange={setSort} resultCount={visibleGuests.length} placeholder="Search name, email, phone or company..." sortOptions={[{ value: 'name', label: 'Guest name A–Z' }, { value: 'spent', label: 'Lifetime spend high to low' }, { value: 'stays', label: 'Most stays' }, { value: 'vip', label: 'VIP tier' }, { value: 'company', label: 'Company A–Z' }]} />
      </div>

      {/* Guest Cards Directory */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-xs text-hotel-muted">
            Loading guest directory...
          </div>
        ) : visibleGuests.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-hotel-muted">
            No guests found matching filters.
          </div>
        ) : (
          visibleGuests.map((g) => (
            <div
              key={g.id}
              className="flex flex-col justify-between rounded-2xl border border-hotel-line bg-hotel-panel p-5 hover:border-hotel-gold/30 hover:shadow-[0_10px_35px_rgba(0,0,0,0.5)] transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-hotel-text">
                      {g.first_name} {g.last_name}
                    </h3>
                    <div className="text-[11px] text-hotel-muted">{g.nationality}</div>
                  </div>
                  <StatusBadge status={g.vip_status} type="vip" size="sm" />
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-hotel-muted">
                  {g.company_name && (
                    <div className="flex items-center gap-2 text-hotel-text font-medium">
                      <Building className="h-3.5 w-3.5 text-hotel-gold shrink-0" />
                      <span className="truncate">{g.company_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{g.email || 'No email provided'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{g.phone || 'No phone'}</span>
                  </div>
                </div>

                {g.preferences && (
                  <div className="mt-3 rounded-lg border border-hotel-line bg-white/[0.02] p-2 text-[10px] text-hotel-muted italic">
                    "{g.preferences}"
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-hotel-line pt-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-hotel-muted block">Lifetime Spend</span>
                  <span className="font-serif font-bold text-hotel-gold">
                    {g.total_spent.toLocaleString()} BDT
                  </span>
                  <span className="text-[10px] text-hotel-muted ml-1">({g.total_stays} stays)</span>
                </div>

                <button
                  onClick={() => handleOpenHistory(g)}
                  className="rounded-lg border border-hotel-line bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-hotel-text hover:bg-white/[0.08] transition-colors"
                >
                  Stay History
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* STAY HISTORY MODAL */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Guest Folio & Stay History"
        subtitle={selectedGuest ? `${selectedGuest.first_name} ${selectedGuest.last_name}` : ''}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="divide-y divide-hotel-line rounded-xl border border-hotel-line bg-white/[0.02]">
            {guestHistory.length === 0 ? (
              <div className="p-6 text-center text-hotel-muted">No prior recorded reservations</div>
            ) : (
              guestHistory.map((res) => (
                <div key={res.id} className="flex items-center justify-between p-3.5">
                  <div>
                    <div className="font-mono text-xs font-semibold text-hotel-accent">
                      {res.reservation_number}
                    </div>
                    <div className="text-[11px] text-hotel-muted mt-0.5">
                      {res.room_type?.name} • Room {res.room?.room_number || 'TBD'}
                    </div>
                    <div className="text-[10px] text-hotel-muted">
                      {res.check_in_date.split('T')[0]} → {res.check_out_date.split('T')[0]} ({res.nights} nights)
                    </div>
                  </div>

                  <div className="text-right">
                    <StatusBadge status={res.status} type="reservation" size="sm" />
                    <div className="mt-1 font-serif text-sm font-bold text-hotel-text">
                      {res.total_amount.toLocaleString()} BDT
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* NEW GUEST REGISTRATION MODAL */}
      <Modal
        isOpen={isNewGuestModalOpen}
        onClose={() => setIsNewGuestModalOpen(false)}
        title="Register New Guest Profile"
        subtitle="Guest Relationship Directory"
        maxWidth="md"
      >
        <form onSubmit={handleCreateGuest} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-hotel-muted font-medium">First Name *</label>
              <input
                required
                type="text"
                value={newGuest.firstName}
                onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-hotel-muted font-medium">Last Name *</label>
              <input
                required
                type="text"
                value={newGuest.lastName}
                onChange={(e) => setNewGuest({ ...newGuest, lastName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-hotel-muted font-medium">Email Address</label>
              <input
                type="email"
                value={newGuest.email}
                onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-hotel-muted font-medium">Phone</label>
              <input
                type="tel"
                value={newGuest.phone}
                onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-hotel-muted font-medium">Company Name</label>
              <input
                type="text"
                value={newGuest.companyName}
                onChange={(e) => setNewGuest({ ...newGuest, companyName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-hotel-muted font-medium">VIP Tier</label>
              <select
                value={newGuest.vipStatus}
                onChange={(e) => setNewGuest({ ...newGuest, vipStatus: e.target.value })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-panel p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              >
                <option value="none">Standard Tier</option>
                <option value="silver">VIP Silver</option>
                <option value="gold">VIP Gold</option>
                <option value="platinum">VIP Platinum</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-hotel-muted font-medium">Guest Preferences & Notes</label>
            <textarea
              rows={2}
              value={newGuest.preferences}
              onChange={(e) => setNewGuest({ ...newGuest, preferences: e.target.value })}
              placeholder="e.g. High floor preference, sparkling water on arrival"
              className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-hotel-line">
            <button
              type="button"
              onClick={() => setIsNewGuestModalOpen(false)}
              className="rounded-lg border border-hotel-line px-4 py-2 font-medium text-hotel-muted hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-5 py-2 font-bold text-[#14110f] hover:opacity-95 transition-opacity"
            >
              Save Profile
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


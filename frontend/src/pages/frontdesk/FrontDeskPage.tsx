import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ConciergeBell,
  CheckCircle,
  LogOut,
  ArrowRightLeft,
  Search,
  Eye,
  CreditCard,
  BedDouble,
  User,
  Clock,
  Sparkles,
  ScanLine,
  Upload,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { frontdeskApi, roomsApi, billingApi, identityApi, reservationsApi, ParsedNIDIdentity } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Reservation, Room, GuestFolio } from '../../types';
import { SearchSortControls } from '../../components/common/SearchSortControls';

export const FrontDeskPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'arrivals' | 'in_house' | 'departures'>('arrivals');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('arrival');

  // Modals state
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isFolioOpen, setIsFolioOpen] = useState(false);
  const [activeFolio, setActiveFolio] = useState<GuestFolio | null>(null);

  // Form states
  const [checkInRoomId, setCheckInRoomId] = useState('');
  const [keyCard, setKeyCard] = useState('');
  const [deposit, setDeposit] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [newRoomId, setNewRoomId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [identityVerified, setIdentityVerified] = useState(false);
  const [scannerText, setScannerText] = useState('');
  const [scanProgress, setScanProgress] = useState('');
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [identityForm, setIdentityForm] = useState({ firstName: '', lastName: '', idNumber: '', dateOfBirth: '', address: '', nationality: 'Bangladeshi' });

  // Fetch front desk lists
  const { data: arrivals = [], isLoading: loadingArr } = useQuery({
    queryKey: ['arrivals'],
    queryFn: frontdeskApi.getArrivals,
  });

  const { data: inHouse = [], isLoading: loadingInHouse } = useQuery({
    queryKey: ['in_house'],
    queryFn: frontdeskApi.getInHouse,
  });

  const { data: departures = [], isLoading: loadingDep } = useQuery({
    queryKey: ['departures'],
    queryFn: frontdeskApi.getDepartures,
  });

  // Fetch available rooms for check-in or room transfer
  const { data: availableRooms = [] } = useQuery({
    queryKey: ['available_rooms'],
    queryFn: () => roomsApi.getRooms({ status: 'available' }),
  });

  const { data: activeReservations = [] } = useQuery({
    queryKey: ['reservations', 'check_in_room_conflicts'],
    queryFn: () => reservationsApi.getReservations(),
  });

  const roomIsFreeForReservation = (room: Room, reservation: Reservation) => !activeReservations.some((other) =>
    other.id !== reservation.id
    && other.room_id === room.id
    && (other.status === 'confirmed' || other.status === 'checked_in')
    && other.check_in_date < reservation.check_out_date
    && other.check_out_date > reservation.check_in_date
  );

  const handleOpenCheckIn = (res: Reservation) => {
    setSelectedRes(res);
    const compatibleRoom = availableRooms.find((room) => room.id === res.room_id && room.room_type_id === res.room_type_id && roomIsFreeForReservation(room, res))
      || availableRooms.find((room) => room.room_type_id === res.room_type_id && roomIsFreeForReservation(room, res));
    setCheckInRoomId(compatibleRoom?.id || '');
    setKeyCard(compatibleRoom ? `KC-${compatibleRoom.room_number}` : 'KC-AUTO');
    setDeposit(0);
    setIdentityVerified(Boolean(res.guest?.id_verified_at));
    setScannerText('');
    setScanProgress('');
    setScanWarnings([]);
    setIdentityForm({
      firstName: res.guest?.first_name || '',
      lastName: res.guest?.last_name || '',
      idNumber: res.guest?.id_number || '',
      dateOfBirth: res.guest?.date_of_birth?.split('T')[0] || '',
      address: res.guest?.address || '',
      nationality: res.guest?.nationality || 'Bangladeshi',
    });
    setIsCheckInOpen(true);
  };

  const applyParsedIdentity = (identity: ParsedNIDIdentity) => {
    setIdentityForm((current) => ({
      firstName: identity.first_name || current.firstName,
      lastName: identity.last_name || current.lastName,
      idNumber: identity.id_number || current.idNumber,
      dateOfBirth: identity.date_of_birth || current.dateOfBirth,
      address: identity.address || current.address,
      nationality: identity.nationality || current.nationality,
    }));
    setScanWarnings(identity.warnings || []);
    setIdentityVerified(false);
  };

  const parseScannerText = async (text: string) => {
    if (!text.trim()) return;
    const identity = await identityApi.parseNID(text);
    applyParsedIdentity(identity);
    setScanProgress('Scan complete — review the extracted details below.');
  };

  const handleNIDImage = async (file?: File) => {
    if (!file) return;
    setIsScanning(true);
    setScanWarnings([]);
    setScanProgress('Preparing secure on-device OCR...');
    let worker: { recognize: (image: File) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> } | null = null;
    try {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('eng', 1, {
        logger: (message) => {
          if (message.status) setScanProgress(`${message.status}${message.progress ? ` ${Math.round(message.progress * 100)}%` : ''}`);
        },
      });
      const result = await worker.recognize(file);
      setScannerText(result.data.text);
      await parseScannerText(result.data.text);
    } catch (error: any) {
      setScanProgress('The image could not be read. Use a clearer image or paste scanner text below.');
      setScanWarnings([error?.message || 'NID OCR failed']);
    } finally {
      if (worker) await worker.terminate();
      setIsScanning(false);
    }
  };

  const handleExecuteCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes) return;
    try {
      await frontdeskApi.checkIn({
        reservation_id: selectedRes.id,
        room_id: checkInRoomId,
        deposit_amount: Number(deposit),
        payment_method: paymentMethod,
        identity_verified: identityVerified,
        guest_identity: {
          first_name: identityForm.firstName,
          last_name: identityForm.lastName,
          id_number: identityForm.idNumber,
          date_of_birth: identityForm.dateOfBirth,
          address: identityForm.address,
          nationality: identityForm.nationality,
        },
      });
      setIsCheckInOpen(false);
      queryClient.invalidateQueries({ queryKey: ['arrivals'] });
      queryClient.invalidateQueries({ queryKey: ['in_house'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Check-in failed');
    }
  };

  const handleOpenCheckOut = async (res: Reservation) => {
    setSelectedRes(res);
    try {
      // Find active folio
      const folio = await billingApi.getFolio(res.id); // Or fetch by reservation
      setActiveFolio(folio);
    } catch {
      setActiveFolio(null);
    }
    setIsCheckOutOpen(true);
  };

  const handleExecuteCheckOut = async () => {
    if (!selectedRes) return;
    try {
      await frontdeskApi.checkOut({
        reservation_id: selectedRes.id,
        settle_payment: true,
        payment_method: 'credit_card',
      });
      setIsCheckOutOpen(false);
      queryClient.invalidateQueries({ queryKey: ['in_house'] });
      queryClient.invalidateQueries({ queryKey: ['departures'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Check-out failed');
    }
  };

  const handleOpenTransfer = (res: Reservation) => {
    setSelectedRes(res);
    setNewRoomId(availableRooms[0]?.id || '');
    setTransferReason('Guest requested quiet room away from elevators');
    setIsTransferOpen(true);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes || !newRoomId) return;
    try {
      await frontdeskApi.transferRoom({
        reservation_id: selectedRes.id,
        new_room_id: newRoomId,
        reason: transferReason,
      });
      setIsTransferOpen(false);
      queryClient.invalidateQueries({ queryKey: ['in_house'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Room transfer failed');
    }
  };

  // Filter list based on active tab and search query
  const getList = () => {
    let list: Reservation[] = [];
    if (activeTab === 'arrivals') list = arrivals;
    if (activeTab === 'in_house') list = inHouse;
    if (activeTab === 'departures') list = departures;

    const filtered = !search ? list : list.filter(
      (r) =>
        r.reservation_number.toLowerCase().includes(search.toLowerCase()) ||
        r.guest?.first_name.toLowerCase().includes(search.toLowerCase()) ||
        r.guest?.last_name.toLowerCase().includes(search.toLowerCase()) ||
        r.room?.room_number.includes(search)
    );
    return [...filtered].sort((a, b) => {
      if (sort === 'guest') return `${a.guest?.first_name} ${a.guest?.last_name}`.localeCompare(`${b.guest?.first_name} ${b.guest?.last_name}`);
      if (sort === 'room') return (a.room?.room_number || '').localeCompare(b.room?.room_number || '', undefined, { numeric: true });
      if (sort === 'balance') return (b.total_amount - b.paid_amount) - (a.total_amount - a.paid_amount);
      if (sort === 'departure') return a.check_out_date.localeCompare(b.check_out_date);
      return a.check_in_date.localeCompare(b.check_in_date);
    });
  };

  const currentList = getList();
  const compatibleCheckInRooms = selectedRes
    ? availableRooms.filter((room) => room.room_type_id === selectedRes.room_type_id && roomIsFreeForReservation(room, selectedRes))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Front of House Reception"
        title="Front Desk & Concierge Operations"
        description="Streamlined guest reception workflows: one-click check-ins, guest folio auditing, room relocations, and automated checkout turnovers."
      />

      {/* Tabs & Search Filter */}
      <div className="flex flex-col justify-between gap-4 border-b border-hotel-line pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('arrivals')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'arrivals'
                ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
                : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
            }`}
          >
            <span>Expected Arrivals</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
              {arrivals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('in_house')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'in_house'
                ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
                : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
            }`}
          >
            <span>In-House Guests</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
              {inHouse.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('departures')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'departures'
                ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
                : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
            }`}
          >
            <span>Today's Departures</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
              {departures.length}
            </span>
          </button>
        </div>

        <SearchSortControls compact search={search} onSearchChange={setSearch} sort={sort} onSortChange={setSort} resultCount={currentList.length} placeholder="Search guest, booking #, phone or room..." sortOptions={[{ value: 'arrival', label: 'Arrival date' }, { value: 'departure', label: 'Departure date' }, { value: 'guest', label: 'Guest name A–Z' }, { value: 'room', label: 'Room number' }, { value: 'balance', label: 'Balance high to low' }]} />
      </div>

      {/* Main Table View */}
      <div className="rounded-2xl border border-hotel-line bg-hotel-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-hotel-line bg-white/[0.02] text-[11px] text-hotel-muted uppercase tracking-wider">
                <th className="py-3.5 px-4 font-medium">Guest Name</th>
                <th className="py-3.5 px-4 font-medium">Room</th>
                <th className="py-3.5 px-4 font-medium">Category & Plan</th>
                <th className="py-3.5 px-4 font-medium">Dates & Nights</th>
                <th className="py-3.5 px-4 font-medium">VIP Tier</th>
                <th className="py-3.5 px-4 font-medium">Folio Balance</th>
                <th className="py-3.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hotel-line">
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-hotel-muted">
                    No reservations found in this view.
                  </td>
                </tr>
              ) : (
                currentList.map((res) => {
                  const balance = res.total_amount - res.paid_amount;
                  return (
                    <tr key={res.id} className="hover:bg-[#f7f8f4] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-hotel-text">
                          {res.guest?.first_name} {res.guest?.last_name}
                        </div>
                        <div className="text-[10px] text-hotel-muted">
                          {res.reservation_number} • {res.guest?.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-serif text-sm font-semibold text-hotel-gold">
                        {res.room ? `Room ${res.room.room_number}` : 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4 text-hotel-muted">
                        <div>{res.room_type?.name}</div>
                        <div className="text-[10px] text-hotel-muted/70">{res.booking_source}</div>
                      </td>
                      <td className="py-3.5 px-4 text-hotel-muted">
                        <div>
                          {res.check_in_date.split('T')[0]} → {res.check_out_date.split('T')[0]}
                        </div>
                        <div className="text-[10px] text-hotel-accent font-medium">
                          {res.nights} {res.nights === 1 ? 'night' : 'nights'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={res.guest?.vip_status || 'none'} type="vip" size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-serif font-semibold text-hotel-text">
                        {balance > 0 ? (
                          <span className="text-amber-400">{balance.toLocaleString()} BDT</span>
                        ) : (
                          <span className="text-emerald-400">Settled (0 BDT)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === 'arrivals' && (
                            <button
                              onClick={() => handleOpenCheckIn(res)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-900/60 transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Check In</span>
                            </button>
                          )}

                          {activeTab === 'in_house' && (
                            <>
                              <button
                                onClick={() => handleOpenTransfer(res)}
                                title="Transfer Room"
                                className="inline-flex items-center gap-1 rounded-lg border border-hotel-line bg-white/[0.04] p-1.5 text-hotel-muted hover:text-hotel-text hover:bg-white/[0.08] transition-colors"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenCheckOut(res)}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-950/60 px-2.5 py-1 text-xs font-semibold text-amber-400 hover:bg-amber-900/60 transition-colors"
                              >
                                <LogOut className="h-3.5 w-3.5" />
                                <span>Check Out</span>
                              </button>
                            </>
                          )}

                          {activeTab === 'departures' && (
                            <button
                              onClick={() => handleOpenCheckOut(res)}
                              className="inline-flex items-center gap-1 rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-3 py-1 text-xs font-bold text-[#14110f] hover:opacity-95 transition-opacity"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                              <span>Complete Checkout</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHECK-IN MODAL */}
      <Modal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        title="Confirm Guest Check-In"
        subtitle="Front Desk Reception"
        maxWidth="lg"
      >
        {selectedRes && (
          <form onSubmit={handleExecuteCheckIn} className="space-y-4 text-xs">
            <div className="rounded-xl border border-hotel-line bg-white/[0.02] p-3 text-hotel-text">
              <div className="font-serif text-base font-medium">
                {selectedRes.guest?.first_name} {selectedRes.guest?.last_name}
              </div>
              <div className="mt-1 flex items-center gap-2 text-hotel-muted text-[11px]">
                <span>{selectedRes.room_type?.name}</span>
                <span>•</span>
                <span>{selectedRes.nights} Nights</span>
                <span>•</span>
                <span className="text-hotel-gold font-serif">
                  {selectedRes.total_amount.toLocaleString()} BDT Total
                </span>
              </div>
            </div>

            <section className="rounded-xl border border-[#b8d3c6] bg-[#f2f7f4] p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-[#285f4e]"><ScanLine className="h-4 w-4" /> National ID Scanner</div>
                  <p className="mt-1 text-[11px] leading-5 text-hotel-muted">Capture an NID image or paste text from a desktop scanner. OCR runs on this device; staff must review every field.</p>
                </div>
                <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#326f5c] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#285a4b]">
                  {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {isScanning ? 'Scanning…' : 'Scan NID Image'}
                  <input disabled={isScanning} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => handleNIDImage(event.target.files?.[0])} />
                </label>
              </div>
              {scanProgress && <p role="status" className="mt-3 text-[11px] font-medium text-[#326f5c]">{scanProgress}</p>}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <textarea value={scannerText} onChange={(event) => setScannerText(event.target.value)} rows={2} placeholder="Paste or scan raw NID text here…" className="min-h-16 flex-1 rounded-lg border border-hotel-line bg-white p-2 text-xs text-hotel-text outline-none focus:border-hotel-accent" />
                <button type="button" disabled={!scannerText.trim() || isScanning} onClick={() => parseScannerText(scannerText)} className="rounded-lg border border-[#b8d3c6] bg-white px-4 py-2 text-xs font-semibold text-[#285f4e] disabled:cursor-not-allowed disabled:opacity-50">Extract Details</button>
              </div>
              {scanWarnings.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] text-[#8a641f]">{scanWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
            </section>

            <section className="space-y-3 rounded-xl border border-hotel-line bg-white p-4">
              <div className="flex items-center gap-2 font-semibold text-hotel-text"><ShieldCheck className="h-4 w-4 text-[#326f5c]" /> Review Extracted Guest Information</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-hotel-muted font-medium">First Name *<input required value={identityForm.firstName} onChange={(e) => setIdentityForm({ ...identityForm, firstName: e.target.value })} className="mt-1 w-full rounded-lg border border-hotel-line bg-white p-2 text-xs text-hotel-text outline-none focus:border-hotel-accent" /></label>
                <label className="text-hotel-muted font-medium">Last Name *<input required value={identityForm.lastName} onChange={(e) => setIdentityForm({ ...identityForm, lastName: e.target.value })} className="mt-1 w-full rounded-lg border border-hotel-line bg-white p-2 text-xs text-hotel-text outline-none focus:border-hotel-accent" /></label>
                <label className="text-hotel-muted font-medium">National ID Number *<input required inputMode="numeric" pattern="[0-9]{10}|[0-9]{13}|[0-9]{17}" value={identityForm.idNumber} onChange={(e) => setIdentityForm({ ...identityForm, idNumber: e.target.value.replace(/\D/g, '').slice(0, 17) })} className="mt-1 w-full rounded-lg border border-hotel-line bg-white p-2 text-xs text-hotel-text outline-none focus:border-hotel-accent" /></label>
                <label className="text-hotel-muted font-medium">Date of Birth<input type="date" max={new Date().toISOString().split('T')[0]} value={identityForm.dateOfBirth} onChange={(e) => setIdentityForm({ ...identityForm, dateOfBirth: e.target.value })} className="mt-1 w-full rounded-lg border border-hotel-line bg-white p-2 text-xs text-hotel-text outline-none focus:border-hotel-accent" /></label>
                <label className="text-hotel-muted font-medium sm:col-span-2">Address<textarea rows={2} value={identityForm.address} onChange={(e) => setIdentityForm({ ...identityForm, address: e.target.value })} className="mt-1 w-full rounded-lg border border-hotel-line bg-white p-2 text-xs text-hotel-text outline-none focus:border-hotel-accent" /></label>
              </div>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#b8d3c6] bg-[#e7f1ec] p-3 text-[11px] text-[#285f4e]">
                <input required type="checkbox" checked={identityVerified} onChange={(e) => setIdentityVerified(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#326f5c]" />
                <span><strong>Identity reviewed and verified.</strong> I confirm the scanned details match the physical NID presented by the guest.</span>
              </label>
            </section>

            <div>
              <label className="text-hotel-muted font-medium">Select Room Allocation *</label>
              <select
                required
                value={checkInRoomId}
                onChange={(e) => setCheckInRoomId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-panel p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              >
                <option value="" disabled>Select a compatible available room</option>
                {compatibleCheckInRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} (Floor {r.floor?.floor_number}) — {r.room_type?.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-hotel-muted font-medium">Key Card Code</label>
                <input
                  type="text"
                  value={keyCard}
                  onChange={(e) => setKeyCard(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-hotel-muted font-medium">Check-In Deposit (BDT)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-hotel-line">
              <button
                type="button"
                onClick={() => setIsCheckInOpen(false)}
                className="rounded-lg border border-hotel-line px-4 py-2 text-hotel-muted hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-5 py-2 font-bold text-[#14110f] hover:opacity-95 transition-opacity"
              >
                Complete Check-In & Issue Key
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* CHECK-OUT MODAL */}
      <Modal
        isOpen={isCheckOutOpen}
        onClose={() => setIsCheckOutOpen(false)}
        title="Process Guest Check-Out"
        subtitle="Folio Settlement"
        maxWidth="lg"
      >
        {selectedRes && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-hotel-line bg-white/[0.02] p-4 text-hotel-text">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-serif text-lg font-semibold">
                    {selectedRes.guest?.first_name} {selectedRes.guest?.last_name}
                  </h4>
                  <div className="text-hotel-muted text-[11px]">
                    Room {selectedRes.room?.room_number} • Stayed {selectedRes.nights} Nights
                  </div>
                </div>
                <div className="text-right">
                  <span className="kicker">Balance Due</span>
                  <div className="font-serif text-xl font-bold text-hotel-accent">
                    {(selectedRes.total_amount - selectedRes.paid_amount).toLocaleString()} BDT
                  </div>
                </div>
              </div>
            </div>

            {/* Turn-over notification badge */}
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-amber-300 text-xs">
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                Upon checkout completion, Room {selectedRes.room?.room_number} will automatically transition to <strong>Dirty</strong> and a high-priority Turnover task will be assigned to Housekeeping.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-hotel-line">
              <button
                type="button"
                onClick={() => setIsCheckOutOpen(false)}
                className="rounded-lg border border-hotel-line px-4 py-2 text-hotel-muted hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteCheckOut}
                className="rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-5 py-2 font-bold text-[#14110f] shadow hover:opacity-95 transition-opacity"
              >
                Settle Folio & Release Room
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ROOM TRANSFER MODAL */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Transfer Room"
        subtitle="In-House Relocation"
        maxWidth="md"
      >
        {selectedRes && (
          <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
            <div>
              <span className="text-hotel-muted">Current Room:</span>
              <div className="font-serif text-base font-semibold text-hotel-text">
                Room {selectedRes.room?.room_number} ({selectedRes.room_type?.name})
              </div>
            </div>

            <div>
              <label className="text-hotel-muted font-medium">Select Destination Room *</label>
              <select
                value={newRoomId}
                onChange={(e) => setNewRoomId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-panel p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              >
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} (Floor {r.floor?.floor_number}) — {r.room_type?.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-hotel-muted font-medium">Relocation Reason</label>
              <input
                type="text"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-hotel-line">
              <button
                type="button"
                onClick={() => setIsTransferOpen(false)}
                className="rounded-lg border border-hotel-line px-4 py-2 text-hotel-muted hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-5 py-2 font-bold text-[#14110f] hover:opacity-95 transition-opacity"
              >
                Confirm Room Transfer
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};


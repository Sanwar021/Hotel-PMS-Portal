import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BedDouble,
  Plus,
  Filter,
  CheckCircle,
  Wrench,
  Sparkles,
  Wifi,
  Tv,
  Coffee,
  Maximize2,
  Users,
} from 'lucide-react';
import { roomsApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Room, RoomStatus } from '../../types';
import { SearchSortControls } from '../../components/common/SearchSortControls';

export const RoomsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedFloor, setSelectedFloor] = useState<number>(0); // 0 = all
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('room_asc');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<RoomStatus>('available');
  const [statusNotes, setStatusNotes] = useState('');

  // Fetch rooms
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms', statusFilter],
    queryFn: () => roomsApi.getRooms({ status: statusFilter }),
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: roomsApi.getFloors,
  });

  const handleOpenStatusModal = (room: Room) => {
    setSelectedRoom(room);
    setNewStatus(room.status);
    setStatusNotes(room.notes || '');
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    try {
      await roomsApi.updateStatus(selectedRoom.id, newStatus, statusNotes);
      setIsStatusModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const floorRooms = selectedFloor === 0
    ? rooms
    : rooms.filter((r) => r.floor?.floor_number === selectedFloor);
  const filteredRooms = floorRooms.filter((room) => `${room.room_number} ${room.room_type?.name || ''} ${room.status} ${room.floor?.name || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => {
    if (sort === 'room_desc') return b.room_number.localeCompare(a.room_number, undefined, { numeric: true });
    if (sort === 'type') return (a.room_type?.name || '').localeCompare(b.room_type?.name || '');
    if (sort === 'status') return a.status.localeCompare(b.status);
    if (sort === 'price_high') return (b.room_type?.base_price || 0) - (a.room_type?.base_price || 0);
    return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
  });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Inventory & Asset Management"
        title="Rooms & Floor Plan"
        description="Monitor physical room availability, inspect housekeeping turnover status, and update operational states across all 4 hotel floors."
      />

      {/* Floor Filter Tabs */}
      <div className="flex flex-col justify-between gap-4 border-b border-hotel-line pb-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedFloor(0)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              selectedFloor === 0
                ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
                : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
            }`}
          >
            All Floors ({rooms.length})
          </button>
          {floors.map((fl) => (
            <button
              key={fl.id}
              onClick={() => setSelectedFloor(fl.floor_number)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                selectedFloor === fl.floor_number
                  ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
                  : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
              }`}
            >
              Floor {fl.floor_number} ({fl.name})
            </button>
          ))}
        </div>

        {/* Status filter dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-hotel-line bg-hotel-panel px-3 py-1.5 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
          <option value="dirty">Dirty</option>
          <option value="cleaning">Cleaning</option>
          <option value="inspected">Inspected</option>
          <option value="maintenance">Maintenance</option>
          <option value="out_of_order">Out of Order</option>
        </select>
      </div>

      <SearchSortControls search={search} onSearchChange={setSearch} sort={sort} onSortChange={setSort} resultCount={filteredRooms.length} placeholder="Search room number, type, floor or status..." sortOptions={[{ value: 'room_asc', label: 'Room number ascending' }, { value: 'room_desc', label: 'Room number descending' }, { value: 'type', label: 'Room type A–Z' }, { value: 'status', label: 'Status A–Z' }, { value: 'price_high', label: 'Rate high to low' }]} />

      {/* Room Grid Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filteredRooms.map((room) => (
          <div
            key={room.id}
            className="group relative overflow-hidden rounded-2xl border border-hotel-line bg-hotel-panel p-4 transition-all duration-300 hover:border-hotel-gold/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-serif text-2xl font-bold tracking-tight text-hotel-text">
                  {room.room_number}
                </span>
                <div className="text-[11px] text-hotel-muted">
                  Floor {room.floor?.floor_number} • {room.room_type?.code}
                </div>
              </div>
              <StatusBadge status={room.status} type="room" size="sm" />
            </div>

            <div className="mt-3 border-t border-hotel-line pt-3 text-xs">
              <div className="font-semibold text-hotel-gold">{room.room_type?.name}</div>
              <div className="mt-1 flex items-center gap-3 text-hotel-muted text-[11px]">
                <span className="flex items-center gap-1">
                  <BedDouble className="h-3 w-3" />
                  {room.room_type?.bed_type}
                </span>
                <span className="flex items-center gap-1">
                  <Maximize2 className="h-3 w-3" />
                  {room.room_type?.size_sqm} m²
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-hotel-line pt-3 text-xs">
              <span className="font-serif font-bold text-hotel-text">
                {room.room_type?.base_price.toLocaleString()} BDT
                <span className="text-[10px] text-hotel-muted font-normal"> / night</span>
              </span>

              <button
                onClick={() => handleOpenStatusModal(room)}
                className="rounded-lg border border-hotel-line bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-hotel-muted hover:text-hotel-text hover:bg-white/[0.08] transition-colors"
              >
                Set Status
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Set Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Room Status"
        subtitle={`Room ${selectedRoom?.room_number}`}
        maxWidth="md"
      >
        {selectedRoom && (
          <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
            <div>
              <label className="text-hotel-muted font-medium">New Status *</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as RoomStatus)}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-panel p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              >
                <option value="available">Available (Clean & Ready)</option>
                <option value="dirty">Dirty (Turnover Required)</option>
                <option value="cleaning">Cleaning (In Progress)</option>
                <option value="inspected">Inspected (Supervisor Cleared)</option>
                <option value="maintenance">Maintenance (Blocked for Repairs)</option>
                <option value="out_of_order">Out of Order (Decommissioned)</option>
              </select>
            </div>

            <div>
              <label className="text-hotel-muted font-medium">Log Notes</label>
              <textarea
                rows={3}
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="e.g. Cleared by floor supervisor, ready for arrivals"
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-hotel-line">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="rounded-lg border border-hotel-line px-4 py-2 font-medium text-hotel-muted hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-5 py-2 font-bold text-[#14110f] hover:opacity-95 transition-opacity"
              >
                Save Room Status
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};


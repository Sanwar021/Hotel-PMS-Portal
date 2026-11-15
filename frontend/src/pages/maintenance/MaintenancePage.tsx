import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  BedDouble,
} from 'lucide-react';
import { maintenanceApi, roomsApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { MaintenanceRequest } from '../../types';
import { SearchSortControls } from '../../components/common/SearchSortControls';

export const MaintenancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  // Form state
  const [ticketRoomId, setTicketRoomId] = useState('');
  const [equipment, setEquipment] = useState('Daikin VRV Air Conditioner');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'emergency'>('high');
  const [blockRoom, setBlockRoom] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => maintenanceApi.getRequests(),
  });

  const { data: allRooms = [] } = useQuery({
    queryKey: ['all_rooms_maint'],
    queryFn: () => roomsApi.getRooms(),
  });

  const visibleRequests = requests.filter((request) => `${request.room?.room_number || ''} ${request.equipment_name} ${request.title} ${request.description} ${request.priority} ${request.status}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => {
    if (sort === 'room') return (a.room?.room_number || '').localeCompare(b.room?.room_number || '', undefined, { numeric: true });
    if (sort === 'priority') return ({ emergency: 0, high: 1, medium: 2, low: 3 }[a.priority] ?? 9) - ({ emergency: 0, high: 1, medium: 2, low: 3 }[b.priority] ?? 9);
    if (sort === 'status') return a.status.localeCompare(b.status);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await maintenanceApi.createRequest({
        room_id: ticketRoomId || undefined,
        equipment_name: equipment,
        title,
        description,
        priority,
        block_room: blockRoom,
      });
      setIsNewTicketOpen(false);
      setTitle('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create maintenance ticket');
    }
  };

  const handleResolveTicket = async (reqId: string) => {
    try {
      await maintenanceApi.updateStatus(reqId, {
        status: 'completed',
        release_room: true,
      });
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to resolve ticket');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Engineering & Facility Health"
        title="Maintenance & Asset Work Orders"
        description="Preventive equipment servicing, HVAC telemetry, emergency room repairs, and automatic room blocking integration."
        actions={
          <button
            onClick={() => setIsNewTicketOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-4 py-2 text-xs font-bold text-[#14110f] shadow hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            <span>Log Maintenance Request</span>
          </button>
        }
      />

      <SearchSortControls search={search} onSearchChange={setSearch} sort={sort} onSortChange={setSort} resultCount={visibleRequests.length} placeholder="Search room, asset, issue or status..." sortOptions={[{ value: 'newest', label: 'Newest reported' }, { value: 'priority', label: 'Priority: urgent first' }, { value: 'room', label: 'Room number' }, { value: 'status', label: 'Status A–Z' }]} />

      {/* Tickets List */}
      <div className="rounded-2xl border border-hotel-line bg-hotel-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-hotel-line bg-white/[0.02] text-[11px] text-hotel-muted uppercase tracking-wider">
                <th className="py-3.5 px-4 font-medium">Room / Asset</th>
                <th className="py-3.5 px-4 font-medium">Issue Description</th>
                <th className="py-3.5 px-4 font-medium">Priority</th>
                <th className="py-3.5 px-4 font-medium">Status</th>
                <th className="py-3.5 px-4 font-medium">Reported Date</th>
                <th className="py-3.5 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hotel-line">
              {visibleRequests.map((req) => (
                <tr key={req.id} className="hover:bg-[#f7f8f4] transition-colors">
                  <td className="py-3.5 px-4 font-serif font-bold text-hotel-gold">
                    {req.room ? `Room ${req.room.room_number}` : 'Central Facility'}
                    <div className="text-[10px] text-hotel-muted font-normal">{req.equipment_name}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-hotel-text">{req.title}</div>
                    <div className="text-[11px] text-hotel-muted">{req.description}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        req.priority === 'emergency' || req.priority === 'high'
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          : 'bg-white/5 text-hotel-muted'
                      }`}
                    >
                      {req.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={req.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-hotel-muted">
                    {req.created_at.split('T')[0]}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {req.status !== 'completed' ? (
                      <button
                        onClick={() => handleResolveTicket(req.id)}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-900/60 transition-colors"
                      >
                        Mark Resolved
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Resolved
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MAINTENANCE MODAL */}
      <Modal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        title="Log Maintenance Work Order"
        subtitle="Engineering & Facility"
        maxWidth="md"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
          <div>
            <label className="text-hotel-muted font-medium">Affecting Room (Optional)</label>
            <select
              value={ticketRoomId}
              onChange={(e) => setTicketRoomId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-panel p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
            >
              <option value="">No specific room (Central plant / lobby)</option>
              {allRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number} ({r.room_type?.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-hotel-muted font-medium">Equipment Name *</label>
            <input
              required
              type="text"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="text-hotel-muted font-medium">Issue Title *</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AC Thermostat Err-04"
              className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="text-hotel-muted font-medium">Detailed Symptoms & Work Order</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="blockRoom"
              checked={blockRoom}
              onChange={(e) => setBlockRoom(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-hotel-accent focus:ring-0"
            />
            <label htmlFor="blockRoom" className="text-xs text-hotel-muted">
              Immediately mark room as <strong>Maintenance</strong> (Blocked from new bookings)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-hotel-line">
            <button
              type="button"
              onClick={() => setIsNewTicketOpen(false)}
              className="rounded-lg border border-hotel-line px-4 py-2 font-medium text-hotel-muted hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-4 py-2 font-bold text-[#14110f] hover:opacity-95 transition-opacity"
            >
              Dispatch Ticket
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


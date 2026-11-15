import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  User,
  BedDouble,
  DollarSign,
  Info,
} from 'lucide-react';
import { reservationsApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const CalendarPage: React.FC = () => {
  const [baseDate, setBaseDate] = useState<Date>(new Date());
  const [floorFilter, setFloorFilter] = useState<number>(0); // 0 = all floors
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  const { data: timeline = [], isLoading } = useQuery({
    queryKey: ['calendar_timeline'],
    queryFn: reservationsApi.getCalendarTimeline,
  });

  // Generate 14 days grid from baseDate
  const days: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    days.push(d);
  }

  const handlePrevWeek = () => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - 7);
    setBaseDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + 7);
    setBaseDate(d);
  };

  const handleToday = () => {
    setBaseDate(new Date());
  };

  const filteredTimeline = floorFilter === 0
    ? timeline
    : timeline.filter((room: any) => room.floor === floorFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Visual Room Grid"
        title="Interactive Booking Calendar"
        description="Comprehensive room-based reservation timeline. Track occupancy blocks, view guest details, and identify available rooms."
        actions={
          <div className="flex items-center gap-3">
            {/* Floor selector */}
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(Number(e.target.value))}
              className="rounded-lg border border-hotel-line bg-hotel-panel px-3 py-1.5 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
            >
              <option value={0}>All Floors (40 Rooms)</option>
              <option value={1}>1st Floor (Garden)</option>
              <option value={2}>2nd Floor (Suites)</option>
              <option value={3}>3rd Floor (Executive)</option>
              <option value={4}>4th Floor (Penthouse)</option>
            </select>

            {/* Date Navigation */}
            <div className="flex items-center gap-1 rounded-lg border border-hotel-line bg-hotel-panel p-1">
              <button
                onClick={handlePrevWeek}
                className="rounded p-1 text-hotel-muted hover:bg-white/5 hover:text-hotel-text transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleToday}
                className="rounded px-2.5 py-1 text-xs font-semibold text-hotel-gold hover:bg-white/5 transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleNextWeek}
                className="rounded p-1 text-hotel-muted hover:bg-white/5 hover:text-hotel-text transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        }
      />

      {/* Timeline Grid */}
      <div className="rounded-2xl border border-hotel-line bg-hotel-panel overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Calendar Days Header */}
            <div className="flex border-b border-hotel-line bg-hotel-bg">
              <div className="w-52 shrink-0 border-r border-hotel-line p-3 text-xs font-bold uppercase tracking-wider text-hotel-muted">
                Room & Category
              </div>
              <div className="flex flex-1">
                {days.map((day, idx) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={idx}
                      className={`flex-1 border-r border-hotel-line p-2 text-center text-xs transition-colors ${
                        isToday ? 'bg-hotel-accent/15 border-b-2 border-b-hotel-accent' : ''
                      }`}
                    >
                      <div className="text-[10px] uppercase text-hotel-muted font-medium">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className={`mt-0.5 font-bold ${isToday ? 'text-hotel-accent' : 'text-hotel-text'}`}>
                        {day.getDate()} {day.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Room Rows */}
            {isLoading ? (
              <div className="py-12 text-center text-xs text-hotel-muted">
                Loading calendar grid...
              </div>
            ) : (
              <div className="divide-y divide-hotel-line">
                {filteredTimeline.map((room: any) => (
                  <div key={room.room_id} className="flex hover:bg-white/[0.01] transition-colors">
                    {/* Room Info Cell */}
                    <div className="w-52 shrink-0 border-r border-hotel-line p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-sm font-bold text-hotel-gold">
                          Room {room.room_number}
                        </span>
                        <StatusBadge status={room.status} type="room" size="sm" />
                      </div>
                      <div className="text-[10px] text-hotel-muted truncate mt-0.5">
                        {room.room_type_name}
                      </div>
                    </div>

                    {/* Timeline Days Cells */}
                    <div className="flex flex-1 relative">
                      {days.map((day, dayIdx) => {
                        const dayStr = day.toISOString().split('T')[0];

                        // Find if room has a reservation covering this day
                        const booking = room.bookings?.find((b: any) => {
                          const cin = b.check_in_date;
                          const cout = b.check_out_date;
                          return dayStr >= cin && dayStr < cout;
                        });

                        return (
                          <div
                            key={dayIdx}
                            className="flex-1 border-r border-hotel-line p-1 min-h-[50px] relative flex items-center justify-center"
                          >
                            {booking && (
                              <button
                                onClick={() => setSelectedBooking({ ...booking, room_number: room.room_number })}
                                className="w-full h-8 rounded-md bg-gradient-to-r from-hotel-accent to-[#d8a855] px-2 text-left text-[10px] font-bold text-[#14110f] shadow-md truncate hover:opacity-95 transition-opacity"
                              >
                                <div className="truncate">{booking.guest_name}</div>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Details Popover Modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Reservation Details"
        subtitle={`Room ${selectedBooking?.room_number}`}
        maxWidth="md"
      >
        {selectedBooking && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-hotel-line bg-white/[0.02] p-4 text-hotel-text">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-lg font-bold">{selectedBooking.guest_name}</h4>
                  <span className="text-hotel-accent font-mono text-[11px]">
                    {selectedBooking.reservation_number}
                  </span>
                </div>
                <StatusBadge status={selectedBooking.status} type="reservation" size="md" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-hotel-line pt-3 text-hotel-muted">
                <div>
                  <span className="text-[10px] uppercase">Stay Range</span>
                  <div className="font-medium text-hotel-text">
                    {selectedBooking.check_in_date} → {selectedBooking.check_out_date}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase">Total Nights</span>
                  <div className="font-medium text-hotel-text">{selectedBooking.nights} Nights</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase">Total Tariff</span>
                  <div className="font-serif text-sm font-bold text-hotel-gold">
                    {selectedBooking.total_amount?.toLocaleString()} BDT
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBooking(null)}
                className="rounded-lg border border-hotel-line px-4 py-2 font-medium text-hotel-muted hover:bg-white/5 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};


import React from 'react';
import { clsx } from 'clsx';
import { RoomStatus, ReservationStatus, VIPStatus } from '../../types';

interface StatusBadgeProps {
  status: RoomStatus | ReservationStatus | VIPStatus | string;
  type?: 'room' | 'reservation' | 'vip' | 'generic';
  size?: 'sm' | 'md';
}

const tones = {
  success: 'border-[#b8d3c6] bg-[#e7f1ec] text-[#285f4e] before:bg-[#3f846c]',
  info: 'border-[#bdccd4] bg-[#eaf0f3] text-[#345d6b] before:bg-[#568294]',
  warning: 'border-[#dfc991] bg-[#f8efdc] text-[#74551d] before:bg-[#b9872e]',
  danger: 'border-[#e1b9b5] bg-[#f7e9e7] text-[#8a4039] before:bg-[#b95f55]',
  violet: 'border-[#cec4d8] bg-[#f0ecf3] text-[#654e76] before:bg-[#826a96]',
  neutral: 'border-[#ccd3cf] bg-[#eef1ef] text-[#53635d] before:bg-[#778680]',
};

const labels: Record<string, string> = {
  available: 'Available', clean: 'Available', occupied: 'Occupied', reserved: 'Reserved',
  dirty: 'Dirty', cleaning: 'Cleaning', inspected: 'Inspected', maintenance: 'Maintenance',
  out_of_order: 'Out of Order', confirmed: 'Confirmed', checked_in: 'Checked In',
  checked_out: 'Checked Out', cancelled: 'Cancelled', no_show: 'No Show', pending: 'Pending',
  paid: 'Paid', partially_paid: 'Partially Paid', issued: 'Issued', void: 'Void',
  reported: 'Reported', in_progress: 'In Progress', on_hold: 'On Hold', completed: 'Completed',
  placed: 'Placed', preparing: 'Preparing', ready: 'Ready', served: 'Served',
  charged_to_room: 'Charged to Room', draft: 'Draft', pending_approval: 'Pending Approval',
  approved: 'Approved', ordered: 'Ordered', received: 'Received', active: 'Active',
  platinum: 'VIP Platinum', gold: 'VIP Gold', silver: 'VIP Silver', none: 'Standard',
};

function toneFor(status: string) {
  if (['available', 'clean', 'confirmed', 'paid', 'completed', 'approved', 'received', 'active', 'ready'].includes(status)) return tones.success;
  if (['occupied', 'checked_in', 'in_progress', 'preparing', 'served', 'charged_to_room'].includes(status)) return tones.info;
  if (['dirty', 'reported', 'partially_paid', 'pending', 'issued', 'draft', 'pending_approval', 'ordered', 'placed'].includes(status)) return tones.warning;
  if (['maintenance', 'out_of_order', 'cancelled', 'no_show', 'void', 'failed'].includes(status)) return tones.danger;
  if (['platinum', 'gold'].includes(status)) return tones.violet;
  return tones.neutral;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = String(status).toLowerCase();
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold capitalize leading-none before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:content-[""]',
        toneFor(normalized),
        size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'
      )}
    >
      {labels[normalized] ?? normalized.replace(/_/g, ' ')}
    </span>
  );
};

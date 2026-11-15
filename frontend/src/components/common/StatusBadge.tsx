import React from 'react';
import { clsx } from 'clsx';
import { RoomStatus, ReservationStatus, VIPStatus } from '../../types';

interface StatusBadgeProps {
  status: RoomStatus | ReservationStatus | VIPStatus | string;
  type?: 'room' | 'reservation' | 'vip' | 'generic';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'generic',
  size = 'md',
}) => {
  const getBadgeConfig = () => {
    const s = String(status).toLowerCase();

    // Room Statuses
    if (s === 'available' || s === 'clean') {
      return {
        label: 'Available',
        bg: 'bg-emerald-950/60',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-400',
      };
    }
    if (s === 'occupied') {
      return {
        label: 'Occupied',
        bg: 'bg-purple-950/60',
        text: 'text-purple-300',
        border: 'border-purple-500/30',
        dot: 'bg-purple-400',
      };
    }
    if (s === 'reserved') {
      return {
        label: 'Reserved',
        bg: 'bg-sky-950/60',
        text: 'text-sky-300',
        border: 'border-sky-500/30',
        dot: 'bg-sky-400',
      };
    }
    if (s === 'dirty') {
      return {
        label: 'Dirty',
        bg: 'bg-amber-950/60',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        dot: 'bg-amber-400',
      };
    }
    if (s === 'cleaning') {
      return {
        label: 'Cleaning',
        bg: 'bg-yellow-950/60',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        dot: 'bg-yellow-400',
      };
    }
    if (s === 'inspected') {
      return {
        label: 'Inspected',
        bg: 'bg-teal-950/60',
        text: 'text-teal-300',
        border: 'border-teal-500/30',
        dot: 'bg-teal-400',
      };
    }
    if (s === 'maintenance') {
      return {
        label: 'Maintenance',
        bg: 'bg-rose-950/60',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        dot: 'bg-rose-400',
      };
    }
    if (s === 'out_of_order') {
      return {
        label: 'Out of Order',
        bg: 'bg-stone-900',
        text: 'text-stone-400',
        border: 'border-stone-700',
        dot: 'bg-stone-500',
      };
    }

    // Reservation Statuses
    if (s === 'confirmed') {
      return {
        label: 'Confirmed',
        bg: 'bg-emerald-950/60',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-400',
      };
    }
    if (s === 'checked_in') {
      return {
        label: 'Checked In',
        bg: 'bg-indigo-950/60',
        text: 'text-indigo-300',
        border: 'border-indigo-500/30',
        dot: 'bg-indigo-400',
      };
    }
    if (s === 'checked_out') {
      return {
        label: 'Checked Out',
        bg: 'bg-stone-900',
        text: 'text-stone-400',
        border: 'border-stone-700',
        dot: 'bg-stone-400',
      };
    }
    if (s === 'cancelled') {
      return {
        label: 'Cancelled',
        bg: 'bg-rose-950/60',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        dot: 'bg-rose-400',
      };
    }

    // VIP Statuses
    if (s === 'platinum') {
      return {
        label: 'VIP Platinum',
        bg: 'bg-purple-950/80',
        text: 'text-purple-300',
        border: 'border-purple-400/40',
        dot: 'bg-purple-400',
      };
    }
    if (s === 'gold') {
      return {
        label: 'VIP Gold',
        bg: 'bg-amber-950/80',
        text: 'text-amber-300',
        border: 'border-amber-400/40',
        dot: 'bg-amber-400',
      };
    }
    if (s === 'silver') {
      return {
        label: 'VIP Silver',
        bg: 'bg-slate-900',
        text: 'text-slate-300',
        border: 'border-slate-500/40',
        dot: 'bg-slate-400',
      };
    }

    return {
      label: s.replace(/_/g, ' '),
      bg: 'bg-stone-900',
      text: 'text-stone-300',
      border: 'border-stone-700',
      dot: 'bg-stone-400',
    };
  };

  const config = getBadgeConfig();

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-medium capitalize transition-colors',
        config.bg,
        config.text,
        config.border,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
};


import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  WifiOff,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Info,
  CalendarCheck,
  UserPlus,
  UtensilsCrossed,
  Menu,
} from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import { settingsApi } from '../../api/endpoints';
import { NotificationItem } from '../../types';

interface TopbarProps {
  onOpenMenu?: () => void;
  onQuickBooking?: () => void;
  onQuickCheckIn?: () => void;
  onQuickOrder?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMenu,
  onQuickBooking,
  onQuickCheckIn,
  onQuickOrder,
}) => {
  const { isConnected } = useSocket();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    settingsApi.getNotifications().then(setNotifications).catch(() => {});
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="sticky top-0 z-20 flex h-[68px] w-full items-center justify-between border-b border-hotel-line bg-[#fffefb]/92 px-3 shadow-[0_7px_25px_rgba(18,62,51,.05)] backdrop-blur-xl sm:px-5">
      {/* Search Input */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button onClick={onOpenMenu} className="rounded-lg border border-hotel-line bg-white p-2 text-[#174b40] lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
        <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hotel-muted" />
        <input
          type="text"
          placeholder="Global search rooms, guests, folios..."
          className="w-full rounded-lg border border-hotel-line bg-[#f8faf7] py-2 pl-9 pr-4 text-xs text-hotel-text placeholder:text-hotel-muted/70 focus:border-[#b9974b] focus:outline-none focus:ring-2 focus-[#b9974b]/15 transition-all"
        />
        </div>
      </div>

      {/* Right Controls */}
      <div className="ml-3 flex items-center gap-2 sm:gap-3.5">
        {/* Date Time */}
        <div className="hidden text-xs font-medium text-hotel-muted xl:block">
          {currentTime}
        </div>

        {/* Real-time Status */}
        <div
          title={isConnected ? 'Live WebSocket Connected' : 'Reconnecting WebSocket'}
          className="hidden items-center gap-1.5 rounded-full border border-hotel-line bg-white px-2.5 py-1 text-[11px] text-hotel-muted sm:flex"
        >
          {isConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-medium">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-amber-500" />
              <span className="text-amber-400 font-medium">Connecting</span>
            </>
          )}
        </div>

        {/* Quick Actions Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="flex items-center gap-1.5 rounded-lg border border-[#0d4b3d] bg-[#0d4b3d] px-3 py-2 text-xs font-bold text-white shadow-[0_5px_16px_rgba(13,75,61,.18)] hover:bg-[#083d32] transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Quick Action</span>
          </button>

          {showQuickActions && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-hotel-line bg-white p-1.5 shadow-[0_15px_50px_rgba(18,62,51,.16)]">
              <button
                onClick={() => {
                  setShowQuickActions(false);
                  onQuickBooking?.();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-hotel-text hover:bg-white/5 transition-colors"
              >
                <CalendarCheck className="h-4 w-4 text-hotel-accent" />
                <span>New Reservation</span>
              </button>
              <button
                onClick={() => {
                  setShowQuickActions(false);
                  onQuickCheckIn?.();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-hotel-text hover:bg-white/5 transition-colors"
              >
                <UserPlus className="h-4 w-4 text-emerald-400" />
                <span>Walk-In Check-In</span>
              </button>
              <button
                onClick={() => {
                  setShowQuickActions(false);
                  onQuickOrder?.();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-hotel-text hover:bg-white/5 transition-colors"
              >
                <UtensilsCrossed className="h-4 w-4 text-hotel-gold" />
                <span>New Restaurant Order</span>
              </button>
            </div>
          )}
        </div>

        {/* Notification Center */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative rounded-lg border border-hotel-line bg-white p-2 text-hotel-muted hover:bg-[#f4f6f2] hover:text-hotel-text transition-colors"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-hotel-accent text-[9px] font-bold text-[#14110f]">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-hotel-line bg-white p-3 shadow-[0_20px_60px_rgba(18,62,51,.18)]">
              <div className="flex items-center justify-between border-b border-hotel-line pb-2">
                <span className="font-serif text-sm font-medium text-hotel-text">
                  Notifications
                </span>
                <span className="text-[10px] text-hotel-muted">
                  {unreadCount} Unread
                </span>
              </div>

              <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-xs text-hotel-muted">
                    No new notifications
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-lg border border-hotel-line bg-white/[0.02] p-2.5 text-xs transition-colors hover:bg-[#f2f5f1]"
                    >
                      <div className="flex items-center gap-1.5 font-medium text-hotel-text">
                        {n.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                        {n.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                        {n.type === 'info' && <Info className="h-3.5 w-3.5 text-sky-400" />}
                        <span>{n.title}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-hotel-muted">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};


import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  ConciergeBell,
  BedDouble,
  Sparkles,
  Users,
  UtensilsCrossed,
  Receipt,
  Boxes,
  Truck,
  Wrench,
  UserCheck,
  TrendingUp,
  FileBarChart2,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  ChevronLeft,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../contexts/AuthContext';

const NAV_GROUPS = [
  {
    title: 'Operations',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Front Desk', path: '/frontdesk', icon: ConciergeBell },
      { name: 'Booking Calendar', path: '/calendar', icon: Calendar },
      { name: 'Reservations', path: '/reservations', icon: CalendarCheck },
      { name: 'Rooms & Floors', path: '/rooms', icon: BedDouble },
      { name: 'Housekeeping', path: '/housekeeping', icon: Sparkles },
    ],
  },
  {
    title: 'Hospitality',
    items: [
      { name: 'Guests & CRM', path: '/guests', icon: Users },
      { name: 'Restaurant & POS', path: '/restaurant', icon: UtensilsCrossed },
      { name: 'Billing & Folios', path: '/finance', icon: Receipt },
    ],
  },
  {
    title: 'Logistics & Assets',
    items: [
      { name: 'Inventory', path: '/inventory', icon: Boxes },
      { name: 'Procurement', path: '/procurement', icon: Truck },
      { name: 'Maintenance', path: '/maintenance', icon: Wrench },
    ],
  },
  {
    title: 'Enterprise',
    items: [
      { name: 'Employees & HR', path: '/employees', icon: UserCheck },
      { name: 'Revenue & Rates', path: '/revenue', icon: TrendingUp },
      { name: 'Reports & Analytics', path: '/reports', icon: FileBarChart2 },
      { name: 'Settings & Audit', path: '/settings', icon: Settings },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, collapsed, onClose, onToggleCollapse }) => {
  const { user, logout } = useAuth();

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-hotel-line bg-[#083d32] text-white shadow-[18px_0_55px_rgba(5,35,29,.14)] transition-all duration-300 ${collapsed ? 'w-[82px]' : 'w-64'} ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      {/* Brand Header */}
      <div className={`flex h-[68px] items-center border-b border-hotel-line ${collapsed ? 'justify-center px-3' : 'gap-3 px-5'}`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-hotel-accent to-hotel-gold shadow-[0_0_15px_rgba(239,143,49,0.3)]">
          <Building2 className="h-5 w-5 text-[#14110f]" />
        </div>
        {!collapsed && <div className="flex flex-col">
          <span className="font-serif text-lg font-bold tracking-tight text-hotel-text">
            Hotel<span className="text-hotel-accent">OS</span>
          </span>
          <span className="text-[9px] uppercase tracking-widest text-hotel-muted font-medium">
            Property PMS
          </span>
        </div>}
        <button onClick={onClose} className="ml-auto rounded-lg p-2 text-white/65 hover:bg-white/10 lg:hidden" aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>

      {/* Active Property Selector */}
      {!collapsed && <div className="mx-3 mt-4 flex items-center justify-between rounded-xl border border-hotel-line bg-white/[0.055] px-3 py-3 text-xs">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-hotel-gold">
            Current Property
          </span>
          <span className="truncate font-medium text-hotel-text">
            Grand Residence Dhaka
          </span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-hotel-muted" />
      </div>}

      {/* Nav Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && <span className="px-3 text-[9px] font-bold uppercase tracking-[.18em] text-white/45">
              {group.title}
            </span>}
            <div className="mt-1 space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  title={collapsed ? item.name : undefined}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center rounded-lg py-2.5 text-xs font-medium transition-all duration-200',
                      collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                      isActive
                        ? 'bg-[#f5f0e3] text-[#124c40] font-semibold shadow-[0_8px_20px_rgba(0,0,0,.12)]'
                        : 'text-white/68 hover:bg-white/[0.07] hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={clsx(
                          'h-4 w-4 transition-colors',
                          isActive ? 'text-[#124c40]' : 'text-white/55 group-hover:text-white'
                        )}
                      />
                      {!collapsed && <span>{item.name}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile & Logout */}
      <div className="border-t border-hotel-line p-3">
        <div className={`flex items-center rounded-xl bg-white/[0.045] p-2.5 border border-hotel-line ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-hotel-gold to-hotel-accent font-bold text-xs text-[#14110f]">
              {user?.first_name?.[0] || 'A'}
            </div>
            {!collapsed && <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-semibold text-hotel-text">
                {user ? `${user.first_name} ${user.last_name}` : 'Admin'}
              </span>
              <span className="truncate text-[10px] capitalize text-hotel-muted">
                {user?.role?.replace(/_/g, ' ') || 'Super Admin'}
              </span>
            </div>}
          </div>
          {!collapsed && <button
            onClick={logout}
            title="Log out"
            className="rounded-md p-1.5 text-hotel-muted hover:bg-white/10 hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>}
        </div>
      </div>
      <button onClick={onToggleCollapse} className="absolute -right-3 top-20 hidden h-7 w-7 items-center justify-center rounded-full border border-[#d7ddd7] bg-white text-[#174b40] shadow-md lg:flex" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>
    </aside>
  );
};


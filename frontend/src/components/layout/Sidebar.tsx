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
    <aside className={`glass-sidebar fixed bottom-2.5 left-2.5 top-2.5 z-40 flex flex-col overflow-visible rounded-[28px] border border-white/30 text-white transition-[width,transform] duration-300 ease-out ${collapsed ? 'w-[76px]' : 'w-[268px]'} ${open ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)] lg:translate-x-0'}`}>
      {/* Brand Header */}
      <div className={`relative z-10 flex h-[74px] shrink-0 items-center border-b border-white/[0.12] ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br from-[#d7a13a] to-[#b97818] shadow-[0_8px_22px_rgba(5,20,20,.25),inset_0_1px_0_rgba(255,255,255,.32)]">
          <Building2 className="h-5 w-5 text-[#14110f]" />
        </div>
        {!collapsed && <div className="flex flex-col">
          <span className="font-serif text-[19px] font-bold leading-5 tracking-tight text-[#fffdf7]">
            Hotel<span className="text-hotel-accent">OS</span>
          </span>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[.17em] text-white/55">
            Property PMS
          </span>
        </div>}
        <button onClick={onClose} className="ml-auto rounded-lg p-2 text-white/65 hover:bg-white/10 lg:hidden" aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>

      {/* Active Property Selector */}
      {!collapsed && <div className="relative z-10 mx-3 mt-3.5 flex min-h-[56px] items-center justify-between rounded-2xl border border-white/25 bg-white/[0.075] px-3.5 py-2.5 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,.1),0_8px_22px_rgba(3,19,21,.1)]">
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-bold uppercase tracking-[.14em] text-[#e5b957]">
            Current Property
          </span>
          <span className="mt-0.5 truncate text-[12px] font-semibold text-white">
            Grand Residence Dhaka
          </span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-white/55" />
      </div>}

      {/* Nav Navigation */}
      <nav className={`sidebar-nav relative z-10 flex-1 overflow-y-auto px-3 py-3.5 ${collapsed ? 'space-y-2.5' : 'space-y-4'}`}>
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && <span className="sidebar-group-title block px-3 text-[9px] font-bold uppercase tracking-[.17em] text-white/46">
              {group.title}
            </span>}
            <div className={`${collapsed ? 'space-y-1' : 'mt-1.5 space-y-0.5'}`}>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  title={collapsed ? item.name : undefined}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      'group relative flex items-center rounded-xl border border-transparent text-xs font-medium transition-all duration-200',
                      collapsed ? 'h-10 justify-center px-2' : 'h-9 gap-2.5 px-2.5',
                      isActive
                        ? 'border-white/70 bg-[#f4f7f4]/95 text-[#123b35] font-semibold shadow-[0_9px_22px_rgba(0,0,0,.17),inset_0_1px_0_rgba(255,255,255,.9)]'
                        : 'text-white/72 hover:bg-white/[0.11] hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={clsx('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors', isActive ? 'bg-[#dfe9e4] shadow-[inset_0_1px_0_rgba(255,255,255,.8)]' : 'bg-transparent group-hover:bg-white/[0.08]')}>
                        <item.icon className={clsx(
                          'h-[15px] w-[15px] transition-colors',
                          isActive ? 'text-[#124c40]' : 'text-white/55 group-hover:text-white'
                        )} />
                      </span>
                      {!collapsed && <span>{item.name}</span>}
                      {collapsed && <span className="sidebar-tooltip pointer-events-none absolute left-[calc(100%+14px)] z-50 whitespace-nowrap rounded-lg border border-white/20 bg-[#102b2c]/95 px-3 py-2 text-[11px] font-semibold text-white opacity-0 shadow-xl backdrop-blur-xl transition-all group-hover:translate-x-0 group-hover:opacity-100">{item.name}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile & Logout */}
      <div className="relative z-10 shrink-0 border-t border-white/[0.12] p-2.5">
        <div className={`flex min-h-[58px] items-center rounded-2xl border border-white/20 bg-white/[0.085] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.1)] ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-[#dfae4d] to-[#b9791d] font-bold text-xs text-[#17130e] shadow-[0_6px_16px_rgba(0,0,0,.18)]">
              {user?.first_name?.[0] || 'A'}
            </div>
            {!collapsed && <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-semibold text-white">
                {user ? `${user.first_name} ${user.last_name}` : 'Admin'}
              </span>
              <span className="truncate text-[11px] capitalize text-white/55">
                {user?.role?.replace(/_/g, ' ') || 'Super Admin'}
              </span>
            </div>}
          </div>
          {!collapsed && <button
            onClick={logout}
            title="Log out"
            aria-label="Log out"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-white/50 transition-colors hover:border-rose-300/15 hover:bg-rose-400/10 hover:text-rose-200"
          >
            <LogOut className="h-4 w-4" />
          </button>}
        </div>
      </div>
      <button onClick={onToggleCollapse} className="group absolute -right-3 top-[72px] hidden h-[30px] w-[30px] items-center justify-center rounded-full border border-[#d7ad56]/45 bg-[#103f38]/92 text-[#efc66c] shadow-[0_9px_24px_rgba(2,19,21,.34),inset_0_1px_0_rgba(255,255,255,.14),0_0_0_3px_rgba(8,40,37,.12)] backdrop-blur-xl transition duration-200 hover:scale-105 hover:border-[#edc976]/70 hover:bg-[#185248] hover:text-[#ffe2a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7bd66]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b332f] lg:flex" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <ChevronLeft className={`h-3.5 w-3.5 stroke-[2.25] transition-transform duration-300 group-hover:-translate-x-px ${collapsed ? 'rotate-180 group-hover:translate-x-px' : ''}`} />
      </button>
    </aside>
  );
};


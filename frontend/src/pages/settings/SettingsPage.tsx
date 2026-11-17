import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Building,
  Shield,
  FileText,
  Save,
  CheckCircle2,
  Clock,
  DollarSign,
  Percent,
  Plus,
  Pencil,
  Trash2,
  Users,
  Moon,
  Sun,
} from 'lucide-react';
import { settingsApi, StaffAccountInput } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { Hotel, AuditLogItem, User, UserRole } from '../../types';
import { SearchSortControls } from '../../components/common/SearchSortControls';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: 'hotel_manager', label: 'Manager' }, { value: 'general_manager', label: 'General Manager' },
  { value: 'receptionist', label: 'Reception' }, { value: 'accountant', label: 'Accounts' },
  { value: 'housekeeping_staff', label: 'Housekeeping' }, { value: 'restaurant_manager', label: 'Restaurant Manager' },
  { value: 'restaurant_staff', label: 'Restaurant Staff' }, { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'maintenance_staff', label: 'Maintenance' },
];

const blankAccount: StaffAccountInput = { username: '', email: '', first_name: '', last_name: '', role: 'receptionist', access_pin: '', is_active: true };

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: signedInUser } = useAuth();
  const { isNightMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'hotel' | 'users' | 'audit'>('hotel');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditSort, setAuditSort] = useState('newest');
  const [userSearch, setUserSearch] = useState('');
  const [userSort, setUserSort] = useState('name');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [accountForm, setAccountForm] = useState<StaffAccountInput>(blankAccount);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const { data: hotel, isLoading } = useQuery({
    queryKey: ['hotel_settings'],
    queryFn: settingsApi.getHotel,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit_logs'],
    queryFn: settingsApi.getAuditLogs,
    enabled: activeTab === 'audit',
  });
  const { data: users = [] } = useQuery({ queryKey: ['staff_users'], queryFn: settingsApi.getUsers, enabled: activeTab === 'users' });
  const visibleUsers = users.filter((staff) => `${staff.first_name} ${staff.last_name} ${staff.username} ${staff.email} ${staff.role}`.toLowerCase().includes(userSearch.toLowerCase())).sort((a, b) => userSort === 'role' ? a.role.localeCompare(b.role) : userSort === 'status' ? Number(b.is_active) - Number(a.is_active) : `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
  const visibleAuditLogs = auditLogs.filter((log) => `${log.action} ${log.entity_type} ${log.entity_id} ${log.details} ${log.user?.username || 'system'}`.toLowerCase().includes(auditSearch.toLowerCase())).sort((a, b) => auditSort === 'oldest' ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime() : auditSort === 'actor' ? (a.user?.username || 'System').localeCompare(b.user?.username || 'System') : auditSort === 'action' ? a.action.localeCompare(b.action) : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const [form, setForm] = useState({
    name: '',
    tagline: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    currency: 'BDT',
    taxRate: 15.0,
    serviceChargeRate: 10.0,
    checkInTime: '14:00',
    checkOutTime: '11:00',
  });

  useEffect(() => {
    if (hotel) {
      setForm({
        name: hotel.name,
        tagline: hotel.tagline,
        description: hotel.description,
        address: hotel.address,
        phone: hotel.phone,
        email: hotel.email,
        currency: hotel.currency,
        taxRate: hotel.tax_rate,
        serviceChargeRate: hotel.service_charge_rate,
        checkInTime: hotel.check_in_time,
        checkOutTime: hotel.check_out_time,
      });
    }
  }, [hotel]);

  const handleSaveHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await settingsApi.updateHotel({
        name: form.name,
        tagline: form.tagline,
        description: form.description,
        address: form.address,
        phone: form.phone,
        email: form.email,
        currency: form.currency,
        tax_rate: Number(form.taxRate),
        service_charge_rate: Number(form.serviceChargeRate),
        check_in_time: form.checkInTime,
        check_out_time: form.checkOutTime,
      });
      alert('Hotel configuration saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['hotel_settings'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update hotel settings');
    }
  };

  const openAccount = (staff?: User) => {
    setEditingUser(staff || null);
    setAccountForm(staff ? { username: staff.username, email: staff.email, first_name: staff.first_name, last_name: staff.last_name, role: staff.role, access_pin: '', is_active: staff.is_active } : blankAccount);
    setAccountModalOpen(true);
  };

  const saveAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingUser) await settingsApi.updateUser(editingUser.id, accountForm);
      else await settingsApi.createUser(accountForm);
      setAccountModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['staff_users'] });
    } catch (err: any) { alert(err.response?.data?.error || 'Failed to save staff account'); }
  };

  const deleteAccount = async (staff: User) => {
    if (!window.confirm(`Delete ${staff.first_name} ${staff.last_name}'s staff account?`)) return;
    try { await settingsApi.deleteUser(staff.id); queryClient.invalidateQueries({ queryKey: ['staff_users'] }); }
    catch (err: any) { alert(err.response?.data?.error || 'Failed to delete staff account'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="System Administration"
        title="Settings & Audit Trail"
        description="Configure property policies, legal business tax rates, check-in schedules, and inspect the tamper-evident system audit log."
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-hotel-line pb-4">
        <button
          onClick={() => setActiveTab('hotel')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === 'hotel'
              ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
              : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
          }`}
        >
          Hotel Profile & Policies
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${activeTab === 'users' ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]' : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'}`}
        >
          Staff Accounts
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === 'audit'
              ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
              : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
          }`}
        >
          System Audit Trail
        </button>
      </div>

      {activeTab === 'hotel' && (
        <form onSubmit={handleSaveHotel} className="space-y-6 max-w-4xl">
          <section className="rounded-2xl border border-hotel-line bg-hotel-panel p-5 sm:p-6" aria-labelledby="appearance-heading">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-hotel-line bg-hotel-panel2 text-hotel-accent">
                  {isNightMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </span>
                <div>
                  <span className="kicker">Appearance</span>
                  <h2 id="appearance-heading" className="mt-1 text-base font-bold text-hotel-text">Night mode</h2>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-hotel-muted">Use the low-glare charcoal workspace across every operational module. Your choice is saved on this device.</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isNightMode}
                onClick={toggleTheme}
                className={`theme-switch relative flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs font-bold transition sm:w-auto ${isNightMode ? 'border-hotel-accent bg-hotel-accent/10 text-hotel-accent' : 'border-hotel-line bg-hotel-panel2 text-hotel-text'}`}
              >
                <span>{isNightMode ? 'Night mode on' : 'Night mode off'}</span>
                <span className={`relative h-6 w-11 rounded-full transition ${isNightMode ? 'bg-hotel-accent' : 'bg-hotel-line'}`} aria-hidden="true">
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${isNightMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </span>
              </button>
            </div>
          </section>
          <div className="rounded-2xl border border-hotel-line bg-hotel-panel p-6 space-y-4">
            <span className="kicker">Brand Identity</span>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-hotel-muted font-medium">Hotel Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-hotel-muted font-medium">Tagline</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="text-hotel-muted font-medium">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-hotel-line bg-hotel-panel p-6 space-y-4">
            <span className="kicker">Financial & Tax Policies</span>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-hotel-muted font-medium">Base Currency</label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-hotel-muted font-medium">Government VAT Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.taxRate}
                  onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-hotel-muted font-medium">Hospitality Service Charge (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.serviceChargeRate}
                  onChange={(e) => setForm({ ...form, serviceChargeRate: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-hotel-muted font-medium">Standard Check-In Time</label>
                <input
                  type="text"
                  value={form.checkInTime}
                  onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-hotel-muted font-medium">Standard Check-Out Time</label>
                <input
                  type="text"
                  value={form.checkOutTime}
                  onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-5 py-2.5 text-xs font-bold text-[#14110f] shadow hover:opacity-95 transition-opacity"
            >
              <Save className="h-4 w-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'users' && (
        <div className="rounded-2xl border border-hotel-line bg-hotel-panel overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-hotel-line p-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1"><span className="kicker">Access Control</span><h3 className="font-serif text-lg font-bold text-hotel-text">Staff Account Management</h3><div className="mt-4"><SearchSortControls compact search={userSearch} onSearchChange={setUserSearch} sort={userSort} onSortChange={setUserSort} resultCount={visibleUsers.length} placeholder="Search staff name, username, email or role..." sortOptions={[{ value: 'name', label: 'Staff name A–Z' }, { value: 'role', label: 'Role A–Z' }, { value: 'status', label: 'Active accounts first' }]} /></div></div>
            <button onClick={() => openAccount()} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-hotel-accent px-4 text-xs font-bold text-[#14110f]"><Plus className="h-4 w-4" /> Add Staff Account</button>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-hotel-line bg-white/[0.02] text-[11px] uppercase tracking-wider text-hotel-muted"><th className="px-4 py-3">Staff member</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-hotel-line">{visibleUsers.map((staff) => { const protectedAdmin = staff.role === 'super_admin' && signedInUser?.role !== 'super_admin'; return <tr key={staff.id} className="hover:bg-[#f7f8f4]"><td className="px-4 py-3"><div className="font-semibold text-hotel-text">{staff.first_name} {staff.last_name}</div><div className="text-[10px] text-hotel-muted">{staff.email}</div></td><td className="px-4 py-3 font-mono text-hotel-accent">{staff.username}</td><td className="px-4 py-3 capitalize text-hotel-text">{staff.role.replace(/_/g, ' ')}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${staff.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{staff.is_active ? 'Active' : 'Disabled'}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button disabled={protectedAdmin} onClick={() => openAccount(staff)} className="rounded-lg border border-hotel-line p-2 text-hotel-text disabled:cursor-not-allowed disabled:opacity-35" title={protectedAdmin ? 'Super Admin is protected' : 'Edit account'}><Pencil className="h-3.5 w-3.5" /></button><button disabled={protectedAdmin || staff.id === signedInUser?.id} onClick={() => deleteAccount(staff)} className="rounded-lg border border-rose-200 p-2 text-rose-600 disabled:cursor-not-allowed disabled:opacity-35" title="Delete account"><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>; })}</tbody></table></div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-hotel-line bg-hotel-panel overflow-hidden">
          <div className="p-4 border-b border-hotel-line">
            <span className="kicker">Security Log</span>
            <h3 className="font-serif text-lg font-bold text-hotel-text">
              Real-Time Audit Trail
            </h3>
            <div className="mt-4"><SearchSortControls compact search={auditSearch} onSearchChange={setAuditSearch} sort={auditSort} onSortChange={setAuditSort} resultCount={visibleAuditLogs.length} placeholder="Search action, entity, actor or details..." sortOptions={[{ value: 'newest', label: 'Newest activity' }, { value: 'oldest', label: 'Oldest activity' }, { value: 'actor', label: 'Actor A–Z' }, { value: 'action', label: 'Action A–Z' }]} /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-hotel-line bg-white/[0.02] text-[11px] text-hotel-muted uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Timestamp</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                  <th className="py-3 px-4 font-medium">Target Entity</th>
                  <th className="py-3 px-4 font-medium">Details</th>
                  <th className="py-3 px-4 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hotel-line">
                {visibleAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-hotel-muted">
                      No security audit events recorded.
                    </td>
                  </tr>
                ) : (
                  visibleAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#f7f8f4] transition-colors">
                      <td className="py-3 px-4 text-hotel-muted">{log.created_at}</td>
                      <td className="py-3 px-4 font-semibold text-hotel-accent uppercase text-[10px]">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 font-mono text-hotel-text">{log.entity_type}</td>
                      <td className="py-3 px-4 text-hotel-muted max-w-sm truncate">{log.details}</td>
                      <td className="py-3 px-4 text-hotel-gold">{log.user?.username || 'System'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={accountModalOpen} onClose={() => setAccountModalOpen(false)} title={editingUser ? 'Edit Staff Account' : 'Add Staff Account'} subtitle="Manager-controlled system access" maxWidth="lg">
        <form onSubmit={saveAccount} className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
          {([['first_name','First name'],['last_name','Last name'],['username','Username'],['email','Email']] as const).map(([field, label]) => <label key={field}><span className="mb-1 block font-medium text-hotel-muted">{label}</span><input required type={field === 'email' ? 'email' : 'text'} value={accountForm[field]} onChange={(e) => setAccountForm({ ...accountForm, [field]: e.target.value })} className="w-full rounded-lg border border-hotel-line bg-hotel-panel p-2.5 text-hotel-text outline-none focus:border-hotel-accent" /></label>)}
          <label><span className="mb-1 block font-medium text-hotel-muted">Role</span><select value={accountForm.role} onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value as UserRole })} className="w-full rounded-lg border border-hotel-line bg-hotel-panel p-2.5 text-hotel-text">{USER_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
          <label><span className="mb-1 block font-medium text-hotel-muted">{editingUser ? 'New PIN (optional)' : '4-digit access PIN'}</span><input required={!editingUser} inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={accountForm.access_pin || ''} onChange={(e) => setAccountForm({ ...accountForm, access_pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="w-full rounded-lg border border-hotel-line bg-hotel-panel p-2.5 text-hotel-text outline-none focus:border-hotel-accent" /></label>
          <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={accountForm.is_active} onChange={(e) => setAccountForm({ ...accountForm, is_active: e.target.checked })} /> Active account</label>
          <div className="flex justify-end gap-2 border-t border-hotel-line pt-4 sm:col-span-2"><button type="button" onClick={() => setAccountModalOpen(false)} className="rounded-lg border border-hotel-line px-4 py-2 text-hotel-muted">Cancel</button><button type="submit" className="rounded-lg bg-hotel-accent px-5 py-2 font-bold text-[#14110f]">{editingUser ? 'Save Changes' : 'Create Account'}</button></div>
        </form>
      </Modal>
    </div>
  );
};


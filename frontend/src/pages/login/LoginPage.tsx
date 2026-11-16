import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Building2, Eye, EyeOff, LockKeyhole, ShieldCheck, User, UserRound } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardApi } from '../../api/endpoints';
import { preloadDashboard } from '../../preload';
import hotelBackgroundSmall from '../../assets/hotel-login-bg-640.webp';
import hotelBackgroundMedium from '../../assets/hotel-login-bg-1280.webp';
import hotelBackgroundLarge from '../../assets/hotel-login-bg-1920.webp';

const DEMO_USERS = [
  { label: 'Super Admin', username: 'admin' },
  { label: 'Manager', username: 'manager' },
  { label: 'Reception', username: 'reception' },
  { label: 'Accounts', username: 'accountant' },
  { label: 'Housekeeping', username: 'housekeeping' },
];

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const dashboardModules = preloadDashboard();
      await login({ username, password });
      // Start authenticated data loading immediately, but never hold navigation
      // behind it. React Query reuses the in-flight request on the dashboard.
      void dashboardModules.catch(() => undefined);
      void queryClient
        .prefetchQuery({ queryKey: ['dashboard', 'today'], queryFn: dashboardApi.getStats })
        .catch(() => undefined);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'We could not verify that account and access PIN.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoUser = (demoUsername: string) => {
    setUsername(demoUsername);
    setPassword('');
    setError(null);
  };

  return (
    <main className="relative min-h-screen min-h-[100svh] overflow-x-clip overflow-y-auto bg-[#06131d] text-white">
      <picture className="absolute inset-0">
        <source type="image/webp" srcSet={`${hotelBackgroundSmall} 640w, ${hotelBackgroundMedium} 1280w, ${hotelBackgroundLarge} 1672w`} sizes="100vw" />
        <img src={hotelBackgroundMedium} alt="" aria-hidden="true" fetchPriority="high" decoding="async" className="h-full w-full object-cover object-center" />
      </picture>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,13,22,.55)_0%,rgba(3,13,22,.28)_47%,rgba(3,13,22,.68)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,14,23,.2)_0%,rgba(4,14,23,.08)_55%,rgba(4,14,23,.72)_100%)]" />

      <div className="relative mx-auto flex min-h-screen min-h-[100svh] max-w-[1500px] flex-col px-[clamp(1rem,4vw,3rem)] py-[clamp(1rem,2.5vw,1.5rem)]">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-300/40 bg-amber-400/15 shadow-[0_10px_35px_rgba(0,0,0,.25)] backdrop-blur-xl">
              <Building2 className="h-6 w-6 text-[#f6c969]" />
            </div>
            <div>
              <div className="font-serif text-[22px] font-semibold tracking-tight">Hotel<span className="text-[#f2b843]">OS</span></div>
              <div className="text-[10px] font-bold uppercase tracking-[.2em] text-white/65">Property management</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-[#071722]/55 px-4 py-2 text-[11px] font-semibold text-white/75 backdrop-blur-xl sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" /> Secure operations portal
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-[clamp(1.5rem,5vh,3rem)] lg:justify-end">
          <section
            aria-labelledby="login-title"
            className="relative w-full max-w-[420px] overflow-hidden rounded-bl-[26px] rounded-br-[26px] rounded-tr-[26px] rounded-tl-[clamp(4.5rem,14vw,7rem)] border border-[#d8a848]/35 bg-[linear-gradient(150deg,rgba(25,41,50,.97),rgba(7,20,29,.97))] text-[#f8f1e5] shadow-[0_35px_100px_rgba(0,0,0,.62),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-2xl"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#efc15d] to-transparent" />
            <div className="p-[clamp(1.35rem,5vw,2.25rem)] pt-[clamp(2.25rem,7vw,3.25rem)]">
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#edc46d]/45 bg-[radial-gradient(circle_at_35%_25%,rgba(238,193,93,.2),rgba(7,22,31,.8))] shadow-[0_15px_38px_rgba(0,0,0,.4),0_0_0_8px_rgba(232,179,72,.045)]">
                  <UserRound className="h-10 w-10 text-[#f0c86d]" strokeWidth={1.5} />
                </div>
                <div className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-[#d9b45f]">
                  <ShieldCheck className="h-3.5 w-3.5" /> Secure staff access
                </div>
                <h1 id="login-title" className="mt-2 font-serif text-[clamp(1.8rem,6vw,2.15rem)] font-medium leading-tight tracking-[-.025em] text-[#fff8ed]">Welcome back</h1>
                <p className="mt-2 text-[13px] leading-6 tracking-[.01em] text-[#aebdc3]">Sign in to HotelOS operations.</p>
              </div>

              {error && <div id="login-error" role="alert" aria-live="assertive" className="mb-4 rounded-xl border border-rose-400/35 bg-rose-950/45 px-4 py-3 text-sm font-medium text-rose-100">{error}</div>}
              {helpVisible && <div role="status" className="mb-4 rounded-xl border border-[#e2b453]/30 bg-[#e2b453]/10 px-4 py-3 text-xs leading-5 text-[#f4d58f]">Please contact your HotelOS administrator to reset your access PIN.</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-[.15em] text-[#c3cdd1]">Username or email</span>
                  <span className="relative block">
                    <User className="absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-[#e0b65b]" />
                    <input required autoComplete="username" aria-invalid={!!error} aria-describedby={error ? 'login-error' : undefined} value={username} onChange={(event) => setUsername(event.target.value)} className="h-12 w-full border-x-0 border-b border-t-0 border-[#6f8189] bg-transparent pl-8 pr-2 text-base text-[#fff8ec] outline-none transition placeholder:text-[#84959c] focus:border-[#edbd59] focus:ring-0" placeholder="Email ID or username" />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-[.15em] text-[#c3cdd1]">Access PIN</span>
                  <span className="relative block">
                    <LockKeyhole className="absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-[#e0b65b]" />
                    <input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="current-password" aria-label="Four digit access PIN" aria-invalid={!!error} aria-describedby={error ? 'login-error' : undefined} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value.replace(/\D/g, '').slice(0, 4))} className="h-12 w-full border-x-0 border-b border-t-0 border-[#6f8189] bg-transparent pl-8 pr-12 text-base tracking-[.3em] text-[#fff8ec] outline-none transition placeholder:tracking-normal placeholder:text-[#84959c] focus:border-[#edbd59] focus:ring-0" placeholder="4-digit PIN" />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#9eacb2] transition hover:bg-white/5 hover:text-[#f1c76c]">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </span>
                </label>

                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="flex items-center gap-2 text-[#9fb0b6]"><ShieldCheck className="h-3.5 w-3.5 text-[#cba451]" /> Encrypted session</span>
                  <button type="button" onClick={() => setHelpVisible((visible) => !visible)} className="min-h-11 text-[#d8b866] transition hover:text-[#f1d28b]">Forgot PIN?</button>
                </div>

                <button type="submit" disabled={loading} aria-busy={loading} className="group flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#edbd59]/45 bg-[linear-gradient(90deg,#b77a1d,#e1a12c)] px-4 text-xs font-extrabold uppercase tracking-[.16em] text-[#091923] shadow-[0_14px_30px_rgba(0,0,0,.35)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65">
                  {loading ? 'Authenticating…' : 'Login'}
                  {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                </button>
              </form>

              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#c4ced1]">Staff accounts</span>
                  <span className="text-[11px] text-[#82949b]">Select your role</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_USERS.map((demo) => {
                    const isSelected = username === demo.username;
                    return (
                      <button key={demo.username} type="button" aria-pressed={isSelected} onClick={() => selectDemoUser(demo.username)} className={`min-h-14 rounded-xl border px-3 py-2.5 text-left transition ${isSelected ? 'border-[#dfad48] bg-[#dba33a]/15 shadow-[inset_0_0_0_1px_rgba(223,173,72,.15)]' : 'border-white/10 bg-white/[.035] hover:border-[#d1a34d]/50 hover:bg-white/[.065]'}`}>
                        <span className="block text-xs font-bold text-[#f5ecdd]">{demo.label}</span>
                        <span className="mt-0.5 block text-[11px] text-[#91a2a9]">{demo.username}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-2 text-[11px] font-medium tracking-wide text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 HotelOS · Grand Residence Dhaka</span>
          <span>Encrypted access · Live operations · 24/7 availability</span>
        </footer>
      </div>
    </main>
  );
};

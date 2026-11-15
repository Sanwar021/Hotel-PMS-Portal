import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import hotelBackground from '../../assets/hotel-login-bg.png';

const DEMO_USERS = [
  { label: 'Super Admin', username: 'admin', password: 'admin123' },
  { label: 'Reception', username: 'reception', password: 'reception123' },
  { label: 'Accounts', username: 'accountant', password: 'account123' },
  { label: 'Housekeeping', username: 'housekeeping', password: 'clean123' },
];

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ username, password });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'We could not verify those credentials.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoUser = (demoUsername: string, demoPassword: string) => {
    setUsername(demoUsername);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06131d] bg-cover bg-center text-white" style={{ backgroundImage: `url(${hotelBackground})` }}>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,13,22,.55)_0%,rgba(3,13,22,.28)_47%,rgba(3,13,22,.68)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,14,23,.2)_0%,rgba(4,14,23,.08)_55%,rgba(4,14,23,.72)_100%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col px-5 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/40 bg-amber-400/15 shadow-[0_10px_35px_rgba(0,0,0,.25)] backdrop-blur-xl">
              <Building2 className="h-6 w-6 text-[#f6c969]" />
            </div>
            <div>
              <div className="font-serif text-[22px] font-semibold tracking-tight">Hotel<span className="text-[#f2b843]">OS</span></div>
              <div className="text-[9px] font-bold uppercase tracking-[.26em] text-white/55">Property management</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-[#071722]/55 px-4 py-2 text-[11px] font-semibold text-white/75 backdrop-blur-xl sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" /> Secure operations portal
          </div>
        </header>

        <div className="flex flex-1 items-center justify-end py-8 lg:py-10">
          <section className="w-full max-w-[460px] overflow-hidden rounded-[28px] border border-white/45 bg-[#fffdf8]/95 text-[#132632] shadow-[0_32px_100px_rgba(0,0,0,.48)] backdrop-blur-2xl">
            <div className="h-1.5 bg-gradient-to-r from-[#f5cf71] via-[#e5a32c] to-[#bd7413]" />
            <div className="p-6 sm:p-8">
              <div className="mb-7">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e2a633]/25 bg-[#fff4d8] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#9b6714]">
                  <ShieldCheck className="h-3.5 w-3.5" /> Enterprise PMS
                </div>
                <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#0c2330] sm:text-[34px]">Welcome back.</h1>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#60717a]">Sign in to manage today’s stays, service and property operations.</p>
              </div>

              {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.12em] text-[#4d606b]">Username or email</span>
                  <span className="relative block">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a7b40]" />
                    <input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="h-12 w-full rounded-xl border border-[#dce1df] bg-white pl-11 pr-4 text-sm text-[#142833] outline-none transition placeholder:text-[#a0aaae] focus:border-[#d99a26] focus:ring-4 focus:ring-[#e9b84b]/15" placeholder="Enter your username" />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.12em] text-[#4d606b]">Password</span>
                  <span className="relative block">
                    <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a7b40]" />
                    <input required autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-[#dce1df] bg-white pl-11 pr-12 text-sm text-[#142833] outline-none transition placeholder:text-[#a0aaae] focus:border-[#d99a26] focus:ring-4 focus:ring-[#e9b84b]/15" placeholder="Enter your password" />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#71818a] transition hover:bg-[#f4efe5] hover:text-[#9b6714]">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </span>
                </label>

                <button type="submit" disabled={loading} className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#efbf54] to-[#d58c18] text-sm font-extrabold text-[#14232b] shadow-[0_12px_28px_rgba(190,119,16,.25)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(190,119,16,.32)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65">
                  {loading ? 'Authenticating…' : 'Enter admin panel'}
                  {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                </button>
              </form>

              <div className="mt-6 border-t border-[#e7e3da] pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-[#63737b]"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Demo access</span>
                  <span className="text-[10px] text-[#8b969b]">Select a role</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_USERS.map((demo) => {
                    const isSelected = username === demo.username;
                    return (
                      <button key={demo.username} type="button" onClick={() => selectDemoUser(demo.username, demo.password)} className={`rounded-xl border px-3 py-2.5 text-left transition ${isSelected ? 'border-[#dba033] bg-[#fff4d8] shadow-[inset_0_0_0_1px_rgba(219,160,51,.15)]' : 'border-[#e4e7e5] bg-white hover:border-[#d9b66e] hover:bg-[#fffcf6]'}`}>
                        <span className="block text-xs font-bold text-[#1d333e]">{demo.label}</span>
                        <span className="mt-0.5 block text-[10px] text-[#7d8a90]">{demo.username}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-2 text-[10px] font-medium tracking-wide text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 HotelOS · Grand Residence Dhaka</span>
          <span>Encrypted access · Live operations · 24/7 availability</span>
        </footer>
      </div>
    </main>
  );
};

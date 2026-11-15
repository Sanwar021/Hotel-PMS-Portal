import React from 'react';
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('HotelOS interface error', error, info);
  }

  private signOut = () => {
    localStorage.removeItem('hotelos_token');
    localStorage.removeItem('hotelos_user');
    window.location.assign('/login');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-hotel-bg p-6 text-hotel-text">
        <section className="w-full max-w-lg rounded-2xl border border-hotel-line bg-hotel-panel p-8 text-center shadow-xl">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f8efdc] text-[#8a641f]">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h1 className="mt-5 font-serif text-2xl font-semibold">This screen needs to reload</h1>
          <p className="mt-2 text-sm leading-6 text-hotel-muted">
            Your session is safe. Reload the workspace, or sign in again if the issue continues.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#326f5c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285a4b]">
              <RefreshCw className="h-4 w-4" /> Reload workspace
            </button>
            <button type="button" onClick={this.signOut} className="inline-flex items-center justify-center gap-2 rounded-xl border border-hotel-line bg-white px-5 py-3 text-sm font-semibold text-hotel-text hover:bg-hotel-surface">
              <LogOut className="h-4 w-4" /> Sign in again
            </button>
          </div>
        </section>
      </main>
    );
  }
}

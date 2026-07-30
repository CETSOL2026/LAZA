import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import logoFull from '../../imports/Artboard_1_3.png';
import { AdminDashboard } from './AdminDashboard';
import type { SubscriptionPlan } from '../data/subscriptionAccess';

type AuthState = 'checking' | 'signed-out' | 'signed-in' | 'unavailable';
export interface AdminSession {
  authenticated: true;
  username: string;
  displayName?: string;
  role?: string;
  scope?: string;
  expiresAt: string;
}

const staticDemoAdminSession: AdminSession = {
  authenticated: true,
  username: 'demo-admin',
  displayName: 'LAZA Demo Administrator',
  role: 'admin',
  scope: 'Static demo operations console',
  expiresAt: '2099-12-31T23:59:59.000Z',
};

const isStaticDemoMode = import.meta.env.VITE_LAZA_STATIC_DEMO === 'true';

export function AdminGate({ onBack, onPreviewPlan }: { onBack: () => void; onPreviewPlan: (plan: SubscriptionPlan) => void }) {
  const [authState, setAuthState] = useState<AuthState>(isStaticDemoMode ? 'signed-in' : 'checking');
  const [session, setSession] = useState<AdminSession | null>(isStaticDemoMode ? staticDemoAdminSession : null);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isStaticDemoMode) {
      return undefined;
    }

    const controller = new AbortController();
    fetch('/api/admin/session', { signal: controller.signal, credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) {
          setSession(null);
          setAuthState('signed-out');
          return;
        }
        const payload = await response.json() as AdminSession;
        setSession(payload);
        setAuthState('signed-in');
      })
      .catch((error) => { if (error.name !== 'AbortError') setAuthState('unavailable'); });
    return () => controller.abort();
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (isStaticDemoMode) {
      setSession(staticDemoAdminSession);
      setPassword('');
      setAuthState('signed-in');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.message ?? (response.status === 429 ? 'Too many attempts. Try again later.' : 'Invalid username or password.'));
        return;
      }
      setSession(payload as AdminSession);
      setPassword('');
      setAuthState('signed-in');
    } catch {
      setMessage('The authentication service is temporarily unavailable.');
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    if (isStaticDemoMode) {
      setPassword('');
      setMessage('');
      setSession(staticDemoAdminSession);
      setAuthState('signed-in');
      return;
    }

    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
    setPassword('');
    setMessage('');
    setSession(null);
    setAuthState('signed-out');
  }

  if (authState === 'signed-in' && session) return <AdminDashboard session={session} onBack={onBack} onLogout={logout} onPreviewPlan={onPreviewPlan} />;

  return <div className="min-h-screen bg-slate-50">
    <header className="border-b border-[#a81b22] bg-[#bf1f27] px-6 py-4 shadow-sm"><div className="mx-auto flex max-w-6xl items-center justify-between"><img src={logoFull} alt="LAZA" className="h-10" /><button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 transition-colors hover:bg-white/10 hover:text-white"><ArrowLeft className="h-4 w-4" />Back to site</button></div></header>
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-border bg-white p-7 shadow-xl shadow-slate-200/60">
        <div className="mb-7 flex items-start gap-4"><div className="rounded-xl bg-primary/10 p-3 text-primary"><ShieldCheck className="h-7 w-7" /></div><div><h1 className="text-2xl tracking-tight">Admin Panel</h1><p className="mt-1 text-sm text-muted-foreground">Sign in with your administrator credentials.</p></div></div>
        {authState === 'checking' ? <div className="rounded-xl bg-muted px-4 py-5 text-center text-sm text-muted-foreground">Checking administrator session...</div> :
        <form onSubmit={login} className="space-y-5">
          <label className="block"><span className="mb-2 block text-sm">Username</span><input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-xl border border-border px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" /></label>
          <label className="block"><span className="mb-2 block text-sm">Password</span><div className="relative"><LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-border py-3 pl-11 pr-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
          {message && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}
          {authState === 'unavailable' && !message && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">The authentication service is temporarily unavailable.</p>}
          <button disabled={submitting} className="w-full rounded-xl bg-primary px-4 py-3 text-sm text-white transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60">{submitting ? 'Signing in...' : 'Sign in securely'}</button>
        </form>}
        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">{isStaticDemoMode ? 'Static demo mode. Protect this route with Cloudflare Access before sharing externally.' : 'Access is restricted, rate-limited and protected by an HttpOnly session.'}</p>
      </section>
    </main>
  </div>;
}

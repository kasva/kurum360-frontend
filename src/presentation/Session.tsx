import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { User } from '../domain/identity/organization';
import { auth, ApiError, onUnauthorized } from '../infrastructure/httpRequestService';
import { createHttpRequestService } from '../infrastructure/httpRequestService';
import App from './App';
import { Field } from './components/ui';
import { errorMessage } from './errors';

const service = createHttpRequestService();
export default function Session() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  async function load() {
    try { const me = await auth.me(); if (!me.mustChangePassword) await auth.directory(); setUser(me); }
    catch (e) { if (e instanceof ApiError && e.status === 401) { setUser(null); setError('Hesap bilgileriniz değişti. Tekrar giriş yapın.'); } else setError(errorMessage(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    onUnauthorized(() => { setUser(null); setError('Oturumunuz sona erdi. Tekrar giriş yapın.'); });
    auth.me().then(async me => {
      if (!me.mustChangePassword) await auth.directory();
      if (active) setUser(me);
    }).catch(e => { if (active && !(e instanceof ApiError && e.status === 401)) setError(errorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (user?.mustChangePassword) { await auth.changePassword(password, newPassword); await load(); }
      else { const me = await auth.login(email, password); if (!me.mustChangePassword) await auth.directory(); setUser(me); }
      setPassword(''); setNewPassword('');
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function logout() { try { await auth.logout(); setUser(null); } catch (e) { setError(errorMessage(e)); } }
  if (loading) return <div className="loading" role="status">Oturum kontrol ediliyor…</div>;
  if (user && !user.mustChangePassword) return <App service={service} user={user} logout={logout} refreshSession={load}/>;
  return <main className="session-page"><form className="card padded session-card" onSubmit={submit}>
    <h1>Kurum360</h1><h2>{user ? 'Geçici parolanızı değiştirin' : 'Giriş yapın'}</h2>
    {error && <div className="error-banner" role="alert">{error}</div>}
    {!user && <Field label="E-posta" required><input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required/></Field>}
    <Field label={user ? 'Mevcut parola' : 'Parola'} required><input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required/></Field>
    {user && <Field label="Yeni parola" required><input type="password" autoComplete="new-password" minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} required/><small>En az 6 karakter.</small></Field>}
    <button className="primary" disabled={busy}>{busy ? 'İşleniyor…' : user ? 'Parolayı değiştir' : 'Giriş yap'}</button>
    {user && <button type="button" onClick={logout}>Çıkış yap</button>}
    {!user && <p className="muted">Hesabınızı kurum sistem yöneticisi oluşturur.</p>}
  </form></main>;
}

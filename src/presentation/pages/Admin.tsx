import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { User } from '../../domain/identity/organization';
import { hasPermission } from '../../domain/identity/organization';
import UserImport from './UserImport';
import { adminService } from '../../infrastructure/adminService';
import type { AdminTitle, AdminUser, UserInput } from '../../infrastructure/adminService';
import { RequestValidationError } from '../../application/requests/errors';
import { errorMessage } from '../errors';
import { Empty, Field, Icon, Modal, PageTitle, Select } from '../components/ui';

function validationMessage(error: unknown) {
  return error instanceof RequestValidationError
    ? Object.values(error.errors).filter(Boolean).join(' ')
    : errorMessage(error);
}
type Editor = { kind: 'user'; user?: AdminUser } | { kind: 'password'; user: AdminUser } | { kind: 'import' };

function UserEditor({ user, currentUserId, titles, onClose, onSave }: {
  user?: AdminUser; currentUserId: string; titles: AdminTitle[];
  onClose: () => void; onSave: (input: UserInput) => Promise<void>;
}) {
  const [input, setInput] = useState<UserInput>({ email: user?.email ?? '', name: user?.name ?? '',
    firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', title: user?.title ?? '', titleId: user?.titleId ?? '', phoneNumber: user?.phoneNumber ?? '', userType: user?.userType ?? 'Standard',
    role: user?.role ?? 'Employee',
    canCreateRequests: user?.canCreateRequests ?? false, isActive: user?.isActive ?? true, temporaryPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const self = user?.id === currentUserId;
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const { temporaryPassword, ...details } = input;
      const payload: UserInput = { ...details, name: `${details.firstName.trim()} ${details.lastName.trim()}`,
        role: details.userType === 'Admin' ? 'SystemAdmin' : 'Employee', canCreateRequests: details.userType === 'Admin' || details.canCreateRequests };
      await onSave(user ? payload : { ...payload, temporaryPassword });
      onClose();
    } catch (e) { setError(validationMessage(e)); } finally { setBusy(false); }
  }
  return <Modal title={user ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'} onClose={() => { if (!busy) onClose(); }}><form onSubmit={submit}>
    {user && !user.lastName && <p className="notice">Eski kayıtların ad ve soyadı otomatik ayrılmadı. Mevcut tam ad: <strong>{user.name}</strong>. Adı kontrol edip soyadı ayrı alana yazın.</p>}
    <Field label="Ad" required><input required maxLength={80} autoComplete="given-name" value={input.firstName} onChange={e => setInput({ ...input, firstName: e.target.value })}/></Field>
    <Field label="Soyad" required><input required maxLength={80} autoComplete="family-name" value={input.lastName} onChange={e => setInput({ ...input, lastName: e.target.value })}/></Field>
    <Field label="Ünvan" required><Select required placeholder="Ünvan seçiniz" options={titles.filter(t => t.isActive || t.id === input.titleId).map(t => ({ value: t.id, label: t.name + (t.isActive ? '' : ' (Pasif)') }))} value={input.titleId} onChange={e => setInput({ ...input, titleId: e.target.value, title: titles.find(t => t.id === e.target.value)?.name ?? '' })}/><small>Ünvanları Sistem Tanımları → Ünvanlar ekranından tanımlayın.</small></Field>
    <Field label="Telefon"><input type="tel" autoComplete="tel" maxLength={30} value={input.phoneNumber} placeholder="05xx xxx xx xx" onChange={e => setInput({ ...input, phoneNumber: e.target.value })}/></Field>
    <Field label="E-posta" required><input type="email" required maxLength={254} value={input.email} onChange={e => setInput({ ...input, email: e.target.value })}/></Field>
    <Field label="Kullanıcı Tipi" required><Select placeholder={null} options={[{ value: 'Standard', label: 'Standart Kullanıcı' }, { value: 'Admin', label: 'Admin' }]} disabled={self} value={input.userType} onChange={e => setInput({ ...input, userType: e.target.value as UserInput['userType'] })}/></Field>
    <label className="admin-checkbox"><input type="checkbox" checked={input.userType === 'Admin' || input.canCreateRequests} disabled={input.userType === 'Admin'} onChange={e => setInput({ ...input, canCreateRequests: e.target.checked })}/>Talep açabilir</label>
    <p className="muted">Standart kullanıcı atanan işleri yürütür; yalnızca bu izin verilirse talep açar. Admin tüm işlemlere yetkilidir.</p>
    <label className="admin-checkbox"><input type="checkbox" checked={input.isActive} disabled={self} onChange={e => setInput({ ...input, isActive: e.target.checked })}/>Aktif kullanıcı</label>
    {!user && <Field label="Geçici Parola" required><input type="password" autoComplete="new-password" required minLength={6} value={input.temporaryPassword} onChange={e => setInput({ ...input, temporaryPassword: e.target.value })}/><small>En az 6 karakter. Kullanıcı ilk girişte değiştirecek.</small></Field>}
    {user && <p className="notice">Hesap güncellemesi kullanıcının mevcut oturumlarını sonlandırır. Yeniden giriş yapması gerekir.</p>}
    {error && <div className="error-banner" role="alert">{error}</div>}
    <div className="modal-footer"><button type="button" disabled={busy} onClick={onClose}>Vazgeç</button><button className="primary" disabled={busy}>{busy ? 'Kaydediliyor…' : user ? 'Değişiklikleri Kaydet' : 'Kullanıcı Oluştur'}</button></div>
  </form></Modal>;
}
function PasswordEditor({ user, onClose, onSave }: { user: AdminUser; onClose: () => void; onSave: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await onSave(password); onClose(); } catch (e) { setError(validationMessage(e)); } finally { setBusy(false); }
  }
  return <Modal title="Geçici Parola Ver" onClose={() => { if (!busy) onClose(); }}><form onSubmit={submit}><p>{user.name} · {user.email}</p>
    <p className="notice">Mevcut oturumlar sonlandırılır. Kullanıcı yeni geçici parolayla giriş yapıp parolasını değiştirecek.</p>
    <Field label="Yeni Geçici Parola" required><input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}/><small>En az 6 karakter.</small></Field>
    {error && <div className="error-banner" role="alert">{error}</div>}<div className="modal-footer"><button type="button" disabled={busy} onClick={onClose}>Vazgeç</button><button className="primary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Geçici Parolayı Kaydet'}</button></div>
  </form></Modal>;
}
export default function Admin({ currentUser, refreshSession }: { currentUser: User; refreshSession: () => Promise<void> }) {
  const [users, setUsers] = useState<AdminUser[]>([]); const [titles, setTitles] = useState<AdminTitle[]>([]);
  const [search, setSearch] = useState(''); const [editor, setEditor] = useState<Editor | null>(null);
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true); const [reload, setReload] = useState(0);
  const manage = hasPermission(currentUser, 'users.manage');
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([adminService.users(controller.signal), adminService.titles(controller.signal)])
      .then(([users, titles]) => { setUsers(users); setTitles(titles); })
      .catch(e => { if (!controller.signal.aborted) setError(validationMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload, manage, currentUser]);
  async function saved(text: string) { setMessage(text); setError(''); setReload(v => v + 1); await refreshSession(); }
  const query = search.trim().toLocaleLowerCase('tr-TR');
  const filtered = users.filter(u => `${u.name} ${u.email} ${u.title} ${u.phoneNumber ?? ''}`.toLocaleLowerCase('tr-TR').includes(query));
  const editable = (u: AdminUser) => currentUser.roleCode === 'SystemAdmin' || u.userType === 'Standard';
  return <>
    <PageTitle title="Kullanıcı Yönetimi" description="Personel bilgilerini, kullanıcı tipini ve talep açma iznini yönetin.">{manage && <div className="admin-actions"><button disabled={loading} onClick={() => setEditor({ kind: 'import' })}>Excel’den Toplu Yükle</button><button className="primary" disabled={loading} onClick={() => setEditor({ kind: 'user' })}><Icon name="plus" size={17}/>Yeni Kullanıcı</button></div>}</PageTitle>
    <div className="admin-tabs">{hasPermission(currentUser, 'definitions.titles.view') && <a className="button" href="#/definitions/titles">Ünvan Tanımları</a>}<button onClick={() => { setError(''); setLoading(true); setReload(v => v + 1); }}>Yenile</button></div>
    {message && <div className="success-banner" role="status">{message}</div>}{error && <div className="error-banner" role="alert">{error}</div>}
    {loading ? <p className="loading">Kullanıcılar yükleniyor…</p> : <section className="card"><div className="padded"><Field label="Kullanıcı Ara"><input placeholder="Ad, soyad, e-posta, ünvan, telefon…" value={search} onChange={e => setSearch(e.target.value)}/></Field></div>
    {filtered.length ? <div className="table-scroll"><table><thead><tr><th>Kullanıcı</th><th>Ünvan / Telefon</th><th>Kullanıcı Tipi</th><th>Hesap</th><th>Talep Oluşturma</th><th>İşlemler</th></tr></thead><tbody>{filtered.map(user => <tr key={user.id}>
      <td><strong>{user.name}</strong><div>{user.email}</div>{user.mustChangePassword && <small className="muted">Parola değişimi bekleniyor</small>}</td>
      <td>{user.title || '—'}<div>{user.phoneNumber || '—'}</div></td><td>{user.userType === 'Admin' ? 'Admin' : 'Standart Kullanıcı'}</td><td>{user.isActive ? 'Aktif' : 'Pasif'}</td><td>{user.canCreateRequests ? 'Yetkili' : 'Yetkisiz'}</td>
      <td><div className="admin-actions">{manage && editable(user) && <button onClick={() => setEditor({ kind: 'user', user })}>Düzenle</button>}{hasPermission(currentUser, 'users.password') && editable(user) && <button onClick={() => setEditor({ kind: 'password', user })}>Geçici Parola Ver</button>}</div></td>
    </tr>)}</tbody></table></div> : <Empty title="Kullanıcı bulunamadı" description="Aramayı değiştirin veya yeni bir kullanıcı oluşturun."/>}</section>}
    {editor?.kind === 'user' && <UserEditor user={editor.user} currentUserId={currentUser.id} titles={titles} onClose={() => setEditor(null)} onSave={async input => {
      if (editor.user) await adminService.updateUser(editor.user.id, input); else await adminService.createUser(input);
      await saved(editor.user ? 'Kullanıcı güncellendi. Mevcut oturumları sonlandırıldı.' : 'Kullanıcı oluşturuldu. Geçici parolayla ilk girişte parolasını değiştirecek.');
    }}/>}
    {editor?.kind === 'import' && <UserImport onClose={() => setEditor(null)} onImported={async count => { await saved(`${count} kullanıcı Excel’den oluşturuldu. İlk girişlerinde parolalarını değiştirecekler.`); }}/>}
    {editor?.kind === 'password' && <PasswordEditor user={editor.user} onClose={() => setEditor(null)} onSave={async password => { await adminService.resetPassword(editor.user.id, password); await saved('Geçici parola kaydedildi.'); }}/>}
  </>;
}

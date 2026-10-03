import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { User } from '../../domain/identity/organization';
import { hasPermission } from '../../domain/identity/organization';
import { accessService } from '../../infrastructure/accessService';
import type { AccessRole } from '../../infrastructure/accessService';
import { adminService } from '../../infrastructure/adminService';
import type { AdminDepartment, AdminUser, UserInput } from '../../infrastructure/adminService';
import { RequestValidationError } from '../../application/requests/errors';
import { errorMessage } from '../errors';
import { Empty, Field, Icon, Modal, PageTitle, Select } from '../components/ui';

function validationMessage(error: unknown) {
  return error instanceof RequestValidationError
    ? Object.values(error.errors).filter(Boolean).join(' ')
    : errorMessage(error);
}
type Editor = { kind: 'user'; user?: AdminUser } | { kind: 'password'; user: AdminUser };

function UserEditor({ user, currentUserId, departments, roles, onClose, onSave }: {
  user?: AdminUser; currentUserId: string; departments: AdminDepartment[]; roles: AccessRole[];
  onClose: () => void; onSave: (input: UserInput) => Promise<void>;
}) {
  const [input, setInput] = useState<UserInput>({ email: user?.email ?? '', name: user?.name ?? '',
    departmentId: user?.departmentId ?? '', role: user?.role ?? 'Employee', roleCode: user?.roleCode ?? roles.find(r => r.code === 'RequestUser')?.code ?? roles.find(r => r.isActive && r.assignable)?.code ?? '',
    canCreateRequests: user?.canCreateRequests ?? false, isActive: user?.isActive ?? true, temporaryPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const self = user?.id === currentUserId;
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const { temporaryPassword, ...details } = input;
      await onSave(user ? details : { ...details, temporaryPassword });
      onClose();
    } catch (e) { setError(validationMessage(e)); } finally { setBusy(false); }
  }
  return <Modal title={user ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'} onClose={() => { if (!busy) onClose(); }}><form onSubmit={submit}>
    <Field label="Ad Soyad" required><input required maxLength={160} value={input.name} onChange={e => setInput({ ...input, name: e.target.value })}/></Field>
    <Field label="E-posta" required><input type="email" required maxLength={254} value={input.email} onChange={e => setInput({ ...input, email: e.target.value })}/></Field>
    <Field label="Birim" required><Select required placeholder="Birim seçiniz" options={departments.filter(d => d.isActive || d.id === input.departmentId).map(d => ({ value: d.id, label: d.name + (d.isActive ? '' : ' (Pasif)') }))} value={input.departmentId} onChange={e => setInput({ ...input, departmentId: e.target.value })}/></Field>
    <Field label="Rol" required><Select placeholder={null} options={roles.filter(r => (r.isActive && r.assignable) || r.code === input.roleCode).map(r => ({ value: r.code, label: r.name + (r.isActive ? '' : ' (Pasif)') }))} disabled={self} value={input.roleCode} onChange={e => setInput({ ...input, roleCode: e.target.value })}/></Field>
    <p className="muted">İzinler seçilen rolden gelir. Roller ve Yetkiler ekranından düzenleyebilirsiniz.</p>
    <label className="admin-checkbox"><input type="checkbox" checked={input.isActive} disabled={self} onChange={e => setInput({ ...input, isActive: e.target.checked })}/>Aktif kullanıcı</label>
    {!user && <Field label="Geçici Parola" required><input type="password" autoComplete="new-password" required minLength={6} value={input.temporaryPassword} onChange={e => setInput({ ...input, temporaryPassword: e.target.value })}/><small>En az 6 karakter; büyük/küçük harf, rakam ve özel karakter. Kullanıcı ilk girişte değiştirecek.</small></Field>}
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
    <Field label="Yeni Geçici Parola" required><input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}/><small>Büyük/küçük harf, rakam ve özel karakter kullanın.</small></Field>
    {error && <div className="error-banner" role="alert">{error}</div>}<div className="modal-footer"><button type="button" disabled={busy} onClick={onClose}>Vazgeç</button><button className="primary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Geçici Parolayı Kaydet'}</button></div>
  </form></Modal>;
}
export default function Admin({ currentUser, refreshSession }: { currentUser: User; refreshSession: () => Promise<void> }) {
  const [users, setUsers] = useState<AdminUser[]>([]); const [departments, setDepartments] = useState<AdminDepartment[]>([]); const [roles, setRoles] = useState<AccessRole[]>([]);
  const [search, setSearch] = useState(''); const [editor, setEditor] = useState<Editor | null>(null);
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true); const [reload, setReload] = useState(0);
  const manage = hasPermission(currentUser, 'users.manage');
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([adminService.users(controller.signal), adminService.departments(controller.signal), (manage || hasPermission(currentUser, 'users.password')) ? accessService.list(controller.signal) : Promise.resolve({ roles: [] as AccessRole[] })])
      .then(([users, departments, data]) => { setUsers(users); setDepartments(departments); setRoles(data.roles); })
      .catch(e => { if (!controller.signal.aborted) setError(validationMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload, manage, currentUser]);
  async function saved(text: string) { setMessage(text); setError(''); setReload(v => v + 1); await refreshSession(); }
  const query = search.trim().toLocaleLowerCase('tr-TR');
  const filtered = users.filter(u => `${u.name} ${u.email} ${u.department} ${u.roleName}`.toLocaleLowerCase('tr-TR').includes(query));
  const editable = (u: AdminUser) => currentUser.roleCode === 'SystemAdmin' || roles.some(r => r.code === u.roleCode && r.assignable);
  return <>
    <PageTitle title="Kullanıcı Yönetimi" description="Kullanıcıların hesabını, birimini ve rolünü yönetin.">{manage && <button className="primary" disabled={loading} onClick={() => setEditor({ kind: 'user' })}><Icon name="plus" size={17}/>Yeni Kullanıcı</button>}</PageTitle>
    <div className="admin-tabs">{hasPermission(currentUser, 'roles.view') && <a className="button" href="#/roles">Roller ve Yetkiler</a>}<button onClick={() => { setError(''); setLoading(true); setReload(v => v + 1); }}>Yenile</button></div>
    {message && <div className="success-banner" role="status">{message}</div>}{error && <div className="error-banner" role="alert">{error}</div>}
    {loading ? <p className="loading">Kullanıcılar yükleniyor…</p> : <section className="card"><div className="padded"><Field label="Kullanıcı Ara"><input placeholder="Ad, e-posta, birim veya rol…" value={search} onChange={e => setSearch(e.target.value)}/></Field></div>
    {filtered.length ? <div className="table-scroll"><table><thead><tr><th>Kullanıcı</th><th>Birim</th><th>Rol</th><th>Hesap</th><th>Talep Oluşturma</th><th>İşlemler</th></tr></thead><tbody>{filtered.map(user => <tr key={user.id}>
      <td><strong>{user.name}</strong><div>{user.email}</div>{user.mustChangePassword && <small className="muted">Parola değişimi bekleniyor</small>}</td>
      <td>{user.department}</td><td>{user.roleName ?? user.role}</td><td>{user.isActive ? 'Aktif' : 'Pasif'}</td><td>{user.canCreateRequests ? 'Rolü yetkili' : 'Rolü yetkisiz'}</td>
      <td><div className="admin-actions">{manage && editable(user) && <button onClick={() => setEditor({ kind: 'user', user })}>Düzenle</button>}{hasPermission(currentUser, 'users.password') && editable(user) && <button onClick={() => setEditor({ kind: 'password', user })}>Geçici Parola Ver</button>}</div></td>
    </tr>)}</tbody></table></div> : <Empty title="Kullanıcı bulunamadı" description="Aramayı değiştirin veya yeni bir kullanıcı oluşturun."/>}</section>}
    {editor?.kind === 'user' && <UserEditor user={editor.user} currentUserId={currentUser.id} departments={departments} roles={roles} onClose={() => setEditor(null)} onSave={async input => {
      if (editor.user) await adminService.updateUser(editor.user.id, input); else await adminService.createUser(input);
      await saved(editor.user ? 'Kullanıcı güncellendi. Mevcut oturumları sonlandırıldı.' : 'Kullanıcı oluşturuldu. Geçici parolayla ilk girişte parolasını değiştirecek.');
    }}/>}
    {editor?.kind === 'password' && <PasswordEditor user={editor.user} onClose={() => setEditor(null)} onSave={async password => { await adminService.resetPassword(editor.user.id, password); await saved('Geçici parola kaydedildi.'); }}/>} 
  </>;
}


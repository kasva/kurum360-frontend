import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { accessService } from '../../infrastructure/accessService';
import type { AccessData, AccessRole, RoleInput } from '../../infrastructure/accessService';
import type { User } from '../../domain/identity/organization';
import { hasPermission } from '../../domain/identity/organization';
import { errorMessage } from '../errors';
import { Empty, Field, Modal, PageTitle } from '../components/ui';

function RoleEditor({ role, data, user, onClose, onSave }: { role?: AccessRole; data: AccessData; user: User; onClose: () => void; onSave: (input: RoleInput) => Promise<void> }) {
  const [input, setInput] = useState<RoleInput>({ name: role?.name ?? '', description: role?.description ?? '', isActive: role?.isActive ?? true, permissions: role?.permissions ?? [] });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const groups = [...new Set(data.catalog.map(p => p.group))];
  const editable = hasPermission(user, 'roles.manage') && !role?.locked && (!role || role.editable) && user.roleCode !== role?.code;
  function toggle(code: string, checked: boolean) {
    setInput(current => ({ ...current, permissions: checked ? [...current.permissions, code] : current.permissions.filter(p => p !== code) }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await onSave(input); onClose(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Modal title={role ? `${role.name} · İzinler` : 'Yeni Rol'} onClose={() => { if (!busy) onClose(); }}><form onSubmit={submit}>
    <Field label="Rol Adı" required><input required maxLength={120} disabled={!editable || busy} value={input.name} onChange={e => setInput({ ...input, name: e.target.value })}/></Field>
    <Field label="Açıklama"><textarea maxLength={500} disabled={!editable || busy} value={input.description} onChange={e => setInput({ ...input, description: e.target.value })}/></Field>
    <label className="admin-checkbox"><input type="checkbox" disabled={!editable || busy} checked={input.isActive} onChange={e => setInput({ ...input, isActive: e.target.checked })}/>Aktif rol</label>
    <p className="notice">İzinler bu role bağlı tüm kullanıcılara uygulanır. Talep işlemleri için görüntüleme izni de seçin. Atama, yönlendirme ve kapatma için birim veya tüm birimler yönetim kapsamı gerekir. Gizli talepler ayrı izinlerle korunur.</p>
    {role?.locked && <p className="notice">Admin tüm izinlere sahiptir ve değiştirilemez.</p>}
    {user.roleCode === role?.code && <p className="notice">Kendi rolünüzü başka bir yönetici düzenlemelidir.</p>}
    <div className="permission-groups">{groups.map(group => <fieldset key={group}><legend>{group}</legend>{data.catalog.filter(p => p.group === group).map(p => <label className="admin-checkbox" key={p.code}><input type="checkbox" checked={input.permissions.includes(p.code)} disabled={!editable || busy || (!hasPermission(user, p.code) && user.roleCode !== 'SystemAdmin')} onChange={e => toggle(p.code, e.target.checked)}/>{p.name}</label>)}</fieldset>)}</div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    <div className="modal-footer"><button type="button" disabled={busy} onClick={onClose}>Kapat</button>{editable && <button className="primary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'İzinleri Kaydet'}</button>}</div>
  </form></Modal>;
}
export default function Roles({ user, refreshSession }: { user: User; refreshSession: () => Promise<void> }) {
  const [data, setData] = useState<AccessData>(); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [reload, setReload] = useState(0); const [editor, setEditor] = useState<{ role?: AccessRole } | null>(null);
  useEffect(() => { const c = new AbortController(); accessService.list(c.signal).then(setData).catch(e => { if (!c.signal.aborted) setError(errorMessage(e)); }); return () => c.abort(); }, [reload]);
  return <><PageTitle title="Roller ve Yetkiler" description="İşlemlere izin verin; kullanıcılar seçilen rolün izinlerini alır.">{hasPermission(user, 'roles.manage') && <button className="primary" disabled={!data} onClick={() => setEditor({})}>Yeni Rol</button>}</PageTitle>
    {success && <div className="success-banner" role="status">{success}</div>}{error && <div className="error-banner" role="alert">{error}</div>}
    <div className="admin-tabs">{hasPermission(user, 'users.view') && <a className="button" href="#/admin">Kullanıcılar</a>}<button onClick={() => { setError(''); setReload(r => r + 1); }}>Yenile</button></div>
    {!data ? <p className="loading">Roller yükleniyor…</p> : data.roles.length ? <section className="card table-scroll"><table><thead><tr><th>Rol</th><th>Açıklama</th><th>Durum</th><th>İzinler</th><th>İşlem</th></tr></thead><tbody>{data.roles.map(role => <tr key={role.code}><td>{role.name}</td><td>{role.description}</td><td>{role.isActive ? 'Aktif' : 'Pasif'}</td><td>{role.locked ? 'Tüm izinler' : `${role.permissions.length} izin`}</td><td><button onClick={() => setEditor({ role })}>{role.locked || !role.editable || role.code === user.roleCode || !hasPermission(user, 'roles.manage') ? 'İzinleri Gör' : 'İzinleri Düzenle'}</button></td></tr>)}</tbody></table></section> : <Empty title="Rol bulunamadı"/>}
    {data && editor && <RoleEditor role={editor.role} data={data} user={user} onClose={() => setEditor(null)} onSave={async input => { await accessService.save(input, editor.role?.code); setReload(r => r + 1); setSuccess('Rol kaydedildi. İzinler bu rolün kullanıcılarının sonraki API işleminde uygulanır. Açık ekranları yenileyin.'); await refreshSession(); }}/>}</>;
}



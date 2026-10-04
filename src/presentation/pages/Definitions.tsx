import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { User } from '../../domain/identity/organization';
import { hasPermission, departments, titleGroups, titleCatalog, people } from '../../domain/identity/organization';
import { definitionService, formTemplates } from '../../infrastructure/definitionService';
import type { DefinitionInput, DefinitionItem, DefinitionKind } from '../../infrastructure/definitionService';
import { RequestValidationError } from '../../application/requests/errors';
import { errorMessage } from '../errors';
import { Empty, Field, Icon, Modal, PageTitle, Select } from '../components/ui';

const titles = { types: 'Talep Türleri', categories: 'Kategoriler', titles: 'Ünvanlar', titleGroups: 'Ünvan Grupları', departments: 'Birimler' };
const singular = { types: 'Talep Türü', categories: 'Kategori', titles: 'Ünvan', titleGroups: 'Ünvan Grubu', departments: 'Birim' };
function message(error: unknown) {
  return error instanceof RequestValidationError ? Object.values(error.errors).filter(Boolean).join(' ') : errorMessage(error);
}
function DefinitionEditor({ kind, item, onClose, onSave }: {
  kind: DefinitionKind; item?: DefinitionItem; onClose: () => void; onSave: (input: DefinitionInput) => Promise<void>;
}) {
  const [name, setName] = useState(item?.name ?? ''); const [active, setActive] = useState(item?.isActive ?? true);
  const [description, setDescription] = useState(item?.description ?? ''); const [baseType, setBaseType] = useState(item?.baseType ?? 'Request');
  const [groupId, setGroupId] = useState(item?.titleGroupId ?? '');
  const [parentId, setParentId] = useState(item?.parentId ?? departments.find(d => !d.parentId && d.isActive)?.id ?? '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await onSave({ name: name.trim(), isActive: active, ...(kind === 'titles' ? { titleGroupId: groupId } : {}), ...(kind === 'departments' ? { parentId: item && !item.parentId ? null : parentId } : {}), ...(kind === 'titleGroups' ? { description } : {}), ...(kind === 'types' ? { description: description.trim(), baseType } : {}) }); onClose(); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <Modal title={`${item ? 'Düzenle:' : 'Yeni'} ${singular[kind]}`} onClose={() => { if (!busy) onClose(); }}><form onSubmit={submit}>
    <Field label={`${singular[kind]} Adı`} required><input required maxLength={120} value={name} onChange={e => setName(e.target.value)}/></Field>
    {kind === 'titles' && <Field label="Ünvan Grubu" required><Select required options={titleGroups.filter(g => g.isActive).map(g => ({value: g.id, label: g.name}))} value={groupId} onChange={e => setGroupId(e.target.value)} placeholder="Grup seçiniz"/></Field>}
    {kind === 'departments' && (!item || !!item.parentId) && <Field label="Üst Birim" required><Select required options={departments.filter(d => !d.parentId && d.isActive).map(d => ({value: d.id, label: d.name}))} value={parentId} onChange={e => setParentId(e.target.value)}/></Field>}
    {kind === 'titleGroups' && <Field label="Açıklama"><textarea maxLength={500} value={description} onChange={e => setDescription(e.target.value)}/></Field>}
    {kind === 'types' && <><Field label="Açıklama"><textarea rows={3} maxLength={500} value={description} onChange={e => setDescription(e.target.value)}/></Field>
      <Field label="Form Yapısı" required><Select options={formTemplates} placeholder={null} disabled={!!item} value={baseType} onChange={e => setBaseType(e.target.value)}/><small>Türün hangi ek alanları ve yetki kurallarını kullanacağını belirler. Kayıttan sonra değiştirilemez.</small></Field></>}
    <label className="admin-checkbox"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)}/>Aktif</label>
    <p className="notice">{kind === 'titles' ? 'Aktif kullanıcıları veya açık talepleri olan ünvan pasifleştirilemez. Önce kullanıcıları ve açık talepleri başka bir ünvana taşıyın.' : 'Pasif tanımlar yeni taleplerde seçilemez. Önceki talepler ve geçmişleri korunur.'}</p>
    {error && <div className="error-banner" role="alert">{error}</div>}
    <div className="modal-footer"><button type="button" disabled={busy} onClick={onClose}>Vazgeç</button><button className="primary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
  </form></Modal>;
}

export default function Definitions({ kind, user, refreshSession }: { kind: DefinitionKind; user: User; refreshSession: () => Promise<void> }) {
  const canEdit = hasPermission(user, 'definitions.' + kind + '.manage') && (!['titles', 'titleGroups', 'departments'].includes(kind) || departments.some(d => d.id === user.departmentId && !d.parentId && d.isActive));
  const [items, setItems] = useState<DefinitionItem[]>([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [reload, setReload] = useState(0); const [editor, setEditor] = useState<{ item?: DefinitionItem } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    definitionService.list(kind, controller.signal).then(setItems)
      .catch(e => { if (!controller.signal.aborted) setError(message(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [kind, reload]);
  const filtered = items.filter(i => i.name.toLocaleLowerCase('tr-TR').includes(search.trim().toLocaleLowerCase('tr-TR')));
  return <>
    <PageTitle title={titles[kind]} description={kind === 'titles' ? 'Kullanıcı ve Excel yüklemesinde seçilecek tanımları yönetin.' : 'Talep formunda kullanılacak tanımları yönetin.'}>{canEdit && <button className="primary" disabled={loading} onClick={() => setEditor({})}><Icon name="plus" size={17}/>Yeni {singular[kind]}</button>}</PageTitle>
    <nav className="admin-tabs" aria-label="Tanım ekranları">{(Object.keys(titles) as DefinitionKind[]).filter(k => hasPermission(user, 'definitions.' + k + '.view')).map(k => <a key={k} className={`button ${kind === k ? 'primary' : ''}`} href={`#/definitions/${k}`} aria-current={kind === k ? 'page' : undefined}>{titles[k]}</a>)}<button onClick={() => { setError(''); setLoading(true); setReload(v => v + 1); }}>Yenile</button></nav>
    {success && <div className="success-banner" role="status">{success}</div>}{error && <div className="error-banner" role="alert">{error}</div>}
    <section className="card"><div className="padded"><Field label="Tanım Ara"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Adına göre ara…"/></Field></div>
      {loading ? <p className="loading">Tanımlar yükleniyor…</p> : filtered.length ? <div className="table-scroll"><table><thead><tr><th>Ad</th>{kind === 'types' && <><th>Açıklama</th><th>Form Yapısı</th></>}{kind === 'titles' && <th>Ünvan Grubu</th>}{kind === 'departments' && <><th>Üst Birim</th><th>Operatörler</th></>}{kind === 'titleGroups' && <th>Bağlı Ünvanlar</th>}<th>Durum</th><th>İşlem</th></tr></thead><tbody>{filtered.map(item => <tr key={item.code ?? item.id}>
        <td>{item.name}</td>{kind === 'types' && <><td>{item.description || '—'}</td><td>{formTemplates.find(t => t.value === item.baseType)?.label ?? item.baseType}</td></>}{kind === 'titles' && <td>{titleGroups.find(g => g.id === item.titleGroupId)?.name ?? '—'}</td>}{kind === 'departments' && <><td>{departments.find(d => d.id === item.parentId)?.name ?? 'En üst birim'}</td><td>{people.filter(p => p.departmentId === item.id && p.isOperator).map(p => p.name).join(', ') || 'Operatör tanımlanmalı'}</td></>}{kind === 'titleGroups' && <td>{titleCatalog.filter(t => t.titleGroupId === item.id).map(t => t.name).join(', ') || '—'}</td>}<td>{item.isActive ? 'Aktif' : 'Pasif'}</td><td>{canEdit && <button onClick={() => setEditor({ item })}>Düzenle</button>}</td>
      </tr>)}</tbody></table></div> : <Empty title="Tanım bulunamadı" description="Aramayı değiştirin veya yeni bir tanım ekleyin."/>}
    </section>
    {editor && <DefinitionEditor kind={kind} item={editor.item} onClose={() => setEditor(null)} onSave={async input => {
      await definitionService.save(kind, input, editor.item); setSuccess('Tanım kaydedildi. İlgili formu yeniden açtığınızda güncel seçenekler gösterilir.'); setError(''); setReload(v => v + 1); await refreshSession();
    }}/>} 
  </>;
}

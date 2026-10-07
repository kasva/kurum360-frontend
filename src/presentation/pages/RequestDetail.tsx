import { useState } from 'react';
import type { FormEvent } from 'react';
import type { RequestRecord } from '../../domain/requests/types';
import type { RequestAction } from '../../application/requests/types';
import type { LiveRequestService } from '../../infrastructure/httpRequestService';
import { errorMessage } from '../errors';
import { hasPermission, titles, people, personName, departments, personnelGroups, groupIds } from '../../domain/identity/organization';
import { priorities, statuses, typeDefinitions } from '../../domain/requests/model';
import { Badge, Delay, Empty, Field, Icon, Modal, PageTitle, Select } from '../components/ui';
import { dateText, dateTime } from '../format';
const actions = { release: 'Yeniden Havuza Bırak', group: 'Personel Grubuna Yönlendir', department: 'Başka Müftülüğe Yönlendir', assign: 'Sorumlu Ata / Değiştir', title: 'Başka Ünvana Yönlendir', priority: 'Öncelik Güncelle', status: 'Durum Güncelle', complete: 'Talebi Tamamla', approval: 'Onaya Gönder', revise: 'Revizyon İste', close: 'Talebi Kapat' };
function ActionDialog({ record, action, onClose, onAction }: { record: RequestRecord; action: RequestAction; onClose: () => void; onAction: (action: RequestAction, value: string, note: string) => Promise<void> }) {
  const options = action === 'assign' ? people.filter(p => p.departmentId === record.targetDepartmentId && (!record.targetPersonnelGroupId || groupIds(p).includes(record.targetPersonnelGroupId)) && hasPermission(p, 'requests.process')).map(p => ({ value: p.id, label: `${p.name} · ${p.title}` })) : action === 'group' ? personnelGroups.filter(g => g.isActive && g.departmentId === record.targetDepartmentId).map(g => ({value:g.id,label:g.name})) : action === 'department' ? departments.filter(d => d.isActive).map(d => ({value:d.id,label:d.name})) : action === 'title' ? titles : action === 'priority' ? priorities : statuses.filter(s => record.allowedStatuses?.includes(s) ?? ['İşlemde', 'Beklemede'].includes(s));
  const [value, setValue] = useState(action === 'group' ? record.targetPersonnelGroupId ?? '' : action === 'department' ? record.targetDepartmentId ?? '' : action === 'assign' ? record.assignee : action === 'title' ? record.targetTitle : action === 'priority' ? record.priority : record.status);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const needsValue = ['assign', 'title', 'group', 'department', 'priority', 'status'].includes(action);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try { await onAction(action, value, note); onClose(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Modal title={actions[action]} onClose={onClose}><form onSubmit={submit}><p className="modal-context">{record.number} · {record.subject}</p>{action === 'title' && <div className="notice">Yönlendirme sonrasında mevcut sorumlu kaldırılır. Yeni bir sorumlu atayabilirsiniz.</div>}{action === 'close' && <div className="notice">Talep kapatılacak; kayıt ve geçmişi korunacaktır.</div>}{needsValue && <Field label={action === 'group' ? 'Personel Grubu' : action === 'department' ? 'Müftülük' : action === 'assign' ? 'Sorumlu' : action === 'title' ? 'Ünvan' : action === 'priority' ? 'Öncelik' : 'Durum'} required><Select options={options} placeholder="Seçiniz" value={value} onChange={e => setValue(e.target.value)} required/></Field>}<Field label={action === 'revise' ? 'Revizyon gerekçesi' : 'İşlem notu'} required={action === 'revise'}><textarea rows={4} value={note} onChange={e => setNote(e.target.value)} maxLength={2000} required={action === 'revise'} placeholder="Zaman çizelgesine eklenecek açıklama…"/></Field>{error && <div className="error-banner" role="alert">{error}</div>}<div className="modal-footer"><button type="button" onClick={onClose} disabled={busy}>Vazgeç</button><button className="primary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'İşlemi Uygula'}</button></div></form></Modal>;
}
export default function RequestDetail({ record, service, refresh, created }: { record: RequestRecord | undefined; service: LiveRequestService; refresh: () => Promise<void>; created: boolean }) {
  const [action, setAction] = useState<RequestAction | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  if (!record) return <Empty title="Talep bulunamadı" description="Kayıt bulunamadı veya görüntüleme yetkiniz yok."><a className="button primary" href="#/requests">Talep listesine dön</a></Empty>;
  async function claim() {
    if (!record) return;
    setBusy(true); setError('');
    try { await service.claim(record); await refresh(); setMessage('Talep üzerinize alındı.'); }
    catch (e) { setError(errorMessage(e)); await refresh().catch(() => {}); }
    finally { setBusy(false); }
  }
  async function upload(file: File) {
    if (!record) return;
    setBusy(true); setError('');
    try { await service.upload(record, file); await refresh(); setMessage('Dosya yüklendi.'); }
    catch (e) { setError(errorMessage(e)); await refresh().catch(() => {}); }
    finally { setBusy(false); }
  }
  const failedUploads = JSON.parse(sessionStorage.getItem(`uploadFailures:${record.id}`) || '[]') as string[];
  const info = [['Talep Eden', personName(record.requester)], ['İlgili Kişi', personName(record.relatedPerson)], ['Kaynak Müftülük', departments.find(d => d.id === record.sourceDepartmentId)?.name ?? 'Eşleştirme bekliyor'], ['Hedef Müftülük', departments.find(d => d.id === record.targetDepartmentId)?.name ?? 'Eşleştirme bekliyor'], ['Personel Grubu', personnelGroups.find(g => g.id === record.targetPersonnelGroupId)?.name ?? 'Yönlendirme bekliyor'], ['Sorumlu', personName(record.assignee)], ['Talep Türü', record.type], ['Kategori', record.category], ['Gizlilik', record.privacy], ['Oluşturulma', dateTime(record.createdAt)], ['Son Tarih', dateText(record.dueDate)], ['Tamamlanma', record.completedAt ? dateTime(record.completedAt) : '—'], ['Kapatılma', record.closedAt ? dateTime(record.closedAt) : '—']];
  const definition = typeDefinitions.find(t => t.name === record.type);
  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!record) return; setError(''); setBusy(true);
    try { await service.comment(record.id, comment); await refresh(); setComment(''); setMessage('Yorum eklendi.'); } catch (e) { setError(errorMessage(e)); await refresh().catch(() => {}); } finally { setBusy(false); }
  }
  return <>
    <a href="#/requests" className="breadcrumb">Talepler <Icon name="chevron" size={14}/> {record.number}</a>
    <PageTitle title={record.subject} description={record.number}><div className="detail-badges"><Badge>{record.priority}</Badge><Badge>{record.status}</Badge><Delay record={record}/></div></PageTitle>
    {failedUploads.length > 0 && <div className="error-banner" role="alert">Talep kaydedildi. Bazı dosyalar yüklenemedi; aşağıdaki dosya alanından tekrar deneyin: {failedUploads.join('; ')}<button onClick={() => { sessionStorage.removeItem(`uploadFailures:${record.id}`); setMessage('Dosya yükleme uyarısı kaldırıldı.'); }}>Uyarıyı kapat</button></div>}{created && <div className="success-banner" role="status"><Icon name="check"/>Talebiniz oluşturuldu. Liste ve dashboard güncellendi.</div>}{message && <div className="success-banner" role="status">{message}</div>}{error && <div className="error-banner" role="alert">{error}</div>}
    <div className="detail-layout"><div className="detail-main"><section className="card padded"><h2>Talep Açıklaması</h2><p className="description-text">{record.description}</p>{record.tags && <div className="tags">{record.tags.split(',').map((tag, i) => <span key={i}>#{tag.trim()}</span>)}</div>}{definition && definition.fields.length > 0 && <div className="dynamic-details"><h3>Türe Özel Bilgiler</h3><dl>{definition.fields.map(f => <div key={f.key}><dt>{f.label}</dt><dd>{f.type === 'date' ? dateText(record.dynamic[f.key]) : f.type === 'datetime-local' && record.dynamic[f.key] ? dateTime(record.dynamic[f.key]) : record.dynamic[f.key] || '—'}</dd></div>)}</dl></div>}</section>
    <section className="card"><div className="card-header"><h2><Icon name="message" size={18}/>Yorumlar <span className="count-bubble">{record.comments.length}</span></h2></div><div className="comments">{record.comments.length ? record.comments.map(c => <article className="comment" key={c.id}><span className="avatar">{personName(c.author).split(' ').map(n => n[0]).join('')}</span><div><div className="comment-meta"><strong>{personName(c.author)}</strong><time>{dateTime(c.date)}</time></div><p>{c.text}</p></div></article>) : <p className="muted">Henüz yorum eklenmedi. İlk değerlendirmeyi siz paylaşın.</p>}{record.canComment && <form onSubmit={addComment}><Field label="Yorumunuz"><textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} required maxLength={2000} placeholder="Talep hakkında bir değerlendirme ekleyin…"/></Field><button className="primary" disabled={busy || !comment.trim()}>{busy ? 'Ekleniyor…' : 'Yorum Ekle'}</button></form>}</div></section>
    <section className="card"><div className="card-header"><h2><Icon name="file" size={18}/>Ek Dosyalar <span className="count-bubble">{record.attachments.length}</span></h2></div><div className="padded attachment-section"><p className="muted">PDF, PNG, JPEG, DOCX, XLSX · En fazla 10 MB / dosya.</p>{record.canUpload && <input aria-label="Dosya ekle" type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void upload(file); }}/>}{record.attachments.length ? record.attachments.map((f, i) => <div className="attachment" key={i}><Icon name="file"/><div><strong><a href={`/api/v1/requests/${record.id}/attachments/${f.id}/download`}>{f.name}</a></strong><small>{(f.size / 1024).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} KB</small></div></div>) : <p className="empty-inline">Ek dosya bulunmuyor.</p>}</div></section>
    <section className="card"><div className="card-header"><h2><Icon name="clock" size={18}/>Zaman Çizelgesi</h2></div><ol className="timeline">{[...record.timeline].reverse().map(e => <li key={e.id}><span className="timeline-dot"/><div><p>{e.text}</p><small>{personName(e.actor)} · {dateTime(e.date)}</small></div></li>)}</ol></section></div>
    <aside className="detail-aside"><section className="card"><div className="card-header"><h2>Talep Bilgileri</h2><Icon name="info" size={18}/></div><dl className="info-list">{info.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section><section className="card padded"><h2>Talep İşlemleri</h2><p className="section-description">Yetkinize uygun işlemleri uygulayabilirsiniz.</p><div className="action-list">{record.allowedActions?.includes('claim') && <button className="primary" disabled={busy} onClick={() => void claim()}>Üzerime Al</button>}{(Object.entries(actions) as [RequestAction, string][]).filter(([key]) => record.allowedActions?.includes(key)).map(([key, label]) => <button key={key} className={key === 'complete' ? 'primary' : ''} disabled={key === 'close' && record.status !== 'Tamamlandı'} onClick={() => setAction(key)}><Icon name={key === 'complete' ? 'check' : key === 'assign' ? 'users' : key === 'close' ? 'lock' : 'arrow'} size={17}/>{label}</button>)}</div>{record.allowedActions?.includes('complete') && <small className="muted">Kapatmak için önce talebi tamamlayın.</small>}</section></aside></div>
    {action && <ActionDialog record={record} action={action} onClose={() => setAction(null)} onAction={async (key, value, note) => { try { await service.update(record.id, key, value, note); } catch (e) { await refresh().catch(() => {}); throw e; } await refresh(); setMessage('Talep güncellendi. İşlem zaman çizelgesine eklendi.'); }}/>}</>;
}

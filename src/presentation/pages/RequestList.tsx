import { useEffect, useState } from 'react';
import { categories, priorities, statuses, typeDefinitions } from '../../domain/requests/model';
import { departments, personnelGroups, people } from '../../domain/identity/organization';
import RequestTable from '../components/RequestTable';
import { Field, Icon, PageTitle, Select } from '../components/ui';
import type { User } from '../../domain/identity/organization';
import type { RequestFilters } from '../../application/requests/types';
import type { SelectOption } from '../components/ui';
import type { LiveRequestService, Page, DashboardData } from '../../infrastructure/httpRequestService';
import { errorMessage } from '../errors';

export default function RequestList({ service, user, query }: { service: LiveRequestService; user: User; query: string }) {
  const initial = Object.fromEntries(new URLSearchParams(query));
  const [filters, setFilters] = useState<RequestFilters>(initial);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [result, setResult] = useState<Page>();
  const [summary, setSummary] = useState<DashboardData>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const scope = initial.view;
  const invalidDates = !!(filters.from && filters.to && filters.from > filters.to);
  useEffect(() => {
    const controller = new AbortController();
    if (invalidDates) return () => controller.abort();
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      service.page(filters, page, pageSize, controller.signal).then(setResult).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, page, pageSize, service, invalidDates, reload]);
  useEffect(() => { const c = new AbortController(); service.dashboard(scope, c.signal).then(setSummary).catch(e => { if (!c.signal.aborted) setError(errorMessage(e)); }); return () => c.abort(); }, [scope, service]);
  const change = (key: keyof RequestFilters, value: string) => { setFilters(f => ({ ...f, [key]: value, ...(key === 'targetDepartmentId' ? {targetPersonnelGroupId: ''} : {}) })); setPage(1); };
  const fields: [keyof RequestFilters, string, readonly SelectOption[]][] = [['type', 'Talep Türü', typeDefinitions.map(t => t.name)], ['category', 'Kategori', categories], ['status', 'Durum', statuses], ['priority', 'Öncelik', priorities], ['targetDepartmentId', 'Müftülük', departments.map(d => ({value: d.id, label: d.name}))], ['targetPersonnelGroupId', 'Personel Grubu', personnelGroups.filter(g => !filters.targetDepartmentId || g.departmentId === filters.targetDepartmentId).map(g => ({value: g.id, label: `${departments.find(d => d.id === g.departmentId)?.name ?? ''} / ${g.name}`}))], ['assignee', 'Sorumlu', people.map(p => ({ value: p.id, label: p.name }))], ['requester', 'Talep Eden', people.map(p => ({ value: p.id, label: p.name }))]];
  const pages = Math.max(1, Math.ceil((result?.totalCount || 0) / pageSize));
  const title = scope === 'assigned' ? 'Bana Atananlar' : scope === 'created' ? 'Oluşturduklarım' : scope === 'queue' ? 'İş Havuzum' : scope === 'incoming' ? 'Müftülüğe Gelenler' : scope === 'outgoing' ? 'Müftülükten Gidenler' : scope === 'routing' ? 'Yönlendirme Havuzu' : 'Tüm Talepler';
  return <><PageTitle title={title} description={scope === 'queue' ? 'Müftülüğünüzde üyesi olduğunuz gruplara gelen, sorumlusu olmayan işler.' : scope === 'routing' ? 'Hedef grubu henüz belirlenmemiş işleri ilgili personel grubu havuzuna yönlendirin.' : 'Erişim yetkiniz olan talepleri takip edin.'}>{user.canCreateRequests && <a className="button primary" href="#/new"><Icon name="plus"/>Yeni Talep Oluştur</a>}</PageTitle>
    <section className="card filter-card"><div className="filter-heading"><h2>Filtreler</h2><button className="text-link" onClick={() => { setFilters({ view: scope }); setPage(1); }}>Filtreleri temizle</button></div><div className="filter-grid">
    <Field label="Arama"><input value={filters.search || ''} onChange={e => change('search', e.target.value)} placeholder="Talep no, konu, açıklama…"/></Field>
    {fields.map(([key, label, options]) => <Field key={key} label={label}><Select options={options} value={filters[key] || ''} onChange={e => change(key, e.target.value)}/></Field>)}
    <Field label="Başlangıç"><input type="date" value={filters.from || ''} onChange={e => change('from', e.target.value)}/></Field><Field label="Bitiş" error={invalidDates ? 'Bitiş tarihi başlangıçtan önce olamaz.' : ''}><input type="date" value={filters.to || ''} onChange={e => change('to', e.target.value)}/></Field></div></section>
    <div className="quick-filters">{([['', 'Tümü', summary?.total], ['open', 'Açık', summary?.open], ['overdue', 'Geciken', summary?.overdue], ['critical', 'Kritik', summary?.critical], ['completed', 'Tamamlanan', summary?.completed]] as const).map(([key, label, count]) => <button key={key} className={(filters.quick || '') === key ? 'active' : ''} onClick={() => change('quick', key)}>{label}<span>{count ?? '…'}</span></button>)}</div>
    {error && <div className="error-banner" role="alert">{error}<button onClick={() => setReload(r => r + 1)}>Yeniden dene</button></div>}
    <section className="card list-card"><div className="list-toolbar"><p><strong>{invalidDates ? 0 : result?.totalCount ?? '…'}</strong> talep</p><Select placeholder={null} options={[{ value: 'createdAt:desc', label: 'Oluşturulma · Yeni → Eski' }, { value: 'createdAt:asc', label: 'Oluşturulma · Eski → Yeni' }, { value: 'dueDate:asc', label: 'Son tarih · Yakın → Uzak' }, { value: 'priority:desc', label: 'Öncelik · Kritik → Düşük' }, { value: 'subject:asc', label: 'Konu · A → Z' }, { value: 'delay:desc', label: 'Gecikme · Çok → Az' }]} value={filters.sort || 'createdAt:desc'} onChange={e => change('sort', e.target.value)}/></div>
    {loading && !invalidDates ? <div className="loading">Talepler yükleniyor…</div> : <RequestTable records={invalidDates ? [] : result?.items || []}/>}
    <footer className="pagination"><label>Sayfa başına <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10, 20, 50].map(n => <option key={n}>{n}</option>)}</select></label><div><button disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>Önceki</button><span>{page} / {pages}</span><button disabled={page >= pages || loading} onClick={() => setPage(p => p + 1)}>Sonraki</button></div></footer></section>
  </>;
}

import { useState } from 'react';
import { selectRequests } from '../../application/requests/service.js';
import { summarize } from '../../application/dashboard/summary.js';
import { categories, priorities, statuses, typeDefinitions } from '../../domain/requests/model.js';
import { departments, people } from '../../domain/identity/organization.js';
import RequestTable from '../components/RequestTable.jsx';
import { Field, Select, PageTitle, Icon } from '../components/ui.jsx';
import { numberText } from '../format.js';
export default function RequestList({ records, user, query }) {
  const initial = Object.fromEntries(new URLSearchParams(query));
  const [filters, setFilters] = useState(initial);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const scope = initial.view;
  const scoped = records.filter(r => scope === 'assigned' ? r.assignee === user.id : scope === 'created' ? r.requester === user.id : true);
  const invalidDates = filters.from && filters.to && filters.from > filters.to;
  const result = invalidDates ? [] : selectRequests(scoped, filters);
  const pages = Math.max(1, Math.ceil(result.length / pageSize));
  const current = Math.min(page, pages);
  const summary = summarize(scoped);
  const change = (key, value) => { setFilters(f => ({ ...f, [key]: value })); setPage(1); };
  const fields = [['type', 'Talep Türü', typeDefinitions.map(t => t.name)], ['category', 'Kategori', categories], ['status', 'Durum', statuses], ['priority', 'Öncelik', priorities], ['department', 'Birim', departments], ['assignee', 'Sorumlu', people.map(p => ({ value: p.id, label: p.name }))], ['requester', 'Talep Eden', people.map(p => ({ value: p.id, label: p.name }))]];
  const activeCount = Object.entries(filters).filter(([key, value]) => value && !['view', 'sort', 'quick'].includes(key)).length;
  return <>
    <PageTitle title={scope === 'assigned' ? 'Bana Atananlar' : scope === 'created' ? 'Oluşturduklarım' : 'Tüm Talepler'} description="Talepleri inceleyin, filtreleyin ve süreçlerini takip edin."><a className="button primary" href="#/new"><Icon name="plus" size={18}/>Yeni Talep Oluştur</a></PageTitle>
    <section className="card filter-card"><div className="filter-heading"><h2><Icon name="filter" size={17}/>Filtreler {activeCount > 0 && <span className="count-bubble">{activeCount}</span>}</h2><button className="text-link" onClick={() => { setFilters({}); setPage(1); }}>Filtreleri temizle</button></div><div className="filter-grid"><Field label="Arama"><div className="input-icon"><Icon name="search" size={17}/><input value={filters.search || ''} onChange={e => change('search', e.target.value)} placeholder="Talep no, konu, açıklama…"/></div></Field>{fields.map(([key, label, options]) => <Field key={key} label={label}><Select options={options} value={filters[key] || ''} onChange={e => change(key, e.target.value)}/></Field>)}<Field label="Oluşturulma · Başlangıç"><input type="date" value={filters.from || ''} onChange={e => change('from', e.target.value)}/></Field><Field label="Oluşturulma · Bitiş" error={invalidDates ? 'Bitiş tarihi başlangıçtan önce olamaz.' : ''}><input type="date" value={filters.to || ''} onChange={e => change('to', e.target.value)} aria-invalid={!!invalidDates}/></Field></div></section>
    <div className="quick-filters" aria-label="Hızlı filtreler">{[['', 'Tümü', summary.total, 'file'], ['open', 'Açık', summary.open, 'briefcase'], ['overdue', 'Geciken', summary.overdue, 'clock'], ['critical', 'Kritik', summary.critical, 'alert'], ['completed', 'Tamamlanan', summary.completed, 'check']].map(([key, label, count, icon]) => <button key={key} className={(filters.quick || '') === key ? 'active' : ''} aria-pressed={(filters.quick || '') === key} onClick={() => change('quick', key)}><Icon name={icon} size={17}/>{label}<span>{count}</span></button>)}</div>
    <section className="card list-card"><div className="list-toolbar"><p><strong>{numberText(result.length)}</strong> talep listeleniyor</p><label className="sort-control">Sıralama <Select placeholder={null} options={[{ value: 'createdAt:desc', label: 'Oluşturulma · Yeni → Eski' }, { value: 'createdAt:asc', label: 'Oluşturulma · Eski → Yeni' }, { value: 'dueDate:asc', label: 'Son tarih · Yakın → Uzak' }, { value: 'priority:desc', label: 'Öncelik · Kritik → Düşük' }, { value: 'subject:asc', label: 'Konu · A → Z' }, { value: 'delay:desc', label: 'Gecikme · Çok → Az' }]} value={filters.sort || 'createdAt:desc'} onChange={e => change('sort', e.target.value)}/></label></div><RequestTable records={result.slice((current - 1) * pageSize, current * pageSize)}/><footer className="pagination"><label>Sayfa başına <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10, 20, 50].map(n => <option key={n}>{n}</option>)}</select> kayıt</label><div><span>{result.length ? (current - 1) * pageSize + 1 : 0}–{Math.min(current * pageSize, result.length)} / {result.length} kayıt</span><button className="icon-button" aria-label="Önceki sayfa" disabled={current === 1} onClick={() => setPage(current - 1)}>‹</button>{Array.from({ length: pages }, (_, i) => <button aria-label={`Sayfa ${i + 1}`} aria-current={current === i + 1 ? 'page' : undefined} className={`page-button ${current === i + 1 ? 'active' : ''}`} key={i} onClick={() => setPage(i + 1)}>{i + 1}</button>)}<button className="icon-button" aria-label="Sonraki sayfa" disabled={current === pages} onClick={() => setPage(current + 1)}>›</button></div></footer></section>
  </>;
}

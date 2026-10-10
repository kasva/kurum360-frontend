import { useEffect, useState } from 'react';
import type { User } from '../../domain/identity/organization';
import { RequestValidationError } from '../../application/requests/errors';
import { agendaService, agendaToday, agendaMidnight, shiftDay, agendaDate, agendaTime, agendaLocal } from '../../infrastructure/agendaService';
import type { AgendaEvent, AgendaInput, AgendaDirectory } from '../../infrastructure/agendaService';
import { Empty, Field, Modal, PageTitle } from '../components/ui';
import { errorMessage } from '../errors';

type View = 'day' | 'week' | 'month';
function range(day: string, view: View) {
  if (view === 'day') return { first: day, count: 1 };
  const base = view === 'month' ? `${day.slice(0, 7)}-01` : day;
  const weekday = (new Date(`${base}T12:00:00Z`).getUTCDay() + 6) % 7;
  return { first: shiftDay(base, -weekday), count: view === 'week' ? 7 : 42 };
}
const overlaps = (a: AgendaEvent, start: string, end: string) => !a.isCancelled && new Date(a.startsAt) < new Date(end) && new Date(a.endsAt) > new Date(start);

function Editor({ event, shared, day, directory, onClose, onSaved }: { event?: AgendaEvent; shared: boolean; day: string; directory: AgendaDirectory; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState({ title: event?.title ?? '', description: event?.description ?? '', location: event?.location ?? '',
    startsAt: event ? agendaLocal(event.startsAt) : `${day}T09:00`, endsAt: event ? agendaLocal(event.endsAt) : `${day}T10:00`,
    allDepartment: false, userIds: event?.userIds ?? [], groupIds: [] as string[] });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [conflicts, setConflicts] = useState<string[] | null>(null);
  const change = <K extends keyof typeof draft,>(key: K, value: typeof draft[K]) => { setDraft(d => ({ ...d, [key]: value })); setConflicts(null); };
  const toggle = (key: 'userIds' | 'groupIds', id: string) => change(key, draft[key].includes(id) ? draft[key].filter(i => i !== id) : [...draft[key], id]);
  async function save() {
    setError('');
    if (draft.endsAt <= draft.startsAt) { setError('Bitiş zamanı başlangıçtan sonra olmalıdır.'); return; }
    if (shared && !draft.allDepartment && !draft.userIds.length && !draft.groupIds.length) { setError('Katılımcı veya personel grubu seçin.'); return; }
    setBusy(true);
    try {
      const input: AgendaInput = { ...draft, startsAt: `${draft.startsAt}:00+03:00`, endsAt: `${draft.endsAt}:00+03:00`, isShared: shared, version: event?.version ?? 0,
        userIds: shared ? draft.userIds : [], groupIds: shared ? draft.groupIds : [] };
      if (conflicts === null) {
        const existing: AgendaEvent[] = [];
        const end = new Date(input.endsAt).getTime();
        for (let start = new Date(input.startsAt).getTime(); start < end; start += 62 * 86400000) {
          existing.push(...await agendaService.list(new Date(start).toISOString(), new Date(Math.min(end, start + 62 * 86400000)).toISOString()));
        }
        const collisions = [...new Map(existing.filter(e => e.id !== event?.id && overlaps(e, input.startsAt, input.endsAt)).map(e => [e.id, e.title])).values()];
        setConflicts(collisions); if (collisions.length) return;
      }
      await agendaService.save(input, event?.id); onSaved();
    } catch (e) { setError(e instanceof RequestValidationError ? Object.values(e.errors).filter(Boolean).join(' ') : errorMessage(e)); } finally { setBusy(false); }
  }
  return <Modal wide title={event ? 'Programı düzenle' : shared ? 'Toplantı oluştur' : 'Kişisel program ekle'} onClose={onClose}>
    <form onSubmit={e => { e.preventDefault(); void save(); }}>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <div className="form-grid">
        <Field label="Başlık" required className="full"><input required maxLength={160} value={draft.title} onChange={e => change('title', e.target.value)}/></Field>
        <Field label="Başlangıç (Türkiye saati)" required><input type="datetime-local" required value={draft.startsAt} onChange={e => change('startsAt', e.target.value)}/></Field>
        <Field label="Bitiş (Türkiye saati)" required><input type="datetime-local" required value={draft.endsAt} onChange={e => change('endsAt', e.target.value)}/></Field>
        <Field label="Yer / çevrim içi bağlantı" className="full"><input maxLength={500} value={draft.location} onChange={e => change('location', e.target.value)}/></Field>
        <Field label="Açıklama" className="full"><textarea rows={3} maxLength={2000} value={draft.description} onChange={e => change('description', e.target.value)}/></Field>
      </div>
      {shared && <fieldset className="agenda-participants"><legend>Katılımcılar — kendi müftülüğünüz</legend>
        <label><input type="checkbox" checked={draft.allDepartment} onChange={e => change('allDepartment', e.target.checked)}/>Müftülüğümdeki tüm aktif personel</label>
        {!draft.allDepartment && <div className="agenda-pickers"><div><strong>Kişiler</strong>{directory.users.map(u => <label key={u.id}><input type="checkbox" checked={draft.userIds.includes(u.id)} onChange={() => toggle('userIds', u.id)}/>{u.name}</label>)}</div>
          <div><strong>Personel grupları</strong>{directory.groups.map(g => <label key={g.id}><input type="checkbox" checked={draft.groupIds.includes(g.id)} onChange={() => toggle('groupIds', g.id)}/>{g.name}</label>)}</div></div>}
        <small>Düzenleyici de katılımcıdır. Seçilen grupların mevcut aktif üyeleri eklenir; sonraki üyelik değişiklikleri bu toplantıyı değiştirmez.</small>
      </fieldset>}
      {!!conflicts?.length && <p className="notice" role="alert">Ajandanızda bu saatlerle çakışan programlar var: {conflicts.join(', ')}. Yine de kaydedebilirsiniz. Diğer katılımcıların müsaitliği bu uyarıya dahil değildir.</p>}
      <div className="agenda-actions"><button type="button" className="button" disabled={busy} onClick={onClose}>Vazgeç</button><button className="button primary" disabled={busy}>{busy ? 'Kaydediliyor…' : conflicts?.length ? 'Çakışmaya rağmen kaydet' : 'Kaydet'}</button></div>
    </form>
  </Modal>;
}

export default function Agenda({ user, query = '' }: { user: User; query?: string }) {
  const [day, setDay] = useState(agendaToday); const [view, setView] = useState<View>('day');
  const [events, setEvents] = useState<AgendaEvent[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [reload, setReload] = useState(0); const [directory, setDirectory] = useState<AgendaDirectory>({ users: [], groups: [] });
  const [selected, setSelected] = useState<AgendaEvent>(); const [editor, setEditor] = useState<{ event?: AgendaEvent; shared: boolean }>(); const [busy, setBusy] = useState(false);
  const canOrganize = !!user.departmentId && !!(user.isOperator || user.isInstitutionManager || user.roleCode === 'SystemAdmin');
  // The server's directory endpoint is the authority for shared-meeting access.
  const [directoryReady, setDirectoryReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    if (canOrganize) agendaService.directory(controller.signal).then(d => { setDirectory(d); setDirectoryReady(true); }).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); });
    return () => controller.abort();
  }, [canOrganize, user.roleCode]);
  const { first, count } = range(day, view); const last = shiftDay(first, count);
  useEffect(() => {
    const controller = new AbortController();
    agendaService.list(agendaMidnight(first), agendaMidnight(last), controller.signal).then(setEvents).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [first, last, reload]);
  const eventId = new URLSearchParams(query).get('event');
  useEffect(() => {
    if (!eventId) return;
    const controller = new AbortController();
    agendaService.get(eventId, controller.signal).then(e => { setSelected(e); setDay(agendaLocal(e.startsAt).slice(0, 10)); }).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); });
    return () => controller.abort();
  }, [eventId]);
  function refresh() { setEditor(undefined); setSelected(undefined); setError(''); setLoading(true); setReload(r => r + 1); }
  function navigate(amount: number) {
    if (view === 'month') { const date = new Date(`${day.slice(0, 7)}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + amount); setDay(date.toISOString().slice(0, 10)); }
    else setDay(shiftDay(day, amount * count));
    setLoading(true); setError('');
  }
  async function cancel() {
    if (!selected) return; setBusy(true); setError('');
    try { await agendaService.cancel(selected); refresh(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <>
    <PageTitle title="Ajandam" description="Kişisel programınız ve katılacağınız toplantılar. Saatler Türkiye saatidir.">
      <div className="agenda-actions">
      <button className="button primary" onClick={() => setEditor({ shared: false })}>Kişisel program ekle</button>
      {directoryReady && <button className="button" onClick={() => setEditor({ shared: true })}>Toplantı oluştur</button>}
      </div>
    </PageTitle>
    {error && <p className="error-banner" role="alert">{error}<button onClick={refresh}>Yeniden yükle</button></p>}
    <div className="card agenda-toolbar"><div className="agenda-actions"><button aria-label="Önceki dönem" onClick={() => navigate(-1)}>‹</button><button onClick={() => { setDay(agendaToday()); }}>Bugün</button><button aria-label="Sonraki dönem" onClick={() => navigate(1)}>›</button><input aria-label="Tarih seç" type="date" value={day} onChange={e => { if (e.target.value) setDay(e.target.value); }}/></div>
      <div className="agenda-actions">{(['day', 'week', 'month'] as const).map(v => <button key={v} aria-pressed={view === v} className={view === v ? 'button primary' : 'button'} onClick={() => setView(v)}>{({ day: 'Gün', week: 'Hafta', month: 'Ay' })[v]}</button>)}</div>
    </div>
    {loading ? <p className="loading">Ajanda yükleniyor…</p> : <div className={`agenda-grid agenda-${view}`}>
      {Array.from({ length: count }, (_, index) => {
        const date = shiftDay(first, index); const items = events.filter(e => new Date(e.startsAt) < new Date(agendaMidnight(shiftDay(date, 1))) && new Date(e.endsAt) > new Date(agendaMidnight(date)));
        return <section key={date} className={`card agenda-day-card ${date === agendaToday() ? 'agenda-current' : ''}`}><h2>{agendaDate(date)}</h2>
          {items.length ? items.map(e => <button key={e.id} className={`agenda-event ${e.isShared ? 'shared' : ''} ${e.isCancelled ? 'cancelled' : ''}`} onClick={() => setSelected(e)}>
            <span>{agendaTime(e.startsAt)}–{agendaTime(e.endsAt)}{agendaLocal(e.startsAt).slice(0, 10) !== agendaLocal(e.endsAt).slice(0, 10) && ' · Birden fazla gün'}</span><strong>{e.title}</strong><small>{e.isCancelled ? 'İptal edildi' : e.isShared ? `Toplantı · ${e.participantCount} katılımcı` : 'Kişisel program'}</small>{e.location && <small>{e.location}</small>}
          </button>) : <p className="muted">Program yok.</p>}
        </section>;
      })}
    </div>}
    {selected && !editor && <Modal title={selected.title} onClose={() => setSelected(undefined)}>{error && <p className="error-banner" role="alert">{error}</p>}<p>{agendaDate(agendaLocal(selected.startsAt).slice(0, 10))} · {agendaTime(selected.startsAt)} – {agendaDate(agendaLocal(selected.endsAt).slice(0, 10))} · {agendaTime(selected.endsAt)}</p>
      <p>{selected.isCancelled ? 'İptal edildi' : selected.isShared ? `Toplantı · ${selected.participantCount} katılımcı` : 'Kişisel program'}</p><p className="agenda-description">{selected.description}</p><p>{selected.location}</p>
      {selected.canEdit && <div className="agenda-actions"><button className="button primary" onClick={() => setEditor({ event: selected, shared: selected.isShared })}>Düzenle</button><button className="button" disabled={busy} onClick={() => { if (window.confirm('Bu program iptal edilsin mi? Katılımcılara bildirim gönderilecek.')) void cancel(); }}>{busy ? 'İptal ediliyor…' : 'Programı iptal et'}</button></div>}
    </Modal>}
    {editor && <Editor event={editor.event} shared={editor.shared} day={day} directory={directory} onClose={() => setEditor(undefined)} onSaved={refresh}/>}
  </>;
}

export function TodayAgenda() {
  const [items, setItems] = useState<AgendaEvent[]>(); const [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); const day = agendaToday();
    agendaService.list(agendaMidnight(day), agendaMidnight(shiftDay(day, 1)), controller.signal).then(data => setItems(data.filter(e => !e.isCancelled))).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); });
    return () => controller.abort();
  }, []);
  return <section className="card padded agenda-home"><div className="card-header"><h2>Bugünkü Programım</h2><a href="#/agenda">Ajandamı aç</a></div>{error ? <p className="error-banner">{error}</p> : !items ? <p>Program yükleniyor…</p> : items.length ? <div className="agenda-home-items">{items.map(e => <a className="agenda-event" key={e.id} href={`#/agenda?event=${e.id}`}><span>{agendaTime(e.startsAt)}–{agendaTime(e.endsAt)}</span><strong>{e.title}</strong><small>{e.location}</small></a>)}</div> : <Empty title="Bugün planlanmış programınız yok"/>}</section>;
}

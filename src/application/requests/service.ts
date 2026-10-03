import { canAssign, titles, people, personName } from '../../domain/identity/organization';
import { categories, delayDays, isOpen, isOption, isOverdue, localDate, priorities, privacyLevels, statuses, typeDefinitions, validateDraft } from '../../domain/requests/model';
import type { User } from '../../domain/identity/organization';
import type { RequestRecord, RequestStatus, TimelineEvent } from '../../domain/requests/types';
import type { RequestRepository } from './repository';
import type { RequestAction, RequestFilters, RequestService } from './types';
import { RequestValidationError } from './errors';

export function selectRequests(records: readonly RequestRecord[], filters: RequestFilters = {}, now = new Date()): RequestRecord[] {
  const query = (filters.search || '').trim().toLocaleLowerCase('tr');
  const selected = records.filter(r => {
    if (query && !`${r.number} ${r.subject} ${r.description}`.toLocaleLowerCase('tr').includes(query)) return false;
    for (const field of ['type', 'category', 'status', 'priority', 'targetTitle', 'assignee', 'requester'] as const) {
      if (filters[field] && r[field] !== filters[field]) return false;
    }
    if (filters.from && localDate(new Date(r.createdAt)) < filters.from) return false;
    if (filters.to && localDate(new Date(r.createdAt)) > filters.to) return false;
    if (filters.quick === 'open' && !isOpen(r)) return false;
    if (filters.quick === 'overdue' && !isOverdue(r, now)) return false;
    if (filters.quick === 'critical' && r.priority !== 'Kritik') return false;
    if (filters.quick === 'completed' && !['Tamamlandı', 'Kapatıldı'].includes(r.status)) return false;
    return true;
  });
  const [field, direction] = (filters.sort || 'createdAt:desc').split(':');
  const sortValue = (record: RequestRecord): number | string => {
    if (field === 'priority') return priorities.indexOf(record.priority);
    if (field === 'delay') return delayDays(record, now);
    if (field === 'dueDate' || field === 'subject') return record[field];
    return record.createdAt;
  };
  return selected.sort((a, b) => {
    const left = sortValue(a);
    const right = sortValue(b);
    const diff = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'tr');
    return direction === 'asc' ? diff : -diff;
  });
}

export function createRequestService(repository: RequestRepository, user: User, clock: () => Date = () => new Date()): RequestService {
  let sequence = 0;
  const id = () => `${clock().getTime()}-${++sequence}`;
  const event = (text: string): TimelineEvent => ({ id: id(), text, actor: user.id, date: clock().toISOString() });
  async function get(recordId: string): Promise<RequestRecord> {
    const record = (await repository.list()).find(r => r.id === recordId);
    if (!record) throw new Error('Talep bulunamadı.');
    return record;
  }
  return {
    list: () => repository.list(),
    async create(draft) {
      const errors = validateDraft(draft, clock());
      if (!titles.includes(draft.targetTitle)) errors.targetTitle = 'Geçerli bir ünvan seçin.';
      if (draft.assignee && (!canAssign(user) || !people.some(p => p.id === draft.assignee))) errors.assignee = 'Sorumlu seçimi geçersiz.';
      const definition = typeDefinitions.find(t => t.name === draft.type);
      const { category, priority, privacy } = draft;
      if (Object.keys(errors).length || !definition || !isOption(categories, category) || !isOption(priorities, priority) || !isOption(privacyLevels, privacy)) throw new RequestValidationError(errors);
      const records = await repository.list();
      const next = Math.max(0, ...records.map(r => Number(r.number.split('-').at(-1)))) + 1;
      const fields = definition.fields;
      const record: RequestRecord = { ...draft, type: definition.name, category, priority, privacy, subject: draft.subject.trim(), description: draft.description.trim(), dynamic: Object.fromEntries(fields.map(f => [f.key, draft.dynamic[f.key]])), id: id(), number: `TLP-${clock().getFullYear()}-${String(next).padStart(5, '0')}`, requester: user.id, createdAt: clock().toISOString(), status: draft.assignee ? 'Atandı' : 'Yeni', completedAt: null, closedAt: null, comments: [], timeline: [event('Talep oluşturuldu.'), ...(draft.assignee ? [event(`Sorumlu atandı: ${personName(draft.assignee)}.`)] : [])] };
      await repository.save(record);
      return record;
    },
    async comment(recordId, text) {
      if (!text.trim() || text.trim().length > 2000) throw new Error('Yorum 1–2.000 karakter olmalıdır.');
      const record = await get(recordId);
      record.comments.push({ id: id(), author: user.id, text: text.trim(), date: clock().toISOString() });
      record.timeline.push(event('Yorum eklendi.'));
      await repository.save(record);
    },
    async update(recordId, action, value = '', note = '') {
      const record = await get(recordId);
      const before = record.status;
      let message;
      if (action === 'assign') {
        if (!canAssign(user) || !people.some(p => p.id === value)) throw new Error('Geçerli bir sorumlu seçin.');
        record.assignee = value;
        if (['Yeni', 'Değerlendiriliyor'].includes(record.status)) record.status = 'Atandı';
        message = `Sorumlu: ${personName(value)}.`;
      } else if (action === 'title') {
        if (!titles.includes(value)) throw new Error('Geçerli bir ünvan seçin.');
        record.targetTitle = value;
        record.assignee = '';
        if (record.status === 'Atandı') record.status = 'Değerlendiriliyor';
        message = `${value} ünvanına yönlendirildi. Önceki sorumlu kaldırıldı.`;
      } else if (action === 'priority') {
        if (!isOption(priorities, value)) throw new Error('Geçerli bir öncelik seçin.');
        message = `Öncelik: ${record.priority} → ${value}.`;
        record.priority = value;
      } else {
        const transitions: Partial<Record<RequestAction, RequestStatus>> = { complete: 'Tamamlandı', approval: 'Onay Bekliyor', revise: 'İşlemde', close: 'Kapatıldı' };
        const next = transitions[action] || (action === 'status' ? value : '');
        if (!isOption(statuses, next)) throw new Error('Geçerli bir durum seçin.');
        if (next === 'Kapatıldı' && before !== 'Tamamlandı') throw new Error('Kapatmadan önce talebi tamamlayın.');
        if (action === 'revise' && !note.trim()) throw new Error('Revizyon gerekçesi zorunludur.');
        record.status = next;
        if (next === 'Tamamlandı') record.completedAt = record.completedAt || clock().toISOString();
        else if (next !== 'Kapatıldı') record.completedAt = null;
        record.closedAt = next === 'Kapatıldı' ? clock().toISOString() : null;
        message = action === 'revise' ? `Revizyon istendi. ${before} → ${next}.` : `Durum: ${before} → ${next}.`;
      }
      if (before !== record.status && ['assign', 'title'].includes(action)) message += ` Durum: ${before} → ${record.status}.`;
      record.timeline.push(event(`${message}${note.trim() ? ` Not: ${note.trim()}` : ''}`));
      await repository.save(record);
    },
  };
}

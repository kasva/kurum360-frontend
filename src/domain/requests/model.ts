import type { Category, Priority, Privacy, RequestDraft, RequestStatus, RequestTiming, TypeDefinition, ValidationErrors } from './types';
export const isOption = <T extends string>(options: readonly T[], value: string): value is T => options.some(option => option === value);
export const statuses: readonly RequestStatus[] = ['Yeni', 'Değerlendiriliyor', 'Atandı', 'İşlemde', 'Beklemede', 'Onay Bekliyor', 'Tamamlandı', 'Kapatıldı', 'Reddedildi', 'İptal Edildi'];
export const priorities: readonly Priority[] = ['Düşük', 'Normal', 'Yüksek', 'Kritik'];
export const privacyLevels: readonly Privacy[] = ['Normal', 'Gizli', 'Çok Gizli'];
export const categories: Category[] = ['Donanım', 'Yazılım', 'Bina ve Tesis', 'Eğitim', 'Bütçe', 'Sözleşme', 'Sosyal Haklar', 'Toplantı', 'Kurumsal Süreç'];
export const categoryDefinitions: { code: string; name: string; isActive: boolean }[] = [];
export const typeDefinitions: TypeDefinition[] = [
  { name: 'Talep', description: 'Bir ihtiyacın karşılanmasına yönelik talepler.', icon: 'file', fields: [] },
  { name: 'Şikâyet', description: 'Hizmet, süreç veya yaşanan bir olay hakkında.', icon: 'alert', fields: [
    { key: 'incidentDate', label: 'Olay tarihi', type: 'date', required: true, dateRule: 'past' },
    { key: 'incident', label: 'Şikâyet bilgileri', type: 'textarea', required: true },
  ] },
  { name: 'Öneri', description: 'Kurumun gelişimi için fikir ve öneriler.', icon: 'bulb', fields: [] },
  { name: 'Görüşme İsteği', description: 'Yönetici ile görüşme isteği oluşturun.', icon: 'calendar', fields: [
    { key: 'reason', label: 'Görüşme nedeni', type: 'textarea', required: true },
    { key: 'preferredDate', label: 'Tercih edilen tarih ve saat', type: 'datetime-local', required: true, dateRule: 'future' },
    { key: 'duration', label: 'Süre (dakika)', type: 'number', required: true, min: 5, max: 240 },
    { key: 'meetingMode', label: 'Görüşme şekli', type: 'select', required: true, options: ['Yüz yüze', 'Çevrim içi', 'Telefon'] },
    { key: 'participants', label: 'Katılımcılar', type: 'text', required: true },
  ] },
  { name: 'Yönetici Talimatı', description: 'Yönetici tarafından verilen işler.', icon: 'briefcase', fields: [] },
];
export const isTerminal = (r: Pick<RequestTiming, 'status'>) => ['Tamamlandı', 'Kapatıldı', 'Reddedildi', 'İptal Edildi'].includes(r.status);
export const isOpen = (r: Pick<RequestTiming, 'status'>) => !isTerminal(r);
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function delayDays(r: RequestTiming, now = new Date()) {
  if ('delayDays' in r && typeof r.delayDays === 'number') return r.delayDays;
  if (!r.dueDate || ['Reddedildi', 'İptal Edildi'].includes(r.status)) return 0;
  const end = r.completedAt || (r.status === 'Kapatıldı' ? r.closedAt : null) || now;
  return Math.max(0, Math.round((Date.parse(localDate(new Date(end)) + 'T00:00:00Z') - Date.parse(r.dueDate + 'T00:00:00Z')) / 86400000));
}
export const isOverdue = (r: RequestTiming, now = new Date()) => isOpen(r) && delayDays(r, now) > 0;
export const emptyDraft = (): RequestDraft => ({ type: typeDefinitions.find(t => t.isActive !== false)?.name ?? '', category: '', subject: '', description: '', priority: 'Normal', targetTitle: '', relatedPerson: '', assignee: '', dueDate: '', privacy: 'Normal', tags: '', dynamic: {}, attachments: [] });
export function validateDraft(draft: RequestDraft, now = new Date()) {
  const errors: ValidationErrors = {};
  for (const [key, label] of Object.entries({ type: 'Talep türü', category: 'Kategori', subject: 'Konu', description: 'Açıklama', targetTitle: 'İlgili ünvan', dueDate: 'Son tarih' }) as [keyof RequestDraft, string][]) {
    if (!String(draft[key] || '').trim()) errors[key] = `${label} zorunludur.`;
  }
  if (draft.subject.trim().length > 160) errors.subject = 'Konu en fazla 160 karakter olabilir.';
  if (draft.description.trim().length > 2000) errors.description = 'Açıklama en fazla 2.000 karakter olabilir.';
  if (draft.dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate) || !Number.isFinite(Date.parse(draft.dueDate)) || draft.dueDate < localDate(now))) errors.dueDate = 'Son tarih bugün veya gelecekte olmalıdır.';
  if (!isOption(categories, draft.category)) errors.category = 'Geçerli bir kategori seçin.';
  if (!isOption(priorities, draft.priority)) errors.priority = 'Geçerli bir öncelik seçin.';
  if (!isOption(privacyLevels, draft.privacy)) errors.privacy = 'Geçerli bir gizlilik seviyesi seçin.';
  const definition = typeDefinitions.find(t => t.name === draft.type);
  if (!definition || definition.isActive === false) errors.type = 'Aktif bir talep türü seçin.';
  if (categoryDefinitions.length && !categoryDefinitions.some(c => c.name === draft.category && c.isActive)) errors.category = 'Aktif bir kategori seçin.';
  for (const field of definition?.fields || []) {
    const value = draft.dynamic[field.key];
    if (field.required && !String(value || '').trim()) errors[field.key] = `${field.label} zorunludur.`;
    else if (value) {
      if (field.dateRule && !Number.isFinite(Date.parse(value))) errors[field.key] = 'Geçerli bir tarih girin.';
      else if (field.dateRule === 'past' && value > localDate(now)) errors[field.key] = 'Olay tarihi gelecekte olamaz.';
      else if (field.dateRule === 'future' && new Date(value) <= now) errors[field.key] = 'Gelecekte bir tarih ve saat seçin.';
      if (field.type === 'number' && (!Number.isFinite(Number(value)) || Number(value) < field.min || Number(value) > field.max)) errors[field.key] = `${field.min}–${field.max} arası bir değer girin.`;
      if (field.options && !field.options.includes(value)) errors[field.key] = 'Listeden bir seçenek seçin.';
    }
  }
  return errors;
}

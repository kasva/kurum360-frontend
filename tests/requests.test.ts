import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestService, selectRequests } from '../src/application/requests/service';
import { summarize } from '../src/application/dashboard/summary';
import { emptyDraft, isOverdue, delayDays, validateDraft } from '../src/domain/requests/model';
import { people } from '../src/domain/identity/organization';
import { MemoryRequestRepository } from '../src/infrastructure/memoryRequestRepository';
import { createSeed } from '../src/infrastructure/seed';

import type { RequestDraft, RequestTiming } from '../src/domain/requests/types';
const now = new Date('2026-09-29T12:00:00+03:00');
const validDraft = (): RequestDraft => ({ ...emptyDraft(), category: 'Donanım', subject: 'Yeni bilgisayar talebi', description: 'Ekip çalışması için yeni bilgisayar gerekiyor.', targetTitle: 'VHKİ', dueDate: '2026-10-05' });
const setup = () => { const repository = new MemoryRequestRepository(createSeed(now)); return { repository, service: createRequestService(repository, { ...people[0], permissions: ['requests.assign'] }, () => now) }; };

test('Örnek kayıtların son tarih ve yaşam döngüsü tarihleri tutarlıdır', () => {
  for (const record of createSeed(now)) {
    assert.ok(record.dueDate >= record.createdAt.slice(0, 10));
    if (record.completedAt) assert.ok(record.completedAt >= record.createdAt && new Date(record.completedAt) <= now);
    if (record.closedAt) assert.ok(record.completedAt && record.closedAt >= record.completedAt && new Date(record.closedAt) <= now);
    if (record.type === 'Şikâyet') assert.ok(record.dynamic.incidentDate && record.dynamic.incidentDate <= record.createdAt.slice(0, 10));
    if (record.status === 'Yeni') assert.equal(record.assignee, '');
  }
});

test('Yeni talep aynı repository, liste ve dashboard içinde görünür; dış kopyalar veriyi değiştiremez', async () => {
  const { service, repository } = setup();
  const before = summarize(await service.list(), now);
  const record = await service.create({ ...validDraft(), assignee: 'p1', attachments: [{ name: 'örnek.pdf', size: 2000 }] });
  assert.equal(record.status, 'Atandı');
  assert.equal(record.requester, 'gm');
  const records = await service.list();
  const after = summarize(records, now);
  assert.equal(after.total, before.total + 1);
  assert.equal(after.open, before.open + 1);
  assert.equal(selectRequests(records, { search: record.number }, now)[0].id, record.id);
  assert.equal(records.find(r => r.id === record.id)?.attachments[0].name, 'örnek.pdf');
  record.subject = 'Değişmemeli';
  records[0].subject = 'Değişmemeli';
  assert.notEqual((await repository.list())[0].subject, 'Değişmemeli');
  assert.equal((await repository.list()).find(r => r.id === record.id)?.subject, 'Yeni bilgisayar talebi');
});

test('Tür tanımları zorunlu alan, geçmiş/gelecek tarih ve süre doğrulamasını yönetir', async () => {
  const { service } = setup();
  await assert.rejects(service.create(emptyDraft()), /alanları/);
  assert.ok(validateDraft({ ...validDraft(), dueDate: '2026-09-28' }, now).dueDate);
  const complaint = { ...validDraft(), type: 'Şikâyet', dynamic: { incidentDate: '2026-09-30', incident: 'İncelensin' } };
  assert.ok(validateDraft(complaint, now).incidentDate);
  complaint.dynamic.incidentDate = '2026-09-28';
  assert.deepEqual(validateDraft(complaint, now), {});
  const meeting = { ...validDraft(), type: 'Görüşme İsteği', dynamic: { reason: 'Planlama', preferredDate: '2026-09-28T15:00', duration: '0', meetingMode: 'Yüz yüze', participants: 'Personel' } };
  assert.ok(validateDraft(meeting, now).preferredDate);
  assert.ok(validateDraft(meeting, now).duration);
  meeting.dynamic.preferredDate = '2026-10-01T15:00'; meeting.dynamic.duration = '30';
  assert.deepEqual(validateDraft(meeting, now), {});
  const created = await service.create({ ...validDraft(), dynamic: { incident: 'Önceki türün alanı' } });
  assert.deepEqual(created.dynamic, {});
});

test('Arama Türkçe harfleri destekler, filtreler birlikte çalışır, sıralama ve sayfa dilimleri tutarlıdır', () => {
  const seed = createSeed(now);
  const target = seed[0];
  const filtered = selectRequests(seed, { search: 'ERİŞİM', targetTitle: target.targetTitle, type: target.type, category: target.category, status: target.status, priority: target.priority, requester: target.requester, assignee: target.assignee, from: target.createdAt.slice(0, 10), to: target.createdAt.slice(0, 10) }, now);
  assert.deepEqual(filtered.map(r => r.id), [target.id]);
  assert.equal(selectRequests(seed, { search: 'koordinasyon' }, now).length, seed.length);
  const byDate = selectRequests(seed, { sort: 'createdAt:asc' }, now);
  assert.ok(byDate.every((r, i) => i === 0 || r.createdAt >= byDate[i - 1].createdAt));
  const firstPage = byDate.slice(0, 10); const secondPage = byDate.slice(10, 20);
  assert.equal(firstPage.length, 10); assert.equal(secondPage.length, 10);
  assert.ok(firstPage.every(r => !secondPage.some(s => s.id === r.id)));
  for (const [quick, metric] of [['open', 'open'], ['overdue', 'overdue'], ['critical', 'critical'], ['completed', 'completed']] as const) {
    assert.equal(selectRequests(seed, { quick }, now).length, summarize(seed, now)[metric]);
  }
  assert.equal(selectRequests(seed, { search: 'bulunmayan-kayıt' }, now).length, 0);
});

test('Atama, yönlendirme, yorum ve yaşam döngüsü ortak veriyi ve zaman çizelgesini günceller; kapatma silmez', async () => {
  const { service } = setup();
  const created = await service.create(validDraft());
  const get = async () => { const record = (await service.list()).find(r => r.id === created.id); assert.ok(record); return record; };
  await service.update(created.id, 'assign', 'p1');
  assert.equal((await get()).status, 'Atandı');
  await service.update(created.id, 'title', 'Vaiz');
  assert.equal((await get()).assignee, '');
  assert.equal((await get()).targetTitle, 'Vaiz');
  await service.update(created.id, 'assign', 'p4');
  await service.update(created.id, 'priority', 'Kritik');
  await service.comment(created.id, 'İnceleme tamamlandı.');
  await assert.rejects(service.comment(created.id, '  '));
  await service.update(created.id, 'approval');
  assert.equal((await get()).status, 'Onay Bekliyor');
  assert.ok(summarize(await service.list(), now).approvals.some(r => r.id === created.id));
  await assert.rejects(service.update(created.id, 'revise', '', ''), /gerekçesi/);
  await service.update(created.id, 'revise', '', 'Maliyet bilgisi eklensin.');
  assert.equal((await get()).status, 'İşlemde');
  await assert.rejects(service.update(created.id, 'close'), /önce/);
  await service.update(created.id, 'complete');
  assert.equal((await get()).completedAt, now.toISOString());
  await service.update(created.id, 'close');
  const final = await get();
  assert.equal(final.status, 'Kapatıldı');
  assert.equal(final.priority, 'Kritik');
  assert.equal(final.comments.length, 1);
  assert.equal(final.timeline.length, 10);
  assert.equal((await service.list()).length, 49);
  assert.ok(final.timeline.some(e => e.text.includes('Maliyet bilgisi')));
  await service.update(created.id, 'status', 'İşlemde');
  assert.equal((await get()).completedAt, null);
  assert.equal((await get()).closedAt, null);
});

test('Gecikme iş akışı durumu değildir; tamamlanma tarihine göre geç sonuçlanma korunur', () => {
  const base: RequestTiming = { status: 'İşlemde', dueDate: '2026-09-27', completedAt: null };
  assert.equal(isOverdue(base, now), true);
  assert.equal(delayDays(base, now), 2);
  assert.equal(isOverdue({ ...base, dueDate: '2026-09-29' }, now), false);
  const completed: RequestTiming = { ...base, status: 'Tamamlandı', completedAt: '2026-09-28T13:00:00+03:00' };
  assert.equal(isOverdue(completed, now), false);
  assert.equal(delayDays(completed, now), 1);
  assert.equal(delayDays(completed, new Date('2026-10-20')), 1);
  assert.equal(delayDays({ ...base, status: 'İptal Edildi' }, now), 0);
});

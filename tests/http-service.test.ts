import test from 'node:test';
import assert from 'node:assert/strict';
import { createHttpRequestService, auth } from '../src/infrastructure/httpRequestService';

test('HTTP service maps Turkish labels to stable codes, strips stale dynamic fields, and uses server versions', async () => {
  const originalFetch = globalThis.fetch;
  const calls: { path: string; method: string; body?: Record<string, unknown> }[] = [];
  const wire = {
    id: 'record-id', number: 'TLP-2026-00001', type: 'Request', category: 'Software', subject: 'Konu', description: 'Açıklama',
    priority: 'Normal', privacy: 'Normal', status: 'New', tags: ['Takip'], targetTitle: 'Test Ünvan', targetTitleId: 'unit-id',
    requester: 'creator', relatedPerson: null, assignee: null, dueDate: '2026-12-01', createdAt: '2026-10-01T12:00:00Z',
    completedAt: null, closedAt: null, dynamic: {}, version: 7, comments: [], timeline: [], attachments: [], allowedActions: ['claim'], canComment: true, canUpload: true,
  };
  globalThis.fetch = async (url, init) => {
    const path = String(url); const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : undefined;
    calls.push({ path, method, body });
    const response = path.endsWith('/auth/csrf') ? { token: 'csrf' }
      : path.endsWith('/titles') ? [{ id: 'unit-id', name: 'Test Ünvan', isActive: true }]
      : path.endsWith('/departments') ? [{id: 'department-id', name: 'İl Müftülüğü', isActive: true}]
      : (path.endsWith('/title-groups') || path.endsWith('/personnel-groups')) ? [{id: 'group-id', name: 'İdari İşler', isActive: true}]
      : (path.endsWith('/users') || path.endsWith('/work-units') || path.endsWith('/duty-locations')) ? []
      : path.includes('/requests?') ? { items: [wire], totalCount: 300, page: 2, pageSize: 20 }
      : path.endsWith('/actions') ? undefined : wire;
    return response === undefined ? new Response(null, { status: 204 }) : Response.json(response);
  };
  try {
    await auth.directory();
    const service = createHttpRequestService();
    const page = await service.page({ targetTitle: 'Test Ünvan', status: 'Yeni', search: 'erişim', view: 'queue' }, 2, 20);
    assert.equal(page.totalCount, 300); assert.equal(page.items[0].status, 'Yeni');
    const query = new URL('http://local' + calls.find(c => c.path.includes('/requests?'))!.path).searchParams;
    assert.equal(query.get('targetTitleId'), 'unit-id'); assert.equal(query.get('status'), 'New'); assert.equal(query.get('page'), '2');
    await service.update('record-id', 'status', 'İşlemde');
    assert.deepEqual(calls.find(c => c.path.endsWith('/actions'))!.body, { action: 'status', value: 'InProgress', note: '', version: 7 });
    await service.create({ type: 'Talep', category: 'Yazılım', subject: 'Konu', description: 'Açıklama', priority: 'Normal', privacy: 'Normal',
      targetDepartmentId: 'department-id', targetPersonnelGroupId: 'group-id', targetTitle: '', assignee: '', relatedPerson: '', dueDate: '2026-12-01', tags: 'Takip', dynamic: { incident: 'Önceki tür' }, attachments: [] });
    const created = calls.find(c => c.method === 'POST' && c.path.endsWith('/requests'))!.body!;
    assert.equal(created.type, 'Request'); assert.equal(created.targetTitleId, null); assert.equal(created.targetDepartmentId, 'department-id'); assert.equal(created.targetPersonnelGroupId, 'group-id'); assert.deepEqual(created.dynamic, {});
  } finally { globalThis.fetch = originalFetch; }
});

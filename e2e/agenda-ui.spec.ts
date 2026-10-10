import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function setup(page: Page, operator = true) {
  const me = { id: 'operator', name: 'Test Personel', title: 'Memur', departmentId: 'district', role: 'Employee', roleCode: 'StandardUser', isOperator: operator, mustChangePassword: false, permissions: [] };
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  let events: Record<string, unknown>[] = [];
  await page.route('**/api/v1/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (request.method() !== 'GET') {
      const body = request.postDataJSON() as Record<string, unknown>; writes.push({ path, body });
      if (path === '/agenda') { events.push({ ...body, id: 'meeting', organizerId: me.id, participantCount: 2, userIds: ['operator', 'person'], canEdit: true, version: 1, isCancelled: false }); await route.fulfill({ status: 201, json: events[0] }); return; }
      if (path === '/agenda/meeting') events = [{ ...events[0], ...body, version: 2 }];
      if (path.endsWith('/cancel')) events = [{ ...events[0], isCancelled: true, canEdit: false, version: 3 }];
      await route.fulfill({ status: 204 }); return;
    }
    const result = path === '/auth/me' ? me : path === '/auth/csrf' ? { token: 'token' }
      : path === '/notifications' ? { unread: 0, items: [] }
      : path === '/metadata' ? {}
      : path === '/agenda/directory' ? { users: [{ id: 'person', name: 'Ayşe Personel' }, { id: 'operator', name: 'Test Personel' }], groups: [{ id: 'group', name: 'İdari Personel' }] }
      : path === '/agenda' ? events
      : path === '/agenda/meeting' ? events[0] : [];
    await route.fulfill({ json: result });
  });
  return writes;
}

test('operator creates a general institution meeting, edits it and cancels it', async ({ page }) => {
  const writes = await setup(page); await page.goto('/#/agenda');
  await page.getByRole('button', { name: 'Toplantı oluştur', exact: true }).click();
  await page.getByLabel('Başlık', { exact: true }).fill('Genel personel toplantısı');
  await page.getByLabel('Başlangıç (Türkiye saati)').fill('2026-10-10T10:00');
  await page.getByLabel('Bitiş (Türkiye saati)').fill('2026-10-10T11:00');
  await page.getByLabel('Müftülüğümdeki tüm aktif personel').check();
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(writes[0]).toMatchObject({ path: '/agenda', body: { allDepartment: true, isShared: true, startsAt: '2026-10-10T10:00:00+03:00', userIds: [], groupIds: [] } });
  await page.getByLabel('Tarih seç').fill('2026-10-10');
  await page.getByRole('button', { name: /Genel personel toplantısı/ }).click();
  await page.getByRole('button', { name: 'Düzenle', exact: true }).click();
  await page.getByLabel('Başlık', { exact: true }).fill('Güncel toplantı');
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /Güncel toplantı/ }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Programı iptal et', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('İptal edildi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hafta', exact: true }).click();
  await expect(page.locator('.agenda-day-card')).toHaveCount(7);
  await page.getByRole('button', { name: 'Ay', exact: true }).click();
  await expect(page.locator('.agenda-day-card')).toHaveCount(42);
  await page.screenshot({ path: 'artifacts/agenda-month.png', fullPage: true });
});

test('ordinary personnel can create a personal program without request permissions', async ({ page }) => {
  const writes = await setup(page, false); await page.goto('/#/agenda');
  await expect(page.getByRole('button', { name: 'Toplantı oluştur', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Kişisel program ekle', exact: true }).click();
  await page.getByLabel('Başlık', { exact: true }).fill('Kişisel hazırlık');
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(writes[0]).toMatchObject({ path: '/agenda', body: { isShared: false, allDepartment: false, userIds: [], groupIds: [] } });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.sidebar')).not.toBeInViewport();
  await expect(page.getByRole('button', { name: /Kişisel hazırlık/ })).toBeVisible();
  await page.screenshot({ path: 'artifacts/agenda-mobile.png', fullPage: true });
});

test('operator can combine individual and group selections', async ({ page }) => {
  const writes = await setup(page); await page.goto('/#/agenda');
  await page.getByRole('button', { name: 'Toplantı oluştur', exact: true }).click();
  await page.getByLabel('Başlık', { exact: true }).fill('Ekip toplantısı');
  await page.getByLabel('Ayşe Personel', { exact: true }).check();
  await page.getByLabel('İdari Personel', { exact: true }).check();
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(writes[0]).toMatchObject({ body: { userIds: ['person'], groupIds: ['group'], allDepartment: false } });
});

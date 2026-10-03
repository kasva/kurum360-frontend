import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function setup(page: Page, role = 'SystemAdmin') {
  const me = { id: 'admin', name: 'Sistem Yöneticisi', email: 'admin@example.org', departmentId: 'unit', department: 'Bilgi İşlem', role, isActive: true, canCreateRequests: false, mustChangePassword: false };
  const users = [{ ...me }, { ...me, id: 'worker', name: 'Ayşe Yılmaz', email: 'ayse@example.org', role: 'Employee' }];
  const departments = [{ id: 'unit', name: 'Bilgi İşlem', isActive: true }];
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  await page.route('**/api/v1/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') {
      const body = request.postDataJSON() as Record<string, unknown>;
      writes.push({ path, body });
      if (path.endsWith('/permissions')) { users[1].canCreateRequests = body.canCreateRequests as boolean; await route.fulfill({ status: 204 }); return; }
      if (path === '/api/v1/admin/users') {
        users.push({ ...me, ...body, id: 'created', role: String(body.role), name: String(body.name), email: String(body.email), mustChangePassword: true });
        await route.fulfill({ status: 201, json: users.at(-1) }); return;
      }
      if (path.endsWith('/reset-password')) { await route.fulfill({ status: 204 }); return; }
      if (path === '/api/v1/admin/departments') {
        departments.push({ id: 'new-unit', name: String(body.name), isActive: Boolean(body.isActive) });
        await route.fulfill({ status: 201, json: departments.at(-1) }); return;
      }
    }
    const result = path.endsWith('/auth/me') ? me : path.endsWith('/auth/csrf') ? { token: 'csrf-token' }
      : path.endsWith('/departments') ? departments : path.endsWith('/admin/users') ? users : path.endsWith('/users') ? users : {};
    await route.fulfill({ json: result });
  });
  await page.goto('/#/admin');
  return writes;
}

test('admin creates a request-enabled user and controls permissions without changing their role', async ({ page }) => {
  const writes = await setup(page);
  await expect(page.getByRole('heading', { name: 'Kullanıcı ve Birim Yönetimi' })).toBeVisible();
  await page.getByRole('button', { name: 'Yeni Kullanıcı', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Ad Soyad').fill('Mehmet Kaya');
  await dialog.getByLabel('E-posta').fill('mehmet@example.org');
  await dialog.getByLabel('Birim', { exact: true }).selectOption('unit');
  await dialog.getByLabel('Talep oluşturabilir', { exact: true }).check();
  await dialog.getByLabel('Geçici Parola', { exact: true }).fill('Temporary-Pass-123!');
  await dialog.getByRole('button', { name: 'Kullanıcı Oluştur', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('mehmet@example.org', { exact: true })).toBeVisible();
  expect(writes[0].body).toMatchObject({ role: 'Employee', canCreateRequests: true, isActive: true, departmentId: 'unit' });
  await page.getByRole('checkbox', { name: 'Ayşe Yılmaz talep oluşturabilir' }).check();
  await expect(page.getByRole('checkbox', { name: 'Ayşe Yılmaz talep oluşturabilir' })).toBeChecked();
  expect(writes.at(-1)).toEqual({ path: '/api/v1/admin/users/worker/permissions', body: { canCreateRequests: true } });
});

test('non-admin cannot access user management', async ({ page }) => {
  await setup(page, 'Employee');
  await expect(page.getByRole('heading', { name: 'Yönetim yetkiniz yok' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Kullanıcı ve Birim Yönetimi' })).toHaveCount(0);
});

test('API validation failures are visible and keep the new-user form open', async ({ page }) => {
  await setup(page);
  await page.route('**/api/v1/admin/users', async route => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 400, json: { title: 'Geçersiz kullanıcı', errors: { user: ['Bu e-posta zaten kullanılıyor.'] } } });
    else await route.fallback();
  });
  await page.getByRole('button', { name: 'Yeni Kullanıcı', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Ad Soyad').fill('Ayşe');
  await dialog.getByLabel('E-posta').fill('ayse@example.org');
  await dialog.getByLabel('Birim', { exact: true }).selectOption('unit');
  await dialog.getByLabel('Geçici Parola', { exact: true }).fill('Temporary-Pass-123!');
  await dialog.getByRole('button', { name: 'Kullanıcı Oluştur', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Bu e-posta zaten kullanılıyor.');
  await expect(dialog).toBeVisible();
});

test('administrator can issue a temporary password to the selected account', async ({ page }) => {
  const writes = await setup(page);
  const row = page.getByRole('row').filter({ hasText: 'ayse@example.org' });
  await row.getByRole('button', { name: 'Geçici Parola Ver' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Yeni Geçici Parola').fill('Reset-Password-456!');
  await dialog.getByRole('button', { name: 'Geçici Parolayı Kaydet' }).click();
  await expect(dialog).not.toBeVisible();
  expect(writes.at(-1)).toEqual({ path: '/api/v1/admin/users/worker/reset-password', body: { temporaryPassword: 'Reset-Password-456!' } });
});

test('administrator creates a department and cannot remove their own admin access', async ({ page }) => {
  const writes = await setup(page);
  await page.getByRole('button', { name: 'Birimler', exact: true }).click();
  await page.getByRole('button', { name: 'Yeni Birim', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Birim Adı').fill('İnsan Kaynakları');
  await dialog.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('cell', { name: 'İnsan Kaynakları', exact: true })).toBeVisible();
  expect(writes.at(-1)).toEqual({ path: '/api/v1/admin/departments', body: { name: 'İnsan Kaynakları', isActive: true } });
  await page.getByRole('button', { name: 'Kullanıcılar', exact: true }).click();
  await page.getByRole('row').filter({ hasText: 'admin@example.org' }).getByRole('button', { name: 'Düzenle', exact: true }).click();
  await expect(dialog.getByLabel('Rol', { exact: true })).toBeDisabled();
  await expect(dialog.getByLabel('Aktif kullanıcı')).toBeDisabled();
});

test('failed permission change restores the previous value and shows the error', async ({ page }) => {
  await setup(page);
  await page.route('**/api/v1/admin/users/worker/permissions', route => route.fulfill({ status: 403, json: { title: 'Bu işlem için yetkiniz yok.' } }));
  const permission = page.getByRole('checkbox', { name: 'Ayşe Yılmaz talep oluşturabilir' });
  await permission.click();
  await expect(page.getByRole('alert')).toHaveText('Bu işlem için yetkiniz yok.');
  await expect(permission).not.toBeChecked();
});

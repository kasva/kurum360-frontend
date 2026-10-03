import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

const password = 'E2e-Initial-Password-123!';
async function token(request: APIRequestContext) {
  const response = await request.get('/api/v1/auth/csrf');
  return (await response.json() as { token: string }).token;
}
async function post(request: APIRequestContext, path: string, data: unknown) {
  return request.post('/api/v1' + path, { data, headers: { 'X-CSRF-TOKEN': await token(request) } });
}
test('authorized creator → unit queue → claim → comment/file → complete → close', async ({ page, request }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  let login = await post(request, '/auth/login', { email: 'e2e-admin@example.org', password: 'E2e-Changed-Password-456!' });
  if (!login.ok()) login = await post(request, '/auth/login', { email: 'e2e-admin@example.org', password });
  expect(login.ok()).toBeTruthy();
  const admin = await login.json() as { mustChangePassword: boolean };
  // The test database is disposable; keep its initial password stable across repeated test runs.
  if (admin.mustChangePassword) {
    const changed = await post(request, '/auth/change-password', { currentPassword: password, newPassword: 'E2e-Changed-Password-456!' }); expect(changed.ok()).toBeTruthy();
  }
  const units = await (await request.get('/api/v1/departments')).json() as { id: string; name: string }[];
  const unit = units.find(d => d.name === 'Bilgi İşlem')!;
  const suffix = Date.now();
  const accounts = [
    { email: `creator-${suffix}@example.org`, name: 'Talep Oluşturan', role: 'Employee', canCreateRequests: true },
    { email: `worker-${suffix}@example.org`, name: 'Talep İşleyen', role: 'Employee', canCreateRequests: false },
    { email: `manager-${suffix}@example.org`, name: 'Birim Yöneticisi', role: 'DepartmentManager', canCreateRequests: false },
  ];
  for (const account of accounts) {
    const response = await post(request, '/admin/users', { ...account, departmentId: unit.id, isActive: true, temporaryPassword: password });
    expect(response.status(), await response.text()).toBe(201);
  }
  async function signIn(email: string) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('E-posta').fill(email); await page.getByLabel('Parola', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
    await page.getByLabel('Mevcut parola').fill(password); await page.getByLabel('Yeni parola').fill('E2e-Changed-Password-456!');
    await page.getByRole('button', { name: 'Parolayı değiştir' }).click();
    await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
  }
  async function signOut() {
    await page.getByRole('button', { name: 'Kullanıcı bilgisi' }).click();
    await page.getByRole('button', { name: 'Çıkış yap' }).click();
    await expect(page.getByLabel('E-posta')).toBeVisible();
  }
  await signIn(accounts[0].email);
  await page.getByRole('link', { name: 'Yeni Talep Oluştur' }).click();
  const subject = `E2E iş akışı ${suffix}`;
  await page.getByLabel('Kategori', { exact: true }).selectOption('Yazılım');
  await page.getByLabel('Konu', { exact: true }).fill(subject);
  await page.getByLabel('Açıklama', { exact: true }).fill('Uçtan uca iş akışı doğrulaması.');
  await page.getByLabel('İlgili Birim').selectOption('Bilgi İşlem');
  const due = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel('Son Tarih', { exact: true }).fill(due);
  await page.getByRole('button', { name: 'Devam Et' }).click(); await page.getByRole('button', { name: 'Devam Et' }).click(); await page.getByRole('button', { name: 'Devam Et' }).click();
  await page.getByRole('button', { name: 'Talebi Gönder' }).click();
  await page.waitForURL(/#\/requests\/[a-f0-9-]+\?created=1/);
  await expect(page.getByRole('heading', { name: subject })).toBeVisible();
  const detailUrl = page.url();
  await page.reload(); await expect(page.getByRole('heading', { name: subject })).toBeVisible();
  await signOut(); await signIn(accounts[1].email);
  await expect(page.getByRole('link', { name: 'Yeni Talep Oluştur' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Birim Kuyruğu' }).click();
  await page.getByLabel('Arama', { exact: true }).fill(subject); await page.getByRole('link', { name: subject, exact: true }).click();
  await page.getByRole('button', { name: 'Üzerime Al' }).click();
  await expect(page.getByText('Talep üzerinize alındı.')).toBeVisible();
  await page.getByLabel('Yorumunuz').fill('İş tamamlandı.'); await page.getByRole('button', { name: 'Yorum Ekle' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Yorum eklendi.' })).toBeVisible();
  await page.getByLabel('Dosya ekle').setInputFiles({ name: 'bilgi.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\ne2e') });
  await expect(page.getByRole('link', { name: 'bilgi.pdf' })).toBeVisible();
  await page.getByRole('button', { name: 'Talebi Tamamla' }).click(); await page.getByRole('button', { name: 'İşlemi Uygula' }).click();
  await expect(page.getByText('Tamamlandı', { exact: true })).toBeVisible();
  await signOut(); await signIn(accounts[2].email); await page.goto(detailUrl);
  await page.getByRole('button', { name: 'Talebi Kapat' }).click(); await page.getByRole('button', { name: 'İşlemi Uygula' }).click();
  await expect(page.getByText('Kapatıldı', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText('Kapatıldı', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/e2e-complete.png', fullPage: true });
});

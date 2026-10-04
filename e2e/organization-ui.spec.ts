import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function setup(page: Page, operator = false) {
  const departments = [{id: 'root', name: 'İl Müftülüğü', isActive: true, parentId: null}, {id: 'district', name: 'B İlçe Müftülüğü', parentId: 'root', isActive: true}];
  const groups = [{id: 'office', name: 'İdari İşler', isActive: true}];
  const titles = [{id: 'clerk', name: 'VHKİ', titleGroupId: 'office', isActive: true}, {id: 'chief', name: 'Şef', titleGroupId: 'office', isActive: true}];
  const me = { id: 'admin', name: 'Test Yönetici', email: 'admin@example.org', firstName: 'Test', lastName: 'Yönetici',
    title: 'VHKİ', titleId: 'clerk', titleGroupId: 'office', departmentId: 'root', role: 'SystemAdmin', roleCode: 'SystemAdmin',
    roleName: 'Admin', userType: 'Admin', isOperator: operator, isActive: true, canCreateRequests: true, mustChangePassword: false,
    permissions: ['users.view', 'users.manage', 'requests.view.own', 'requests.view.title', 'requests.view.all', 'requests.process', 'requests.claim', 'requests.create',
      ...['types', 'categories', 'titles', 'titleGroups', 'departments'].flatMap(k => ['definitions.' + k + '.view', 'definitions.' + k + '.manage'])] };
  const people = [me, { ...me, id: 'chief-person', name: 'Test Şef', title: 'Şef', titleId: 'chief', isOperator: false }];
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  let record = {id: 'work', number: 'TLP-2026-00001', type: 'Request', category: 'Hardware', subject: 'Gelen iş', description: 'İncelenecek iş', priority: 'Normal', privacy: 'Normal', status: 'New',
    tags: [], targetTitle: '', targetTitleId: null, targetTitleGroupId: 'office', targetDepartmentId: 'root', sourceDepartmentId: 'district', routingPending: true,
    requester: 'sender', relatedPerson: null, assignee: null as string | null, dueDate: '2099-12-01', createdAt: '2026-10-04T12:00:00Z', completedAt: null, closedAt: null,
    dynamic: {}, version: 1, comments: [], timeline: [], attachments: [], allowedActions: ['assign', 'group', 'department'], canComment: false, canUpload: false};
  await page.route('**/api/v1/**', async route => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname.replace('/api/v1', '');
    if (request.method() !== 'GET') {
      const body = request.postDataJSON() as Record<string, unknown>; writes.push({path, body});
      if (path === '/requests') { record = {...record, ...body, subject: String(body.subject), description: String(body.description), routingPending: body.targetDepartmentId !== 'root', allowedActions: []}; await route.fulfill({status:201,json:record}); return; }
      if (path.endsWith('/actions')) { record = {...record, routingPending: false, version: record.version + 1, allowedActions: ['claim']}; await route.fulfill({status:204}); return; }
      if (path.endsWith('/claim')) { record = {...record, assignee: 'admin', version: record.version + 1, allowedActions: []}; await route.fulfill({json:record}); return; }
      if (path === '/definitions/titleGroups') { groups.push({id: 'new-group', name: String(body.name), isActive: Boolean(body.isActive)}); await route.fulfill({json:groups.at(-1)}); return; }
      if (path === '/definitions/titles') { titles.push({id:'new-title',name:String(body.name),titleGroupId:String(body.titleGroupId),isActive:true}); await route.fulfill({status:201,json:titles.at(-1)}); return; }
      if (path === '/admin/users') { people.push({...me,...body,id:'new-person',name:String(body.name)}); await route.fulfill({status:201,json:people.at(-1)}); return; }
    }
    const items = url.searchParams.get('view') === 'queue' ? (record.routingPending || record.assignee ? [] : [record]) : [record];
    const result = path === '/auth/me' ? me : path === '/auth/csrf' ? {token:'csrf'}
      : ['/departments','/definitions/departments'].includes(path) ? departments
      : ['/title-groups','/definitions/titleGroups'].includes(path) ? groups
      : ['/titles','/admin/titles','/definitions/titles'].includes(path) ? titles
      : ['/users','/admin/users'].includes(path) ? people
      : path === '/metadata' ? {typeDefinitions:[{code:'Request',name:'Talep',description:'Standart talep',baseType:'Request',isActive:true}],categoryDefinitions:[{code:'Hardware',name:'Donanım',isActive:true}]}
      : path === '/requests' ? {items,totalCount:items.length,page:1,pageSize:10}
      : path === '/dashboard/summary' ? {total:items.length,open:items.length,overdue:0,completed:0,critical:0,approvalCount:0,urgentCount:0,approvals:[],urgent:[],recent:items,titles:[],distribution:[],trend:[]}
      : path === '/requests/work' ? record : [];
    await route.fulfill({json:result});
  });
  return writes;
}

test('local request selects a group and can assign a different title in that group', async ({page}) => {
  const writes = await setup(page); await page.goto('/#/new');
  await page.getByLabel('Kategori', {exact:true}).selectOption('Donanım');
  await page.getByLabel('Konu', {exact:true}).fill('Ortak grup işi');
  await page.getByLabel('Açıklama', {exact:true}).fill('Şefe gönderilecek iş');
  await page.getByLabel('Ünvan Grubu', {exact:true}).selectOption('office');
  await page.getByLabel('Sorumlu', {exact:true}).selectOption('chief-person');
  await page.getByLabel('Son Tarih', {exact:true}).fill('2099-12-01');
  for (let i=0;i<3;i++) await page.getByRole('button',{name:'Devam Et'}).click();
  await page.getByRole('button',{name:'Talebi Gönder',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Ortak grup işi',exact:true})).toBeVisible();
  expect(writes.find(w=>w.path==='/requests')?.body).toMatchObject({targetDepartmentId:'root',targetTitleGroupId:'office',targetTitleId:null,assigneeId:'chief-person'});
});

test('external request hides responsible person and can be sent without a group', async ({page}) => {
  const writes = await setup(page); await page.goto('/#/new');
  await page.getByLabel('Kategori', {exact:true}).selectOption('Donanım');
  await page.getByLabel('Konu', {exact:true}).fill('İlçeye gönderilen iş');
  await page.getByLabel('Açıklama', {exact:true}).fill('Operatör yönlendirecek');
  await page.getByLabel('Hedef Birim', {exact:true}).selectOption('district');
  await expect(page.getByLabel('Sorumlu', {exact:true})).toHaveCount(0);
  await page.getByLabel('Son Tarih', {exact:true}).fill('2099-12-01');
  for (let i=0;i<3;i++) await page.getByRole('button',{name:'Devam Et'}).click();
  await page.getByRole('button',{name:'Talebi Gönder',exact:true}).click();
  await expect(page.getByRole('heading',{name:'İlçeye gönderilen iş',exact:true})).toBeVisible();
  expect(writes.find(w=>w.path==='/requests')?.body).toMatchObject({targetDepartmentId:'district',assigneeId:null});
});

test('title group definitions are available and a title requires its group', async ({page}) => {
  const writes = await setup(page); await page.goto('/#/definitions/titleGroups');
  await page.getByRole('button',{name:'Yeni Ünvan Grubu',exact:true}).click();
  await page.getByLabel('Ünvan Grubu Adı',{exact:true}).fill('Eğitim');
  await page.getByRole('button',{name:'Kaydet',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link',{name:'Ünvanlar',exact:true}).first().click();
  await page.getByRole('button',{name:'Yeni Ünvan',exact:true}).click();
  await page.getByLabel('Ünvan Adı',{exact:true}).fill('Öğretici');
  await page.getByLabel('Ünvan Grubu',{exact:true}).selectOption('new-group');
  await page.getByRole('button',{name:'Kaydet',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(writes.find(w=>w.path==='/definitions/titles')?.body).toMatchObject({name:'Öğretici',titleGroupId:'new-group'});
});

test('user form requires department and derives group from selected title', async ({page}) => {
  const writes = await setup(page); await page.goto('/#/admin');
  await page.getByRole('button',{name:'Yeni Kullanıcı',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Ad',{exact:true}).fill('Ayşe'); await dialog.getByLabel('Soyad',{exact:true}).fill('Yılmaz');
  await dialog.getByLabel('Birim',{exact:true}).selectOption('district');
  await dialog.getByLabel('Ünvan',{exact:true}).selectOption('chief');
  await expect(dialog.getByText('Ünvan grubu: İdari İşler',{exact:true})).toBeVisible();
  await dialog.getByLabel('Birim operatörü',{exact:true}).check();
  await dialog.getByLabel('E-posta',{exact:true}).fill('ayse@example.org');
  await dialog.getByLabel('Geçici Parola',{exact:true}).fill('123456');
  await dialog.getByRole('button',{name:'Kullanıcı Oluştur',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  expect(writes.find(w=>w.path==='/admin/users')?.body).toMatchObject({departmentId:'district',titleId:'chief',isOperator:true});
});

test('operator routes incoming work to group before it appears in claim pool', async ({page}) => {
  const writes = await setup(page,true); await page.goto('/#/requests?view=routing');
  await expect(page.getByRole('heading',{name:'Atama Bekleyenler',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Gelen iş',exact:true}).click();
  await page.getByRole('button',{name:'Ünvan Grubuna Yönlendir',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Ünvan Grubu',{exact:true}).selectOption('office');
  await page.getByRole('button',{name:'İşlemi Uygula',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link',{name:'İş Havuzum',exact:true}).click();
  await page.getByRole('link',{name:'Gelen iş',exact:true}).click();
  await page.getByRole('button',{name:'Üzerime Al',exact:true}).click();
  await expect(page.getByText('Talep üzerinize alındı.',{exact:true})).toBeVisible();
  expect(writes.find(w=>w.path.endsWith('/actions'))?.body).toMatchObject({action:'group',value:'office',version:1});
  expect(writes.find(w=>w.path.endsWith('/claim'))?.body).toMatchObject({version:2});
});

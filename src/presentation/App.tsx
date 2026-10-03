import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import RequestList from './pages/RequestList';
import RequestDetail from './pages/RequestDetail';
import NewRequest from './pages/NewRequest';
import Admin from './pages/Admin';
import { hasPermission } from '../domain/identity/organization';
import Definitions from './pages/Definitions';
import type { DefinitionKind } from '../infrastructure/definitionService';
import { Empty, Icon, Modal } from './components/ui';
import type { RequestRecord } from '../domain/requests/types';
import type { User } from '../domain/identity/organization';
import type { DashboardData, LiveRequestService } from '../infrastructure/httpRequestService';
import { errorMessage } from './errors';

function Detail({ id, service, created, userId }: { id: string; service: LiveRequestService; created: boolean; userId: string }) {
  const [record, setRecord] = useState<RequestRecord>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function refresh() {
    try { setRecord(await service.get(id)); }
    catch (e) { setError(errorMessage(e)); throw e; }
  }
  useEffect(() => { let active = true; service.get(id).then(r => { if (active) setRecord(r); }).catch(e => { if (active) setError(errorMessage(e)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id, service]);
  if (loading) return <div className="loading">Talep yükleniyor…</div>;
  if (error) return <div className="error-banner" role="alert">{error}<button onClick={() => { setError(''); setLoading(true); service.get(id).then(setRecord).catch(e => setError(errorMessage(e))).finally(() => setLoading(false)); }}>Yeniden dene</button></div>;
  return <RequestDetail record={record} service={service} refresh={refresh} created={created && record?.requester === userId}/>;
}
function Home({ service, user }: { service: LiveRequestService; user: User }) {
  const [data, setData] = useState<DashboardData>();
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => { const controller = new AbortController(); service.dashboard(undefined, controller.signal).then(setData).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); }); return () => controller.abort(); }, [service, reload]);
  if (error) return <div className="error-banner" role="alert">{error}<button onClick={() => { setError(''); setReload(r => r + 1); }}>Yeniden dene</button></div>;
  if (!data) return <div className="loading">Dashboard yükleniyor…</div>;
  return <Dashboard records={data.recent} user={user} serverData={data}/>;
}
export default function App({ service, user, logout, refreshSession }: { service: LiveRequestService; user: User; logout: () => Promise<void>; refreshSession: () => Promise<void> }) {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');
  const has = (permission: string) => hasPermission(user, permission);
  const definitionKinds = (['types', 'categories', 'departments'] as const).filter(kind => has('definitions.' + kind + '.view'));
  const canViewRequests = ['requests.view.own', 'requests.view.department', 'requests.view.all'].some(has);
  const [search, setSearch] = useState('');
  const [popup, setPopup] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  useEffect(() => { const changed = () => { setRoute(window.location.hash.slice(1) || '/'); setMobileMenu(false); window.scrollTo(0, 0); }; window.addEventListener('hashchange', changed); return () => window.removeEventListener('hashchange', changed); }, []);
  const navigate = (path: string) => { window.location.hash = path; };
  const [path, query = ''] = route.split('?');
  const view = new URLSearchParams(query).get('view');
  const navItems: [string, string, boolean][] = [['/requests', 'Tüm Talepler', !view], ['/requests?view=assigned', 'Bana Atananlar', view === 'assigned'], ['/requests?view=created', 'Oluşturduklarım', view === 'created']];
  if (has('requests.claim')) navItems.push(['/requests?view=queue', 'Birim Kuyruğu', view === 'queue']);
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  let page;
  if (path === '/') page = canViewRequests ? <Home service={service} user={user}/> : <Empty title="Kurum360'a hoş geldiniz" description="Yetkili olduğunuz ekranları sol menüden açabilirsiniz."/>;
  else if (path === '/requests') page = canViewRequests ? <RequestList key={route} service={service} user={user} query={query}/> : <Empty title="Talep görüntüleme izniniz yok"/>;
  else if (path === '/new') page = user.canCreateRequests ? <NewRequest service={service} user={user} refresh={async () => {}} navigate={navigate}/> : <Empty title="Talep oluşturma yetkiniz yok" description="Bu yetkiyi sistem yöneticiniz düzenleyebilir."/>;
  else if (path === '/admin') page = has('users.view') ? <Admin currentUser={user} refreshSession={refreshSession}/> : <Empty title="Kullanıcı görüntüleme izniniz yok"/>;
  else if (path === '/roles') page = has('users.view') ? <Admin currentUser={user} refreshSession={refreshSession}/> : <Empty title="Kullanıcı yönetimi yetkiniz yok"/>;
  else if (['/definitions/types', '/definitions/categories', '/definitions/departments'].includes(path)) page = has('definitions.' + path.split('/')[2] + '.view') ? <Definitions key={path} kind={path.split('/')[2] as DefinitionKind} user={user} refreshSession={refreshSession}/> : <Empty title="Tanım görüntüleme izniniz yok"/>;
  else if (path.startsWith('/requests/')) page = canViewRequests ? <Detail key={path} id={path.slice(10)} service={service} created={new URLSearchParams(query).has('created')} userId={user.id}/> : <Empty title="Talep görüntüleme izniniz yok"/>;
  else page = <Empty title="Sayfa bulunamadı"><a className="button primary" href="#/">Dashboard'a dön</a></Empty>;
  return <><a className="skip-link" href="#main-content">İçeriğe geç</a><aside className={`sidebar ${mobileMenu ? 'is-open' : ''}`}>
    <a href="#/" className="brand"><span className="brand-mark"><Icon name="building" size={34}/></span><span><strong>Kurum<span>360</span></strong><small>Talep ve İş Takip Sistemi</small></span></a>
    <div className="workspace-label">YÖNETİM PANELİ</div><nav aria-label="Ana gezinme"><a className={`nav-link ${path === '/' ? 'active' : ''}`} href="#/"><Icon name="home"/>Dashboard</a>
    {canViewRequests && <><div className="nav-group"><Icon name="file"/><span>Talepler</span></div><div className="nav-children">{navItems.map(([url, label, active]) => <a key={url} href={`#${url}`} className={path === '/requests' && active ? 'active' : ''}><span className="nav-dot"/>{label}</a>)}</div></>}
    {has('users.view') && <><div className="nav-group"><Icon name="users"/><span>Kullanıcı Yönetimi</span></div><div className="nav-children"><a href="#/admin" className={path === '/admin' || path === '/roles' ? 'active' : ''}><span className="nav-dot"/>Kullanıcılar</a></div></>}
    {definitionKinds.length > 0 && <><div className="nav-group"><Icon name="building"/><span>Sistem Tanımları</span></div><div className="nav-children">{definitionKinds.map(kind => <a key={kind} href={`#/definitions/${kind}`} className={path === `/definitions/${kind}` ? 'active' : ''}><span className="nav-dot"/>{({ types: 'Talep Türleri', categories: 'Kategoriler', departments: 'Birimler' })[kind]}</a>)}</div></>}</nav>
    <div className="sidebar-bottom">{user.canCreateRequests && <div className="sidebar-create"><strong>Yeni bir talep iletin.</strong><a className="button primary" href="#/new"><Icon name="plus" size={17}/>Yeni Talep Oluştur</a></div>}<div className="sidebar-footer"><span className="online-dot"/>Kurum360 <span>v1.0</span></div></div>
    </aside>{mobileMenu && <button className="sidebar-overlay" aria-label="Menüyü kapat" onClick={() => setMobileMenu(false)}/>}
    <div className="app-shell"><header className="topbar"><button className="icon-button menu-toggle" aria-label="Menüyü aç" aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)}><Icon name="menu"/></button>
    <form className="global-search" onSubmit={e => { e.preventDefault(); navigate(`/requests?search=${encodeURIComponent(search)}`); }}><Icon name="search" size={19}/><input aria-label="Tüm taleplerde ara" placeholder="Talep no, konu veya açıklama…" value={search} onChange={e => setSearch(e.target.value)}/><button type="submit" aria-label="Ara"><Icon name="arrow" size={16}/></button></form>
    <div className="topbar-actions"><button className="icon-button" aria-label="Bildirim bilgisi" onClick={() => setPopup('notifications')}><Icon name="bell"/></button><button className="user-menu" onClick={() => setPopup('user')} aria-label="Kullanıcı bilgisi"><span className="avatar">{initials}</span><span><strong>{user.name}</strong><small>{user.role}</small></span></button></div></header>
    <main id="main-content" tabIndex={-1}>{page}<footer className="app-footer"><span>Kurum360 · Talep ve İş Takip Sistemi</span></footer></main></div>
    {popup && <Modal title={popup === 'user' ? 'Kullanıcı Bilgisi' : 'Bildirimler'} onClose={() => setPopup('')}>{popup === 'user' ? <><h3>{user.name}</h3><p>{user.role} · {user.department}</p><p>Talep oluşturma: {user.canCreateRequests ? 'Yetkili' : 'Yetkisiz'}</p><button onClick={() => void logout()}>Çıkış yap</button></> : <p>Bildirim gönderimi bu sürümde bulunmuyor. Onay bekleyen talepleri dashboard üzerinden takip edebilirsiniz.</p>}</Modal>}
  </>;
}


import { useCallback, useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import RequestList from './pages/RequestList.jsx';
import RequestDetail from './pages/RequestDetail.jsx';
import NewRequest from './pages/NewRequest.jsx';
import { Empty, Icon, Modal } from './components/ui.jsx';
export default function App({ service, user }) {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [popup, setPopup] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const refresh = useCallback(async () => { const result = await service.list(); setRecords(result); }, [service]);
  const load = useCallback(async () => { setLoading(true); setError(''); try { await refresh(); } catch (e) { setError(e.message || 'Talepler yüklenemedi.'); } finally { setLoading(false); } }, [refresh]);
  useEffect(() => {
    let active = true;
    service.list().then(result => { if (active) { setRecords(result); setLoading(false); } }).catch(e => { if (active) { setError(e.message || 'Talepler yüklenemedi.'); setLoading(false); } });
    return () => { active = false; };
  }, [service]);
  useEffect(() => { const changed = () => { setRoute(window.location.hash.slice(1) || '/'); setMobileMenu(false); window.scrollTo(0, 0); }; window.addEventListener('hashchange', changed); return () => window.removeEventListener('hashchange', changed); }, []);
  const navigate = path => { window.location.hash = path; };
  const [path, query = ''] = route.split('?');
  const view = new URLSearchParams(query).get('view');
  const navItems = [['/requests', 'Tüm Talepler', !view], ['/requests?view=assigned', 'Bana Atananlar', view === 'assigned'], ['/requests?view=created', 'Oluşturduklarım', view === 'created']];
  let page;
  if (path === '/') page = <Dashboard records={records} user={user}/>;
  else if (path === '/requests') page = <RequestList key={route} records={records} user={user} query={query}/>;
  else if (path === '/new') page = <NewRequest service={service} user={user} refresh={refresh} navigate={navigate}/>;
  else if (path.startsWith('/requests/')) page = <RequestDetail key={path} record={records.find(r => r.id === path.slice(10))} service={service} refresh={refresh} created={new URLSearchParams(query).has('created')}/>;
  else page = <Empty title="Sayfa bulunamadı" description="Ana sayfaya dönerek devam edebilirsiniz."><a className="button primary" href="#/">Dashboard'a dön</a></Empty>;
  return <><a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}>İçeriğe geç</a><aside className={`sidebar ${mobileMenu ? 'is-open' : ''}`}><a href="#/" className="brand"><span className="brand-mark"><Icon name="building" size={34}/></span><span><strong>Kurum<span>360</span></strong><small>Talep ve İş Takip Sistemi</small></span></a><div className="workspace-label">YÖNETİM PANELİ</div><nav aria-label="Ana gezinme"><a className={`nav-link ${path === '/' ? 'active' : ''}`} href="#/"><Icon name="home"/>Dashboard</a><div className="nav-group"><Icon name="file"/><span>Talepler</span><Icon name="down" size={15}/></div><div className="nav-children">{navItems.map(([url, label, active]) => <a key={url} href={`#${url}`} className={path === '/requests' && active ? 'active' : ''}><span className="nav-dot"/>{label}</a>)}</div></nav><div className="sidebar-bottom"><div className="sidebar-create"><span className="illustration"><Icon name="file" size={31}/><span>+</span></span><strong>Her talep, bir adım ileri.</strong><p>İhtiyaçları birlikte çözüme<br/>ulaştıralım.</p><a className="button primary" href="#/new"><Icon name="plus" size={17}/>Yeni Talep Oluştur</a></div><div className="sidebar-footer"><span className="online-dot"/>Frontend Prototipi <span>v1.0</span></div></div></aside>{mobileMenu && <button className="sidebar-overlay" aria-label="Menüyü kapat" onClick={() => setMobileMenu(false)}/>}
    <div className="app-shell"><header className="topbar"><button className="icon-button menu-toggle" aria-label="Menüyü aç" aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)}><Icon name="menu"/></button><form className="global-search" onSubmit={e => { e.preventDefault(); navigate(`/requests?search=${encodeURIComponent(search)}`); }}><Icon name="search" size={19}/><input aria-label="Tüm taleplerde ara" placeholder="Talep ara… (talep no, konu veya açıklama)" value={search} onChange={e => setSearch(e.target.value)}/><button type="submit" aria-label="Ara"><Icon name="arrow" size={16}/></button></form><div className="topbar-actions"><span className="demo-pill"><span/>DEMO</span><button className="icon-button notification-button" aria-label="Bildirim bilgisi" onClick={() => setPopup('notifications')}><Icon name="bell" size={21}/></button><span className="topbar-divider"/><button className="user-menu" onClick={() => setPopup('user')} aria-label="Kullanıcı bilgisi"><span className="avatar">DÖ</span><span><strong>{user.name}</strong><small>{user.role}</small></span><Icon name="down" size={14}/></button></div></header>
    <div className="demo-banner"><Icon name="info" size={14}/><span>Örnek veri ortamı · Değişiklikler bu oturumda saklanır, sayfa yenilendiğinde sıfırlanır.</span><span className="demo-banner-end">Gerçek hesap veya backend bağlantısı yok</span></div><main id="main-content" tabIndex={-1}>{loading ? <div className="loading" role="status"><span className="spinner"/>Talepler yükleniyor…</div> : error ? <div className="error-banner" role="alert">{error}<button onClick={load}>Yeniden Dene</button></div> : page}<footer className="app-footer"><span>Kurum360 · Genel Müdürlük Talep ve İş Takip Sistemi</span><span>Örnek verilerle çalışan frontend prototipi</span></footer></main></div>
    {popup && <Modal title={popup === 'user' ? 'Demo Kullanıcı' : 'Bildirim Alanı'} onClose={() => setPopup('')}>{popup === 'user' ? <><div className="profile-summary"><span className="avatar">DÖ</span><div><h3>{user.name}</h3><p>{user.role} · Genel Müdürlük</p></div></div><div className="notice">Bu kurgusal demo kullanıcısı kurum genelindeki örnek kayıtları görür. Rol ve gizlilik etiketleri gerçek güvenlik sağlamaz. Kimlik doğrulama ve erişim denetimi backend aşamasında uygulanacaktır.</div><p className="section-description">Profil yönetimi bu aşamanın kapsamında değildir.</p></> : <div className="empty"><Icon name="bell" size={32}/><h3>Bildirim gönderimi bağlı değil</h3><p>Bu alan yerleşim örneğidir. Onay bekleyen talepleri dashboard üzerinden takip edebilirsiniz.</p><a className="button" href={`#/requests?status=${encodeURIComponent('Onay Bekliyor')}`} onClick={() => setPopup('')}>Onay bekleyenleri gör</a></div>}</Modal>}
  </>;
}

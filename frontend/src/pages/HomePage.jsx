import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { packApi, newsApi, communityApi, missionApi } from '../utils/api';
import PackOpener from '../components/Pack/PackOpener';

/* ─── Desktop sidebar menu (menu yang sudah ada, cuma beda tampilan) ──── */
const DESKTOP_NAV = [
  { path: '/home',       label: 'Home',      icon: '🏠' },
  { path: '/collection', label: 'Koleksi',   icon: '🃏' },
  { path: '/battle',     label: 'Battle',    icon: '⚔️' },
  { path: '/community',  label: 'Komunitas', icon: '👥' },
  { path: '/shop',       label: 'Shop',      icon: '🛒' },
];

/* ─── Particle background ─────────────────────────────────────── */
function Particles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 6}s`,
    duration: `${5 + Math.random() * 6}s`,
    size: Math.random() > 0.6 ? 6 : 3,
    color: ['#f0c869','#f59e0b','#60a5fa','#fff'][Math.floor(Math.random()*4)],
  }));
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position:'absolute', left:p.left, bottom:'-10px',
          width:p.size, height:p.size, borderRadius:'50%',
          background:p.color, opacity:0.5,
          animation:`floatUp ${p.duration} ${p.delay} infinite ease-in`,
        }} />
      ))}
    </div>
  );
}

/* ─── Hourglass timer display ─────────────────────────────────── */
function PackTimer({ slots }) {
  const pct = (slots / 2) * 100;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ position:'relative', width:28, height:28 }}>
        <svg viewBox="0 0 36 36" style={{ transform:'rotate(-90deg)', width:28, height:28 }}>
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <circle cx="18" cy="18" r="15" fill="none"
            stroke={slots > 0 ? '#a9762f' : '#ef4444'}
            strokeWidth="4" strokeDasharray="94.2"
            strokeDashoffset={94.2 - (pct / 100) * 94.2}
            strokeLinecap="round" style={{ transition:'stroke-dashoffset 0.5s' }} />
        </svg>
        <span style={{
          position:'absolute', inset:0, display:'flex',
          alignItems:'center', justifyContent:'center',
          fontSize:9, fontWeight:800, color: slots > 0 ? '#f0c869' : '#ef4444',
        }}>{slots}</span>
      </div>
      <div>
        <div style={{ fontSize:12, fontWeight:700, color:'white' }}>{slots}/2 Slot Pack</div>
        <div style={{ fontSize:10, color:'#a89a7c' }}>
          {slots === 0 ? 'Reset besok pukul 00:00 UTC' : 'Tersedia hari ini'}
        </div>
      </div>
    </div>
  );
}

/* ─── Featured Pack Card ──────────────────────────────────────── */
function FeaturedPackCard({ pack, onClick }) {
  const [hover, setHover] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef();

  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setTilt({ x: (clientY - cy) / 10, y: -(clientX - cx) / 10 });
  };

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setTilt({ x:0, y:0 }); }}
      onMouseMove={onMove}
      style={{
        minWidth: 140, borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        border: '1px solid rgba(240,200,105,0.35)',
        boxShadow: hover
          ? '0 12px 40px rgba(169,118,47,0.5), 0 0 0 1px rgba(240,200,105,0.5)'
          : '0 4px 16px rgba(0,0,0,0.4)',
        transform: hover
          ? `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.05)`
          : 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)',
        transition: hover ? 'box-shadow 0.2s' : 'all 0.4s ease',
        background: 'rgba(43,29,16,0.9)',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Pack art */}
      <div style={{
        height: 140,
        background: pack.image_url
          ? `url(${pack.image_url}) center/cover`
          : 'linear-gradient(145deg, #4a3218 0%, #2b1d10 60%, #150e07 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 52, position: 'relative', overflow: 'hidden',
      }}>
        {!pack.image_url && '🎴'}
        {/* Holographic sheen */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(240,200,105,0.08) 60%, transparent 100%)',
          pointerEvents: 'none',
        }} />
      </div>

      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'white', marginBottom: 4, lineHeight: 1.2 }}>
          {pack.name}
        </div>
        {pack.is_featured && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 9, background: 'rgba(245,158,11,0.15)',
            color: '#f59e0b', padding: '2px 7px', borderRadius: 20,
            border: '1px solid rgba(245,158,11,0.3)', fontWeight: 700, letterSpacing: '0.05em',
          }}>
            ★ FEATURED
          </div>
        )}
      </div>

      {/* Tap to open hint */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '6px 0', textAlign: 'center',
        background: 'linear-gradient(0deg, rgba(169,118,47,0.8) 0%, transparent 100%)',
        fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: 600,
        opacity: hover ? 1 : 0, transition: 'opacity 0.2s',
      }}>
        TAP UNTUK BUKA
      </div>
    </div>
  );
}

/* ─── Tab definitions ─────────────────────────────────────────── */
const TABS = [
  { id: 'home',    emoji: '🏠', label: 'Home' },
  { id: 'news',    emoji: '📢', label: 'News' },
  { id: 'gift',    emoji: '🎁', label: 'Gift' },
  { id: 'mission', emoji: '📜', label: 'Mission' },
];

/* ─── Main Component ──────────────────────────────────────────── */
export default function HomePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [packs, setPacks]       = useState([]);
  const [packSlots, setPackSlots] = useState(0);
  const [news, setNews]         = useState([]);
  const [gifts, setGifts]       = useState([]);
  const [missions, setMissions] = useState([]);
  const [friends, setFriends]   = useState([]);
  const [selectedPack, setSelectedPack] = useState(null);
  const [tab, setTab]           = useState('home');
  const [toast, setToast]       = useState('');

  useEffect(() => {
    packApi.getAll().then(r => { setPacks(r.data.packs); setPackSlots(r.data.packSlots); });
    newsApi.getAll().then(r => setNews(r.data.news));
    communityApi.getGifts().then(r => setGifts(r.data.gifts));
    missionApi.getAll().then(r => setMissions(r.data.missions));
    communityApi.getFriends().then(r => setFriends(r.data.friends)).catch(() => {});
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleClaimMission = async (id) => {
    try {
      const { data } = await missionApi.claim(id);
      showToast(data.message);
      missionApi.getAll().then(r => setMissions(r.data.missions));
      refreshUser();
    } catch (err) { showToast(err.response?.data?.error || 'Gagal klaim reward.'); }
  };

  const handleClaimGift = async (id) => {
    try {
      const { data } = await communityApi.claimGift(id);
      showToast(data.message);
      communityApi.getGifts().then(r => setGifts(r.data.gifts));
    } catch (err) { showToast(err.response?.data?.error || 'Gagal klaim hadiah.'); }
  };

  const featuredPacks = packs.filter(p => p.is_featured).slice(0, 3);
  const pendingGifts  = gifts.filter(g => g.status === 'pending').length;

  // Header ~66px + tab bar ~42px = 108px fixed from top
  const HEADER_H = 66;
  const TABBAR_H = 42;
  const TOP_OFFSET = HEADER_H + TABBAR_H;

  return (
    <div className="page home-shell" style={{ background: 'linear-gradient(180deg, #241a0d 0%, #1c130a 100%)', overflow:'hidden' }}>
      <Particles />

      {/* Toast */}
      {toast && (
        <div className="toast-home" style={{
          position:'fixed', top: TOP_OFFSET + 8, left:'50%', transform:'translateX(-50%)',
          background:'rgba(43,29,16,0.97)', border:'1px solid rgba(240,200,105,0.5)',
          borderRadius:12, padding:'10px 22px', fontSize:13, fontWeight:600,
          color:'white', zIndex:9999, whiteSpace:'nowrap',
          boxShadow:'0 4px 24px rgba(169,118,47,0.4)',
          animation:'slideDown 0.3s ease',
        }}>{toast}</div>
      )}

      {/* ── Header (fixed, mobile only) ───────────────────────── */}
      <div className="mobile-header" style={{
        position:'fixed', top:0, left:0, right:0, height:HEADER_H,
        padding:'12px 16px 8px',
        background:'rgba(28,19,10,0.92)',
        borderBottom:'1px solid rgba(169,118,47,0.15)',
        zIndex:50, backdropFilter:'blur(16px)',
        display:'flex', alignItems:'center',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}
               onClick={() => navigate('/profile')}>
            <div style={{
              width:42, height:42, borderRadius:'50%',
              background: user?.avatar_url
                ? `url(${user.avatar_url}) center/cover`
                : 'linear-gradient(135deg, #a9762f, #f59e0b)',
              border:'2px solid #a9762f',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
              boxShadow:'0 0 10px rgba(169,118,47,0.5)', flexShrink:0,
            }}>{!user?.avatar_url && '⚔️'}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:'white', lineHeight:1.2 }}>{user?.username}</div>
              <div style={{ fontSize:10, color:'#f59e0b', fontWeight:600 }}>{user?.title || 'Trainer'}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <CurrencyChip icon="💰" value={(user?.gold||0).toLocaleString()} color="#f59e0b" />
            <CurrencyChip icon="💎" value={user?.gems||0} color="#60a5fa" />
          </div>
        </div>
      </div>

      {/* ── Tab bar (fixed, mobile only) ──────────────────────── */}
      <div className="mobile-tabbar" style={{
        position:'fixed', top:HEADER_H, left:0, right:0, height:TABBAR_H,
        display:'flex', background:'rgba(28,19,10,0.88)',
        borderBottom:'1px solid rgba(169,118,47,0.15)',
        zIndex:40, backdropFilter:'blur(16px)',
      }}>
        {TABS.map(t => {
          const badge = t.id === 'gift' ? pendingGifts : t.id === 'news' ? news.length : 0;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, padding:'0 4px', border:'none',
              background:'transparent',
              color: active ? '#f0c869' : '#8a7a5c',
              fontSize:10, fontWeight:700, letterSpacing:'0.03em',
              borderBottom:`2px solid ${active ? '#a9762f' : 'transparent'}`,
              cursor:'pointer', transition:'all 0.2s',
              display:'flex', alignItems:'center', justifyContent:'center', gap:4, position:'relative',
            }}>
              <span style={{ fontSize:14 }}>{t.emoji}</span>
              <span>{t.label}</span>
              {badge > 0 && (
                <span style={{
                  position:'absolute', top:4, right:'50%', marginRight:'-24px',
                  minWidth:16, height:16, borderRadius:8,
                  background:'#ef4444', color:'white',
                  fontSize:9, fontWeight:800,
                  display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px',
                }}>{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Scrollable content area ───────────────────────────── */}
      <div className="content-area" style={{
        position:'absolute', top:TOP_OFFSET, left:0, right:0, bottom:0,
        overflowY:'auto', overflowX:'hidden',
      }}>

      {/* ═══════════════════════════════════════════════════════════
          HOME TAB
      ═══════════════════════════════════════════════════════════ */}
      {tab === 'home' && (
        <>
        <div className="home-mobile-view" style={{ position:'relative', zIndex:1 }}>

          {/* Hero banner */}
          <div style={{
            margin:'0 0 0',
            padding:'24px 20px 20px',
            background:'linear-gradient(160deg, #1e0840 0%, #241a0d 50%, #1c130a 100%)',
            borderBottom:'1px solid rgba(169,118,47,0.15)',
            position:'relative', overflow:'hidden',
          }}>
            {/* Background glow orbs */}
            <div style={{
              position:'absolute', top:-40, right:-40, width:160, height:160,
              borderRadius:'50%', background:'radial-gradient(circle, rgba(169,118,47,0.25) 0%, transparent 70%)',
              pointerEvents:'none',
            }} />
            <div style={{
              position:'absolute', bottom:-20, left:-20, width:100, height:100,
              borderRadius:'50%', background:'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
              pointerEvents:'none',
            }} />

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:11, color:'#a89a7c', fontWeight:600, marginBottom:4, letterSpacing:'0.1em', textTransform:'uppercase' }}>
                  Pack Terbaru
                </div>
                <div className="font-title" style={{ fontSize:18, fontWeight:900, color:'white', lineHeight:1.1 }}>
                  Gavelin<br />
                  <span style={{ color:'#f0c869' }}>Card Chronicles</span>
                </div>
              </div>
              <PackTimer slots={packSlots} />
            </div>

            {/* Featured packs horizontal scroll */}
            {featuredPacks.length > 0 ? (
              <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
                {featuredPacks.map(pack => (
                  <FeaturedPackCard key={pack.id} pack={pack} onClick={() => setSelectedPack(pack)} />
                ))}
                <div
                  onClick={() => navigate('/packs')}
                  style={{
                    minWidth:80, borderRadius:16, cursor:'pointer',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    gap:6, color:'#f0c869', fontSize:11, fontWeight:700, flexShrink:0,
                    border:'1.5px dashed rgba(169,118,47,0.4)',
                    background:'rgba(169,118,47,0.08)',
                  }}
                >
                  <span style={{ fontSize:24 }}>🎴</span>
                  <span>Semua</span>
                </div>
              </div>
            ) : (
              <div style={{
                padding:'32px 0', textAlign:'center', color:'#8a7a5c',
                border:'1px dashed rgba(169,118,47,0.2)', borderRadius:16,
              }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🎴</div>
                <div style={{ fontSize:13 }}>Belum ada pack tersedia</div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ padding:'20px 16px 8px' }}>
            <SectionLabel>⚡ Aksi Cepat</SectionLabel>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
              {[
                { icon:'⚔️', label:'Battle',    path:'/battle',     color:'#ef4444', glow:'rgba(239,68,68,0.3)' },
                { icon:'🃏', label:'Koleksi',   path:'/collection', color:'#3b82f6', glow:'rgba(59,130,246,0.3)' },
                { icon:'👥', label:'Komunitas', path:'/community',  color:'#22c55e', glow:'rgba(34,197,94,0.3)' },
              ].map(q => (
                <QuickActionCard key={q.path} {...q} onClick={() => navigate(q.path)} />
              ))}
            </div>
          </div>

          {/* Daily streak / bonus strip */}
          <div style={{ padding:'0 16px 20px' }}>
            <div style={{
              background:'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(169,118,47,0.12) 100%)',
              border:'1px solid rgba(245,158,11,0.25)',
              borderRadius:16, padding:'14px 16px',
              display:'flex', alignItems:'center', gap:14,
            }}>
              <div style={{ fontSize:36 }}>🎁</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:800, color:'white', marginBottom:2 }}>Hadiah Harian</div>
                <div style={{ fontSize:11, color:'#a89a7c' }}>Klaim gift dari temanmu setiap hari</div>
              </div>
              <button
                onClick={() => setTab('gift')}
                style={{
                  background:'linear-gradient(135deg, #f59e0b, #d97706)',
                  color:'#2b1d10', fontWeight:800, fontSize:11,
                  padding:'8px 14px', borderRadius:20, border:'none',
                  cursor:'pointer', whiteSpace:'nowrap',
                  boxShadow:'0 2px 12px rgba(245,158,11,0.35)',
                }}
              >
                {pendingGifts > 0 ? `${pendingGifts} Gift!` : 'Lihat'}
              </button>
            </div>
          </div>

          {/* Mission preview */}
          <div style={{ padding:'0 16px 24px' }}>
            <SectionLabel>📜 Misi Hari Ini</SectionLabel>
            {missions.filter(m => m.mission_type === 'daily').slice(0,2).map(m => (
              <MiniMission key={m.id} m={m} onClaim={handleClaimMission} />
            ))}
            <button
              onClick={() => setTab('mission')}
              style={{
                width:'100%', marginTop:8, padding:'10px',
                background:'rgba(169,118,47,0.08)',
                border:'1px solid rgba(169,118,47,0.2)',
                borderRadius:12, color:'#a89a7c', fontSize:11, fontWeight:600,
                cursor:'pointer',
              }}
            >
              Lihat semua misi →
            </button>
          </div>
        </div>
        {/* end .home-mobile-view */}

        {/* ═══════════════════════════════════════════════════════
            DESKTOP HUB (layout lebar: sidebar + hero + panel kanan)
            Menu & judul sama seperti versi mobile, cuma disusun ala gambar referensi.
        ═══════════════════════════════════════════════════════ */}
        <div className="home-desktop-view" style={{ position:'relative', zIndex:1, padding:'20px 32px 40px' }}>

          {/* ── Header ala gambar referensi: nav tabs kiri, judul tengah, ikon kanan ── */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'14px 4px 22px', marginBottom:22,
            borderBottom:'1px solid rgba(191,158,102,0.25)', position:'relative',
          }}>
            {/* Nav tabs (menu yang sudah ada: Home/News/Gift/Mission) */}
            <div style={{ display:'flex', gap:30, flex:1 }}>
              {TABS.map(t => {
                const active = tab === t.id;
                const badge = t.id === 'gift' ? pendingGifts : t.id === 'news' ? news.length : 0;
                return (
                  <div
                    key={t.id}
                    className="font-title"
                    onClick={() => setTab(t.id)}
                    style={{
                      cursor:'pointer', fontSize:14, fontWeight:700, letterSpacing:'0.03em',
                      color: active ? '#f5c451' : '#a89a7c',
                      borderBottom:`2px solid ${active ? '#f5c451' : 'transparent'}`,
                      paddingBottom:8, position:'relative', transition:'color 0.2s',
                    }}
                  >
                    {t.label}
                    {badge > 0 && (
                      <span style={{
                        position:'absolute', top:-6, right:-14, minWidth:15, height:15, borderRadius:8,
                        background:'#ef4444', color:'white', fontSize:9, fontWeight:800,
                        display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px',
                      }}>{badge}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Judul game, gaya banner lengkung ala gambar */}
            <div style={{
              position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
              textAlign:'center', pointerEvents:'none', whiteSpace:'nowrap',
            }}>
              <div className="font-title" style={{
                fontSize:22, fontWeight:900, letterSpacing:'0.08em', textTransform:'uppercase',
                background:'linear-gradient(180deg, #fde68a 0%, #f5c451 45%, #b8842c 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                textShadow:'0 2px 10px rgba(0,0,0,0.5)', lineHeight:1.1,
              }}>
                🎲 Gavelin
              </div>
              <div className="font-title" style={{ fontSize:11, fontWeight:700, letterSpacing:'0.28em', color:'#e8dcc3', textTransform:'uppercase', marginTop:2 }}>
                Card Chronicles
              </div>
            </div>

            {/* Ikon kanan: notifikasi / hadiah / pengaturan */}
            <div style={{ display:'flex', gap:10, flex:1, justifyContent:'flex-end' }}>
              <HeaderIconButton icon="🔔" badge={news.length} onClick={() => setTab('news')} />
              <HeaderIconButton icon="✉️" badge={pendingGifts} onClick={() => setTab('gift')} />
              <HeaderIconButton icon="⚙️" onClick={() => navigate('/profile')} />
            </div>
          </div>

          <div style={{ display:'flex', gap:24, alignItems:'flex-start' }}>

            {/* Sidebar menu (menu yang sudah ada: Home/Koleksi/Battle/Komunitas/Shop) */}
            <div style={{ width:196, flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>
              {/* Profil singkat + currency (dipindah dari header mobile) */}
              <div
                onClick={() => navigate('/profile')}
                style={{
                  display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                  background:'rgba(43,29,16,0.65)', border:'1px solid rgba(169,118,47,0.15)',
                  borderRadius:14, cursor:'pointer',
                }}
              >
                <div style={{
                  width:38, height:38, borderRadius:'50%', flexShrink:0,
                  background: user?.avatar_url ? `url(${user.avatar_url}) center/cover` : 'linear-gradient(135deg, #a9762f, #f59e0b)',
                  border:'2px solid #a9762f', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15,
                }}>{!user?.avatar_url && '⚔️'}</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'white', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {user?.username}
                  </div>
                  <div style={{ fontSize:10, color:'#f59e0b', fontWeight:600 }}>{user?.title || 'Trainer'}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <CurrencyChip icon="💰" value={(user?.gold||0).toLocaleString()} color="#f59e0b" />
                <CurrencyChip icon="💎" value={user?.gems||0} color="#60a5fa" />
              </div>

              {DESKTOP_NAV.map(item => {
                const active = item.path === '/home';
                return (
                  <div
                    key={item.path}
                    onClick={() => !active && navigate(item.path)}
                    style={{
                      display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                      borderRadius:14, cursor: active ? 'default' : 'pointer',
                      background: active
                        ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(169,118,47,0.2))'
                        : 'rgba(43,29,16,0.65)',
                      border: `1px solid ${active ? 'rgba(245,158,11,0.45)' : 'rgba(169,118,47,0.15)'}`,
                      color: active ? '#f59e0b' : '#e8dcc3',
                      fontWeight:700, fontSize:14, transition:'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize:20 }}>{item.icon}</span>
                    <span className="font-title">{item.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Center: hero banner + Play Now + footer strip */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{
                position:'relative', borderRadius:24, overflow:'hidden', minHeight:420,
                background:'radial-gradient(ellipse at 50% 25%, rgba(169,118,47,0.3) 0%, transparent 60%), linear-gradient(180deg, #1c0f38 0%, #241a0d 55%, #1c130a 100%)',
                border:'1px solid rgba(169,118,47,0.2)',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                padding:'40px 24px 32px', textAlign:'center',
              }}>
                {/* faux "rak buku" texture ala perpustakaan */}
                <div style={{
                  position:'absolute', inset:0, opacity:0.05, pointerEvents:'none',
                  backgroundImage:'repeating-linear-gradient(90deg, #f5e6c8 0 2px, transparent 2px 42px)',
                }} />
                <div style={{
                  position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)',
                  width:320, height:320, borderRadius:'50%',
                  background:'radial-gradient(circle, rgba(240,200,105,0.35) 0%, transparent 70%)',
                  pointerEvents:'none',
                }} />

                {/* Hero art placeholder */}
                <div style={{
                  width:180, height:180, borderRadius:'50%', position:'relative', marginBottom:20,
                  background:'linear-gradient(160deg, #a9762f 0%, #4a3218 60%, #2b1d10 100%)',
                  border:'4px solid rgba(245,158,11,0.5)',
                  boxShadow:'0 0 40px rgba(169,118,47,0.5), 0 0 80px rgba(245,158,11,0.15)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:84,
                }}>
                  🧙‍♀️
                </div>

                <div style={{ fontSize:11, letterSpacing:'0.15em', color:'#a89a7c', fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>
                  Selamat Datang Kembali
                </div>
                <div style={{ fontSize:24, fontWeight:900, color:'white', marginBottom:22 }}>
                  {user?.username || 'Trainer'}
                </div>

                <button className="font-title" onClick={() => navigate('/battle')} style={{
                  background:'linear-gradient(135deg, #f59e0b, #d97706)', color:'#2b1d10',
                  fontWeight:900, fontSize:16, letterSpacing:'0.05em', padding:'16px 52px',
                  borderRadius:30, border:'2px solid rgba(255,255,255,0.25)', cursor:'pointer',
                  boxShadow:'0 8px 30px rgba(245,158,11,0.45)', textTransform:'uppercase',
                }}>
                  ⚔️ Play Now
                </button>
              </div>

              {/* Footer strip: Patch Notes + Buka Pack */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:20 }}>
                <DesktopFooterCard
                  icon="📋"
                  title="Patch Notes"
                  text={news[0] ? news[0].title : 'Belum ada catatan patch terbaru.'}
                  onClick={() => setTab('news')}
                />
                <DesktopFooterCard
                  icon="🎴"
                  title={(featuredPacks[0] || packs[0])?.name || 'Buka Pack'}
                  text={
                    (featuredPacks[0] || packs[0])?.description
                      || (packSlots > 0 ? `${packSlots} slot pack tersedia hari ini — buka sekarang!` : 'Buka pack untuk dapatkan kartu baru.')
                  }
                  onClick={() => navigate('/packs')}
                  accent
                />
              </div>
            </div>

            {/* Panel kanan: Online Friends + Daily Quests */}
            <div style={{ width:264, flexShrink:0, display:'flex', flexDirection:'column', gap:16 }}>
              <div className="glass" style={{ padding:16 }}>
                <SectionLabel>👥 Online Friends</SectionLabel>
                {friends.filter(f => f.status === 'accepted').length === 0 ? (
                  <div style={{ fontSize:11, color:'#8a7a5c', textAlign:'center', padding:'14px 0' }}>
                    Belum ada teman.
                  </div>
                ) : friends.filter(f => f.status === 'accepted').slice(0, 5).map(f => (
                  <div key={f.friendship_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0' }}>
                    <div style={{ position:'relative', width:32, height:32, flexShrink:0 }}>
                      <div style={{
                        width:32, height:32, borderRadius:'50%',
                        background: f.avatar_url ? `url(${f.avatar_url}) center/cover` : 'linear-gradient(135deg,#a9762f,#f59e0b)',
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
                      }}>{!f.avatar_url && '⚔️'}</div>
                      <span style={{
                        position:'absolute', bottom:0, right:0, width:9, height:9, borderRadius:'50%',
                        background:'#22c55e', border:'2px solid #2b1d10',
                      }} />
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'white', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {f.username}
                      </div>
                      <div style={{ fontSize:10, color:'#a89a7c' }}>{f.title || 'Player'}</div>
                    </div>
                  </div>
                ))}
                <button onClick={() => navigate('/community')} style={{
                  width:'100%', marginTop:8, padding:'8px',
                  background:'rgba(169,118,47,0.08)', border:'1px solid rgba(169,118,47,0.2)',
                  borderRadius:10, color:'#a89a7c', fontSize:11, fontWeight:600, cursor:'pointer',
                }}>
                  Lihat Komunitas →
                </button>
              </div>

              <div className="glass" style={{ padding:16 }}>
                <SectionLabel>📜 Daily Quests</SectionLabel>
                {missions.filter(m => m.mission_type === 'daily').length === 0 ? (
                  <div style={{ fontSize:11, color:'#8a7a5c', textAlign:'center', padding:'14px 0' }}>
                    Belum ada misi hari ini.
                  </div>
                ) : missions.filter(m => m.mission_type === 'daily').slice(0, 3).map(m => (
                  <MiniMission key={m.id} m={m} onClaim={handleClaimMission} />
                ))}
                <button
                  onClick={() => setTab('mission')}
                  style={{
                    width:'100%', marginTop:4, padding:'8px',
                    background:'rgba(169,118,47,0.08)', border:'1px solid rgba(169,118,47,0.2)',
                    borderRadius:10, color:'#a89a7c', fontSize:11, fontWeight:600, cursor:'pointer',
                  }}
                >
                  Lihat semua misi →
                </button>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          NEWS TAB
      ═══════════════════════════════════════════════════════════ */}
      {tab === 'news' && (
        <div className="content-panel" style={{ padding:'16px 16px 80px', position:'relative', zIndex:1 }}>
          {news.length === 0 && <EmptyState icon="📢" text="Belum ada berita." />}
          {news.map(n => (
            <div key={n.id} style={{
              background:'rgba(43,29,16,0.8)', borderRadius:16, overflow:'hidden',
              marginBottom:14, border:'1px solid rgba(169,118,47,0.15)',
              boxShadow:'0 4px 20px rgba(0,0,0,0.3)',
            }}>
              {n.image_url && (
                <div style={{
                  height:140, background:`url(${n.image_url}) center/cover`, position:'relative',
                }}>
                  <div style={{
                    position:'absolute', inset:0,
                    background:'linear-gradient(0deg, rgba(43,29,16,0.8) 0%, transparent 60%)',
                  }} />
                </div>
              )}
              <div style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                  <span style={{
                    fontSize:9, background:'rgba(169,118,47,0.2)', color:'#f0c869',
                    padding:'3px 8px', borderRadius:20, textTransform:'uppercase',
                    fontWeight:700, letterSpacing:'0.07em', border:'1px solid rgba(169,118,47,0.25)',
                  }}>{n.news_type}</span>
                  {n.is_pinned && <span style={{ fontSize:10, color:'#f59e0b' }}>📌 Pinned</span>}
                </div>
                <div style={{ fontSize:15, fontWeight:800, color:'white', marginBottom:6, lineHeight:1.3 }}>{n.title}</div>
                <div style={{ fontSize:12, color:'#a89a7c', lineHeight:1.6 }}>{n.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          GIFT TAB
      ═══════════════════════════════════════════════════════════ */}
      {tab === 'gift' && (
        <div className="content-panel" style={{ padding:'16px 16px 80px', position:'relative', zIndex:1 }}>
          <div style={{
            background:'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(169,118,47,0.1) 100%)',
            border:'1px solid rgba(245,158,11,0.2)', borderRadius:14,
            padding:'10px 14px', marginBottom:16,
            fontSize:12, color:'#a89a7c', lineHeight:1.5,
          }}>
            🎁 Hadiah kartu dari teman — klaim sebelum kadaluarsa!
          </div>

          {gifts.length === 0 && <EmptyState icon="🎁" text="Belum ada hadiah dari teman." />}
          {gifts.map(g => (
            <div key={g.id} style={{
              background:'rgba(43,29,16,0.8)', borderRadius:16, padding:'14px 16px',
              marginBottom:10, border:'1px solid rgba(169,118,47,0.15)',
              display:'flex', gap:14, alignItems:'center',
              boxShadow:'0 4px 16px rgba(0,0,0,0.3)',
            }}>
              <div style={{
                width:52, height:52, borderRadius:12, flexShrink:0,
                background:'linear-gradient(135deg, #4a3218, #2b1d10)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:26,
                border:'1px solid rgba(169,118,47,0.25)',
              }}>🎴</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color:'white', marginBottom:2 }}>{g.card_name}</div>
                <div style={{ fontSize:11, color:'#a89a7c', marginBottom:4 }}>dari {g.sender_name}</div>
                <span className={`rarity-badge rarity-${g.rarity}`}>{g.rarity}</span>
              </div>
              {g.status === 'pending' ? (
                <button
                  onClick={() => handleClaimGift(g.id)}
                  style={{
                    background:'linear-gradient(135deg, #f59e0b, #d97706)',
                    color:'#2b1d10', fontWeight:800, fontSize:11,
                    padding:'9px 16px', borderRadius:20, border:'none',
                    cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
                    boxShadow:'0 2px 12px rgba(245,158,11,0.35)',
                  }}
                >Klaim</button>
              ) : (
                <span style={{ fontSize:20, flexShrink:0 }}>✅</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MISSION TAB
      ═══════════════════════════════════════════════════════════ */}
      {tab === 'mission' && (
        <div className="content-panel" style={{ padding:'16px 16px 80px', position:'relative', zIndex:1 }}>
          {['daily','weekly'].map(type => {
            const list = missions.filter(m => m.mission_type === type);
            if (!list.length) return null;
            return (
              <div key={type} style={{ marginBottom:28 }}>
                <SectionLabel>{type === 'daily' ? '📅 Daily Mission' : '📆 Weekly Mission'}</SectionLabel>
                {list.map(m => (
                  <div key={m.id} style={{
                    background:'rgba(43,29,16,0.8)', borderRadius:16,
                    padding:'14px 16px', marginBottom:10,
                    border:`1px solid ${m.claimed ? 'rgba(34,197,94,0.15)' : 'rgba(169,118,47,0.15)'}`,
                    opacity: m.claimed ? 0.6 : 1,
                    boxShadow:'0 4px 16px rgba(0,0,0,0.3)',
                    transition:'opacity 0.3s',
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:'white', marginBottom:3 }}>{m.name}</div>
                        <div style={{ fontSize:11, color:'#a89a7c', lineHeight:1.4 }}>{m.description}</div>
                      </div>
                      {m.is_completed && !m.claimed && (
                        <button
                          onClick={() => handleClaimMission(m.id)}
                          style={{
                            background:'linear-gradient(135deg, #f59e0b, #d97706)',
                            color:'#2b1d10', fontWeight:800, fontSize:11,
                            padding:'7px 14px', borderRadius:20, border:'none',
                            cursor:'pointer', marginLeft:10, flexShrink:0,
                            boxShadow:'0 2px 12px rgba(245,158,11,0.35)',
                          }}
                        >Klaim!</button>
                      )}
                      {m.claimed && <span style={{ fontSize:18, marginLeft:8 }}>✅</span>}
                    </div>

                    <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:6, height:8, overflow:'hidden', marginBottom:6 }}>
                      <div style={{
                        width:`${Math.min(100,(m.progress/m.target_count)*100)}%`,
                        height:'100%', borderRadius:6,
                        background: m.is_completed
                          ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                          : 'linear-gradient(90deg, #a9762f, #a855f7)',
                        transition:'width 0.6s ease', position:'relative', overflow:'hidden',
                      }}>
                        <div style={{
                          position:'absolute', inset:0,
                          background:'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                          backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite',
                        }} />
                      </div>
                    </div>

                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:10, color:'#a89a7c' }}>{m.progress}/{m.target_count}</span>
                      <div style={{ display:'flex', gap:8, fontSize:11 }}>
                        {m.reward_gold > 0 && <span style={{ color:'#f59e0b', fontWeight:700 }}>💰{m.reward_gold}</span>}
                        {m.reward_gems > 0 && <span style={{ color:'#60a5fa', fontWeight:700 }}>💎{m.reward_gems}</span>}
                        {m.reward_dust > 0 && <span style={{ color:'#f0c869', fontWeight:700 }}>✨{m.reward_dust}</span>}
                        {m.reward_xp > 0  && <span style={{ color:'#22c55e', fontWeight:700 }}>⭐{m.reward_xp}XP</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      </div>{/* end scrollable content area */}

      {/* Pack Opener modal */}
      {selectedPack && (
        <PackOpener
          pack={selectedPack}
          onClose={() => {
            setSelectedPack(null);
            packApi.getAll().then(r => setPackSlots(r.data.packSlots));
            refreshUser();
          }}
          onCardsObtained={(data) => setPackSlots(data.remainingSlots)}
        />
      )}

      {/* keyframes injected inline */}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1); opacity: 0.5; }
          50%  { opacity: 0.7; }
          100% { transform: translateY(-110vh) scale(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────── */
function CurrencyChip({ icon, value, color }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:4,
      background:'rgba(0,0,0,0.35)', padding:'5px 10px', borderRadius:20,
      fontSize:12, border:'1px solid rgba(255,255,255,0.05)',
    }}>
      <span>{icon}</span>
      <span style={{ color, fontWeight:800 }}>{value}</span>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="font-title" style={{
      fontSize:13, fontWeight:800, color:'#f0c869',
      marginBottom:12, display:'flex', alignItems:'center', gap:6,
    }}>{children}</div>
  );
}

function QuickActionCard({ icon, label, color, glow, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding:'18px 8px 14px', textAlign:'center', cursor:'pointer',
        borderRadius:16, border:`1px solid ${hover ? color : 'rgba(169,118,47,0.15)'}`,
        background: hover ? `rgba(${hexToRgb(color)},0.12)` : 'rgba(43,29,16,0.6)',
        boxShadow: hover ? `0 4px 20px ${glow}` : 'none',
        transition:'all 0.2s',
      }}
    >
      <div style={{ fontSize:30, marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:11, color: hover ? color : '#a89a7c', fontWeight:700, transition:'color 0.2s' }}>{label}</div>
    </div>
  );
}

function MiniMission({ m, onClaim }) {
  const pct = Math.min(100, (m.progress / m.target_count) * 100);
  return (
    <div style={{
      background:'rgba(43,29,16,0.7)', borderRadius:14, padding:'12px 14px',
      marginBottom:8, border:'1px solid rgba(169,118,47,0.12)',
      display:'flex', gap:12, alignItems:'center',
    }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'white', marginBottom:5 }}>{m.name}</div>
        <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:4, height:5, overflow:'hidden' }}>
          <div style={{
            width:`${pct}%`, height:'100%', borderRadius:4,
            background: m.is_completed ? '#22c55e' : '#a9762f',
          }} />
        </div>
        <div style={{ fontSize:10, color:'#a89a7c', marginTop:3 }}>{m.progress}/{m.target_count}</div>
      </div>
      {m.is_completed && !m.claimed && (
        <button onClick={() => onClaim(m.id)} style={{
          background:'linear-gradient(135deg, #f59e0b, #d97706)',
          color:'#2b1d10', fontWeight:800, fontSize:10,
          padding:'6px 12px', borderRadius:16, border:'none', cursor:'pointer', flexShrink:0,
        }}>Klaim</button>
      )}
      {m.claimed && <span style={{ fontSize:16 }}>✅</span>}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign:'center', color:'#8a7a5c', padding:'48px 0' }}>
      <div style={{ fontSize:44, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:13 }}>{text}</div>
    </div>
  );
}

function hexToRgb(hex) {
  const m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!m) return '169,118,47';
  return `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}`;
}

/* ─── Desktop hub: kartu Patch Notes / Event di bagian bawah hero ──── */
function DesktopFooterCard({ icon, title, text, onClick, accent }) {
  return (
    <div
      onClick={onClick}
      style={{
        cursor:'pointer', borderRadius:16, padding:'16px 18px',
        background: accent
          ? 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(169,118,47,0.15))'
          : 'rgba(43,29,16,0.7)',
        border: `1px solid ${accent ? 'rgba(96,165,250,0.3)' : 'rgba(169,118,47,0.15)'}`,
        display:'flex', gap:12, alignItems:'flex-start',
        transition:'transform 0.2s',
      }}
    >
      <div style={{ fontSize:26, flexShrink:0 }}>{icon}</div>
      <div style={{ minWidth:0 }}>
        <div className="font-title" style={{ fontSize:13, fontWeight:800, color:'white', marginBottom:3 }}>{title}</div>
        <div style={{
          fontSize:11, color:'#a89a7c', lineHeight:1.4,
          overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
        }}>{text}</div>
      </div>
    </div>
  );
}

/* ─── Desktop header: tombol ikon (notifikasi/hadiah/pengaturan) ──── */
function HeaderIconButton({ icon, badge, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position:'relative', width:38, height:38, borderRadius:'50%', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
        background: hover ? 'rgba(169,118,47,0.25)' : 'rgba(43,29,16,0.7)',
        border:'1px solid rgba(169,118,47,0.25)', transition:'background 0.2s',
      }}
    >
      {icon}
      {badge > 0 && (
        <span style={{
          position:'absolute', top:-4, right:-4, minWidth:16, height:16, borderRadius:8,
          background:'#ef4444', color:'white', fontSize:9, fontWeight:800,
          display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px',
          border:'2px solid #1c130a',
        }}>{badge}</span>
      )}
    </div>
  );
}

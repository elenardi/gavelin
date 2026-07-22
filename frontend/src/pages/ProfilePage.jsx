import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi, battleApi } from '../utils/api';

const MAX_SLOTS  = 2;
const REGEN_MS   = 12 * 60 * 60 * 1000;

function usePackSlotTimer(user) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const slots   = user?.pack_slots ?? 0;
  const anchor  = user?.last_slot_reset ? new Date(user.last_slot_reset).getTime() : null;
  const isFull  = slots >= MAX_SLOTS;

  // Waktu berlalu sejak anchor
  const elapsed    = anchor ? now - anchor : 0;
  // Progress menuju slot berikutnya (0–100)
  const progress   = anchor ? Math.min((elapsed % REGEN_MS) / REGEN_MS * 100, 100) : 0;
  // Sisa detik menuju slot berikutnya
  const remaining  = anchor ? Math.max(0, REGEN_MS - (elapsed % REGEN_MS)) : 0;

  const fmt = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  return { slots, isFull, progress, remaining, fmt };
}

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const [stats, setStats]   = useState(null);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [toast, setToast]   = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    // Get stats from leaderboard
    battleApi.getLeaderboard().then(r => {
      const mine = r.data.leaderboard.find(p => p.id === user?.id);
      if (mine) setStats(mine);
    }).catch(() => {});
  }, [user?.id]);

  const handleSave = async () => {
    try {
      await authApi.updateProfile({ username });
      await refreshUser();
      showToast('Profil diperbarui!');
      setEditing(false);
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal update profil.');
    }
  };

  const xpForNextLevel = (user?.level || 1) * 1000;
  const xpProgress = ((user?.xp || 0) % 1000) / 10;

  return (
    <div className="page">
      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{
        padding: '24px 20px 20px',
        background: 'linear-gradient(180deg, rgba(169,118,47,0.3) 0%, transparent 100%)',
        textAlign: 'center',
        borderBottom: '1px solid rgba(169,118,47,0.2)',
      }}>
        {/* Avatar */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px',
          background: user?.avatar_url ? `url(${user.avatar_url}) center/cover` : 'linear-gradient(135deg, #a9762f, #f59e0b)',
          border: '3px solid #a9762f',
          boxShadow: '0 0 20px rgba(169,118,47,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
        }}>
          {!user?.avatar_url && '⚔️'}
        </div>

        {editing ? (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.4)',
                border: '1px solid #a9762f', color: 'white', fontSize: 14, textAlign: 'center' }}
            />
            <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={handleSave}>💾</button>
            <button onClick={() => setEditing(false)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent', color: '#a89a7c', cursor: 'pointer', fontSize: 13 }}>✗</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 4 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>{user?.username}</h2>
            <button onClick={() => setEditing(true)}
              style={{ background: 'none', border: 'none', color: '#a89a7c', cursor: 'pointer', fontSize: 14 }}>✏️</button>
          </div>
        )}

        <div style={{ color: '#f59e0b', fontSize: 12, marginBottom: 4 }}>{user?.title}</div>
        <div style={{ color: '#a89a7c', fontSize: 11 }}>Level {user?.level}</div>

        {/* XP Bar */}
        <div style={{ margin: '12px auto 0', maxWidth: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#a89a7c', marginBottom: 4 }}>
            <span>{user?.xp || 0} XP</span>
            <span>{xpForNextLevel} XP</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{ width: `${xpProgress}%`, height: '100%', background: 'linear-gradient(90deg, #a9762f, #f59e0b)', borderRadius: 4 }} />
          </div>
        </div>
      </div>

      {/* Currency */}
      <div style={{ display: 'flex', gap: 1, padding: '0' }}>
        {[
          { icon: '💰', val: (user?.gold || 0).toLocaleString(), label: 'Gold', color: '#f59e0b' },
          { icon: '💎', val: user?.gems || 0, label: 'Gems', color: '#60a5fa' },
          { icon: '✨', val: user?.card_dust || 0, label: 'Dust', color: '#f0c869' },
        ].map(c => (
          <div key={c.label} style={{
            flex: 1, padding: '14px 8px', textAlign: 'center',
            background: 'rgba(0,0,0,0.3)',
            borderBottom: '1px solid rgba(169,118,47,0.2)',
          }}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>{c.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.color }}>{c.val}</div>
            <div style={{ fontSize: 10, color: '#a89a7c' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Battle Stats */}
      <div style={{ padding: '16px' }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f0c869', marginBottom: 12 }}>📊 Statistik Battle</h3>
        <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
          {[
            ['Total Battle', stats?.total_battles || 0, '⚔️'],
            ['Kemenangan',   stats?.wins || 0, '🏆'],
            ['Win Rate',     `${stats?.win_rate || 0}%`, '📈'],
            ['Streak Terbaik', stats?.highest_streak || 0, '🔥'],
          ].map(([label, val, icon], i) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 16px',
              borderBottom: i < 3 ? '1px solid rgba(169,118,47,0.1)' : 'none',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: 13, color: '#a89a7c' }}>{label}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pack Slot */}
      <PackSlotPanel user={user} />

      {/* Email info */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="glass" style={{ borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#a89a7c' }}>Email</span>
            {user?.google_id && <span style={{ fontSize: 10, color: '#4285F4', background: 'rgba(66,133,244,0.1)', padding: '2px 8px', borderRadius: 4 }}>Google</span>}
          </div>
          <div style={{ fontSize: 13, color: 'white' }}>{user?.email}</div>
        </div>
      </div>

      {/* Logout — di bawah PackSlotPanel */}
      <div style={{ padding: '0 16px 40px' }}>
        <button onClick={logout} style={{
          width: '100%', padding: '14px', borderRadius: 12,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          🚪 Keluar
        </button>
      </div>
    </div>
  );
}

/* ─── Pack Slot Panel ─────────────────────────────────────────── */
function PackSlotPanel({ user }) {
  const { slots, isFull, progress, remaining, fmt } = usePackSlotTimer(user);

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f0c869', marginBottom: 12 }}>
        🎴 Pack Slot
      </h3>
      <div className="glass" style={{ borderRadius: 16, padding: '16px' }}>

        {/* Slot bubbles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          {Array.from({ length: MAX_SLOTS }).map((_, i) => {
            const filled = i < slots;
            // Slot terakhir yang sedang regen (indeks = slots, yaitu slot berikutnya)
            const isRegen = !filled && i === slots && !isFull;
            return (
              <div key={i} style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: filled
                  ? 'linear-gradient(135deg, #a9762f, #a855f7)'
                  : 'rgba(255,255,255,0.06)',
                border: `2px solid ${filled ? '#a855f7' : isRegen ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: filled ? 22 : 18,
                boxShadow: filled ? '0 0 12px rgba(169,118,47,0.5)' : 'none',
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.3s',
              }}>
                {filled ? '🎴' : isRegen ? '⏳' : '○'}
                {/* Shimmer saat regen */}
                {isRegen && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.15), transparent)',
                    animation: 'shimmer 1.5s infinite',
                  }} />
                )}
              </div>
            );
          })}

          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{
              fontSize: 22, fontWeight: 900,
              color: slots > 0 ? '#f0c869' : '#ef4444',
            }}>{slots}/{MAX_SLOTS}</div>
            <div style={{ fontSize: 10, color: '#a89a7c' }}>slot tersedia</div>
          </div>
        </div>

        {/* Progress bar regen */}
        {!isFull && (
          <>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 10, color: '#a89a7c', marginBottom: 6,
            }}>
              <span>⏱ Slot berikutnya</span>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>{fmt(remaining)}</span>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: 6,
              height: 10, overflow: 'hidden', position: 'relative',
            }}>
              <div style={{
                width: `${progress}%`, height: '100%', borderRadius: 6,
                background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                transition: 'width 1s linear', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  animation: 'shimmer 1.5s infinite',
                }} />
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#8a7a5c', marginTop: 6, textAlign: 'center' }}>
              Slot regen otomatis setiap 12 jam
            </div>
          </>
        )}

        {isFull && (
          <div style={{
            textAlign: 'center', padding: '8px 0',
            fontSize: 12, color: '#22c55e', fontWeight: 700,
          }}>
            ✅ Semua slot penuh — siap buka pack!
          </div>
        )}
      </div>
    </div>
  );
}

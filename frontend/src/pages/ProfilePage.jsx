import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi, battleApi } from '../utils/api';

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
        background: 'linear-gradient(180deg, rgba(124,58,237,0.3) 0%, transparent 100%)',
        textAlign: 'center',
        borderBottom: '1px solid rgba(124,58,237,0.2)',
      }}>
        {/* Avatar */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px',
          background: user?.avatar_url ? `url(${user.avatar_url}) center/cover` : 'linear-gradient(135deg, #7c3aed, #f59e0b)',
          border: '3px solid #7c3aed',
          boxShadow: '0 0 20px rgba(124,58,237,0.5)',
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
                border: '1px solid #7c3aed', color: 'white', fontSize: 14, textAlign: 'center' }}
            />
            <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={handleSave}>💾</button>
            <button onClick={() => setEditing(false)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent', color: '#8b7aa8', cursor: 'pointer', fontSize: 13 }}>✗</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 4 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>{user?.username}</h2>
            <button onClick={() => setEditing(true)}
              style={{ background: 'none', border: 'none', color: '#8b7aa8', cursor: 'pointer', fontSize: 14 }}>✏️</button>
          </div>
        )}

        <div style={{ color: '#f59e0b', fontSize: 12, marginBottom: 4 }}>{user?.title}</div>
        <div style={{ color: '#8b7aa8', fontSize: 11 }}>Level {user?.level}</div>

        {/* XP Bar */}
        <div style={{ margin: '12px auto 0', maxWidth: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8b7aa8', marginBottom: 4 }}>
            <span>{user?.xp || 0} XP</span>
            <span>{xpForNextLevel} XP</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{ width: `${xpProgress}%`, height: '100%', background: 'linear-gradient(90deg, #7c3aed, #f59e0b)', borderRadius: 4 }} />
          </div>
        </div>
      </div>

      {/* Currency */}
      <div style={{ display: 'flex', gap: 1, padding: '0' }}>
        {[
          { icon: '💰', val: (user?.gold || 0).toLocaleString(), label: 'Gold', color: '#f59e0b' },
          { icon: '💎', val: user?.gems || 0, label: 'Gems', color: '#60a5fa' },
          { icon: '✨', val: user?.card_dust || 0, label: 'Dust', color: '#c084fc' },
        ].map(c => (
          <div key={c.label} style={{
            flex: 1, padding: '14px 8px', textAlign: 'center',
            background: 'rgba(0,0,0,0.3)',
            borderBottom: '1px solid rgba(124,58,237,0.2)',
          }}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>{c.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.color }}>{c.val}</div>
            <div style={{ fontSize: 10, color: '#8b7aa8' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Battle Stats */}
      <div style={{ padding: '16px' }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#c084fc', marginBottom: 12 }}>📊 Statistik Battle</h3>
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
              borderBottom: i < 3 ? '1px solid rgba(124,58,237,0.1)' : 'none',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: 13, color: '#8b7aa8' }}>{label}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pack info */}
      <div style={{ padding: '0 16px 16px' }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#c084fc', marginBottom: 12 }}>🎴 Pack Slot Hari Ini</h3>
        <div className="glass" style={{ borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#8b7aa8' }}>Sisa Slot</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: user?.pack_slots > 0 ? '#22c55e' : '#ef4444' }}>
              {user?.pack_slots || 0} / 2
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {[0, 1].map(i => (
              <div key={i} style={{
                flex: 1, height: 8, borderRadius: 4,
                background: i < (user?.pack_slots || 0) ? '#7c3aed' : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Email info */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="glass" style={{ borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#8b7aa8' }}>Email</span>
            {user?.google_id && <span style={{ fontSize: 10, color: '#4285F4', background: 'rgba(66,133,244,0.1)', padding: '2px 8px', borderRadius: 4 }}>Google</span>}
          </div>
          <div style={{ fontSize: 13, color: 'white' }}>{user?.email}</div>
        </div>
      </div>

      {/* Logout */}
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

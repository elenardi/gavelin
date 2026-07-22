import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

export default function AuthPage() {
  const [mode, setMode]       = useState('login'); // login | register
  const [form, setForm]       = useState({ username: '', email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register }   = useAuth();
  const navigate              = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect ke backend OAuth
    window.location.href = '/api/auth/google';
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at 30% 40%, #3a2510 0%, #150e07 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      overflow: 'auto',
    }}>
      {/* Background runes */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.05, fontSize: 80, overflow: 'hidden', userSelect: 'none' }}>
        {['⚔️','🛡️','🔮','🐉','💀','🗡️','✨','🏹'].map((r, i) => (
          <span key={i} style={{ position: 'absolute', top: `${10 + i * 12}%`, left: `${5 + i * 13}%` }}>{r}</span>
        ))}
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎲</div>
          <h1 style={{
            fontSize: 28, fontWeight: 900,
            background: 'linear-gradient(135deg, #f0c869, #f59e0b)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>GAVELIN</h1>
          <p style={{ color: '#a89a7c', fontSize: 12, letterSpacing: '0.3em' }}>CARD CHRONICLES</p>
        </div>

        {/* Card */}
        <div className="glass" style={{ padding: '28px 24px' }}>
          {/* Tab toggle */}
          <div style={{
            display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 10,
            padding: 4, marginBottom: 24,
          }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                  background: mode === m ? 'rgba(169,118,47,0.8)' : 'transparent',
                  color: mode === m ? 'white' : '#a89a7c',
                  fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}>
                {m === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>

          {/* Google Login */}
          <button onClick={handleGoogleLogin}
            style={{
              width: '100%', padding: '12px', borderRadius: 12,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              marginBottom: 20, transition: 'background 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
            onMouseOut={e  => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Lanjutkan dengan Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ color: '#a89a7c', fontSize: 12 }}>atau</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <div>
                <label style={{ fontSize: 12, color: '#a89a7c', display: 'block', marginBottom: 6 }}>Username</label>
                <input
                  type="text" placeholder="adventurer_123" required minLength={3}
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, color: '#a89a7c', display: 'block', marginBottom: 6 }}>Email</label>
              <input
                type="email" placeholder="hero@gavelin.com" required
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a89a7c', display: 'block', marginBottom: 6 }}>Password</label>
              <input
                type="password" placeholder="••••••••" required minLength={6}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5',
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}
              style={{ marginTop: 4, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Loading...' : mode === 'login' ? '⚔️ Masuk ke Dungeon' : '🎲 Mulai Petualangan'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#a89a7c', fontSize: 11, marginTop: 16 }}>
          Dengan masuk, kamu menyetujui syarat & ketentuan Gavelin.
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(169,118,47,0.3)',
  color: 'white', fontSize: 14, outline: 'none',
  transition: 'border-color 0.2s',
};

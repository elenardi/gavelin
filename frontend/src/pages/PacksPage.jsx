import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { packApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import PackOpener from '../components/Pack/PackOpener';

export default function PacksPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [packs, setPacks]         = useState([]);
  const [packSlots, setPackSlots] = useState(0);
  const [selectedPack, setSelectedPack] = useState(null);
  const [toast, setToast]         = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = () =>
    packApi.getAll().then(r => { setPacks(r.data.packs); setPackSlots(r.data.packSlots); });

  useEffect(() => { load(); }, []);

  const featured = packs.filter(p => p.is_featured);
  const others   = packs.filter(p => !p.is_featured);

  return (
    <div className="page" style={{ background: 'linear-gradient(180deg, #120826 0%, #0a0418 100%)', overflow: 'hidden' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 74, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(26,10,46,0.97)', border: '1px solid rgba(192,132,252,0.5)',
          borderRadius: 12, padding: '10px 22px', fontSize: 13, fontWeight: 600,
          color: 'white', zIndex: 9999, whiteSpace: 'nowrap',
          boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
          animation: 'slideDown 0.3s ease',
        }}>{toast}</div>
      )}

      {/* Header fixed */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        padding: '14px 16px 10px',
        background: 'rgba(10,4,24,0.92)',
        borderBottom: '1px solid rgba(124,58,237,0.15)',
        zIndex: 50, backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate('/home')} style={{
          background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: 10, width: 34, height: 34, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#c084fc', fontSize: 16, flexShrink: 0,
        }}>←</button>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'white' }}>🎴 Semua Pack</div>
          <div style={{ fontSize: 10, color: '#8b7aa8' }}>Pilih pack untuk dibuka</div>
        </div>

        {/* Slot indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,0,0,0.35)', padding: '6px 12px', borderRadius: 20,
          border: `1px solid ${packSlots > 0 ? 'rgba(124,58,237,0.35)' : 'rgba(239,68,68,0.35)'}`,
        }}>
          <span style={{ fontSize: 14 }}>🎴</span>
          <span style={{
            fontSize: 12, fontWeight: 800,
            color: packSlots > 0 ? '#c084fc' : '#ef4444',
          }}>{packSlots}/2</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{
        position: 'absolute', top: 62, left: 0, right: 0, bottom: 0,
        overflowY: 'auto', overflowX: 'hidden', padding: '16px 16px 24px',
      }}>
        {/* Pack slot bar */}
        <div style={{
          background: 'rgba(26,10,46,0.8)', border: '1px solid rgba(124,58,237,0.15)',
          borderRadius: 14, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 6 }}>
              Slot Buka Pack Hari Ini
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1].map(i => (
                <div key={i} style={{
                  flex: 1, height: 8, borderRadius: 4,
                  background: i < packSlots
                    ? 'linear-gradient(90deg, #7c3aed, #a855f7)'
                    : 'rgba(255,255,255,0.07)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: packSlots > 0 ? '#c084fc' : '#ef4444' }}>
              {packSlots}/2
            </div>
            <div style={{ fontSize: 10, color: '#8b7aa8' }}>
              {packSlots === 0 ? 'Reset 00:00 UTC' : 'Tersisa'}
            </div>
          </div>
        </div>

        {packSlots === 0 && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 20,
            fontSize: 12, color: '#fca5a5', textAlign: 'center',
          }}>
            ⏰ Slot habis hari ini. Coba lagi setelah reset tengah malam UTC.
          </div>
        )}

        {/* Featured packs */}
        {featured.length > 0 && (
          <>
            <SectionLabel>⭐ Featured Pack</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {featured.map(pack => (
                <PackRow
                  key={pack.id}
                  pack={pack}
                  slotsLeft={packSlots}
                  onOpen={() => setSelectedPack(pack)}
                />
              ))}
            </div>
          </>
        )}

        {/* Other packs */}
        {others.length > 0 && (
          <>
            <SectionLabel>🎴 Pack Lainnya</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {others.map(pack => (
                <PackRow
                  key={pack.id}
                  pack={pack}
                  slotsLeft={packSlots}
                  onOpen={() => setSelectedPack(pack)}
                />
              ))}
            </div>
          </>
        )}

        {packs.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b5a88', padding: '64px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎴</div>
            <div style={{ fontSize: 14 }}>Belum ada pack tersedia</div>
          </div>
        )}
      </div>

      {/* Pack Opener modal */}
      {selectedPack && (
        <PackOpener
          pack={selectedPack}
          onClose={() => {
            setSelectedPack(null);
            load();
            refreshUser();
          }}
          onCardsObtained={(data) => setPackSlots(data.remainingSlots)}
        />
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 800, color: '#c084fc',
      marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
    }}>{children}</div>
  );
}

function PackRow({ pack, slotsLeft, onOpen }) {
  const [hover, setHover] = useState(false);
  const disabled = false;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: hover ? 'rgba(34,14,66,0.95)' : 'rgba(26,10,46,0.8)',
        border: `1px solid ${hover ? 'rgba(192,132,252,0.4)' : 'rgba(124,58,237,0.15)'}`,
        borderRadius: 16, padding: '12px 14px',
        boxShadow: hover ? '0 4px 24px rgba(124,58,237,0.25)' : 'none',
        transition: 'all 0.2s',
      }}
    >
      {/* Pack art thumbnail */}
      <div style={{
        width: 72, height: 72, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
        background: pack.image_url
          ? `url(${pack.image_url}) center/cover`
          : 'linear-gradient(145deg, #3b1f72, #1a0a2e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, border: '1px solid rgba(124,58,237,0.2)',
        position: 'relative',
      }}>
        {!pack.image_url && '🎴'}
        {/* Sheen overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 4 }}>{pack.name}</div>
        {pack.description && (
          <div style={{
            fontSize: 11, color: '#8b7aa8', lineHeight: 1.4, marginBottom: 6,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>{pack.description}</div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {pack.is_featured && (
            <span style={{
              fontSize: 9, background: 'rgba(245,158,11,0.15)',
              color: '#f59e0b', padding: '2px 8px', borderRadius: 20,
              border: '1px solid rgba(245,158,11,0.3)', fontWeight: 700,
            }}>★ FEATURED</span>
          )}
          <span style={{
            fontSize: 9, background: 'rgba(124,58,237,0.15)',
            color: '#c084fc', padding: '2px 8px', borderRadius: 20,
            border: '1px solid rgba(124,58,237,0.2)', fontWeight: 700,
          }}>5 Kartu</span>
        </div>
      </div>

      {/* Open button */}
      <button
        onClick={onOpen}
        disabled={disabled}
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: 'white',
          fontWeight: 800, fontSize: 12,
          padding: '10px 16px', borderRadius: 12, border: 'none',
          cursor: 'pointer',
          whiteSpace: 'nowrap', flexShrink: 0,
          boxShadow: '0 2px 12px rgba(124,58,237,0.4)',
          transition: 'all 0.2s',
        }}
      >
        Buka 🎴
      </button>
    </div>
  );
}

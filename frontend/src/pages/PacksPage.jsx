import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { packApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import PackOpener from '../components/Pack/PackOpener';

const MAX_SLOTS = 2;
const REGEN_MS  = 12 * 60 * 60 * 1000;

function usePackSlotTimer(user) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const slots    = user?.pack_slots ?? 0;
  const anchor   = user?.last_slot_reset ? new Date(user.last_slot_reset).getTime() : null;
  const isFull   = slots >= MAX_SLOTS;
  const elapsed  = anchor ? now - anchor : 0;
  const progress  = anchor ? Math.min((elapsed % REGEN_MS) / REGEN_MS * 100, 100) : 0;
  const remaining = anchor ? Math.max(0, REGEN_MS - (elapsed % REGEN_MS)) : 0;

  const fmt = (ms) => {
    const t = Math.floor(ms / 1000);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  return { slots, isFull, progress, remaining, fmt };
}

export default function PacksPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [packs, setPacks]           = useState([]);
  const [selectedPack, setSelectedPack] = useState(null);
  const [toast, setToast]           = useState('');

  const { slots: packSlots, isFull, progress, remaining, fmt } = usePackSlotTimer(user);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = () =>
    packApi.getAll().then(r => { setPacks(r.data.packs); });

  useEffect(() => { load(); }, []);

  const featured = packs.filter(p => p.is_featured);
  const others   = packs.filter(p => !p.is_featured);

  return (
    <div className="page" style={{ background: 'linear-gradient(180deg, #241a0d 0%, #1c130a 100%)', overflow: 'hidden' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 74, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(43,29,16,0.97)', border: '1px solid rgba(240,200,105,0.5)',
          borderRadius: 12, padding: '10px 22px', fontSize: 13, fontWeight: 600,
          color: 'white', zIndex: 9999, whiteSpace: 'nowrap',
          boxShadow: '0 4px 24px rgba(169,118,47,0.4)',
          animation: 'slideDown 0.3s ease',
        }}>{toast}</div>
      )}

      {/* Header fixed */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        padding: '14px 16px 10px',
        background: 'rgba(28,19,10,0.92)',
        borderBottom: '1px solid rgba(169,118,47,0.15)',
        zIndex: 50, backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate('/home')} style={{
          background: 'rgba(169,118,47,0.15)', border: '1px solid rgba(169,118,47,0.25)',
          borderRadius: 10, width: 34, height: 34, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#f0c869', fontSize: 16, flexShrink: 0,
        }}>←</button>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'white' }}>🎴 Semua Pack</div>
          <div style={{ fontSize: 10, color: '#a89a7c' }}>Pilih pack untuk dibuka</div>
        </div>

        {/* Slot indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,0,0,0.35)', padding: '6px 12px', borderRadius: 20,
          border: `1px solid ${packSlots > 0 ? 'rgba(169,118,47,0.35)' : 'rgba(239,68,68,0.35)'}`,
        }}>
          <span style={{ fontSize: 14 }}>🎴</span>
          <span style={{
            fontSize: 12, fontWeight: 800,
            color: packSlots > 0 ? '#f0c869' : '#ef4444',
          }}>{packSlots}/2</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{
        position: 'absolute', top: 62, left: 0, right: 0, bottom: 0,
        overflowY: 'auto', overflowX: 'hidden', padding: '16px 16px 24px',
      }}>
        {/* Pack slot timer panel */}
        <div style={{
          background: 'rgba(43,29,16,0.8)', border: '1px solid rgba(169,118,47,0.15)',
          borderRadius: 16, padding: '16px', marginBottom: 20,
        }}>
          {/* Slot bubbles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            {Array.from({ length: MAX_SLOTS }).map((_, i) => {
              const filled  = i < packSlots;
              const isRegen = !filled && i === packSlots && !isFull;
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
                  position: 'relative', overflow: 'hidden', transition: 'all 0.3s',
                }}>
                  {filled ? '🎴' : isRegen ? '⏳' : '○'}
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
              <div style={{ fontSize: 22, fontWeight: 900, color: packSlots > 0 ? '#f0c869' : '#ef4444' }}>
                {packSlots}/{MAX_SLOTS}
              </div>
              <div style={{ fontSize: 10, color: '#a89a7c' }}>slot tersedia</div>
            </div>
          </div>

          {/* Countdown progress bar */}
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
            <div style={{ textAlign: 'center', padding: '4px 0', fontSize: 12, color: '#22c55e', fontWeight: 700 }}>
              ✅ Semua slot penuh — siap buka pack!
            </div>
          )}
        </div>

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
          <div style={{ textAlign: 'center', color: '#8a7a5c', padding: '64px 0' }}>
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
          onCardsObtained={() => refreshUser()}
        />
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 800, color: '#f0c869',
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
        background: hover ? 'rgba(34,14,66,0.95)' : 'rgba(43,29,16,0.8)',
        border: `1px solid ${hover ? 'rgba(240,200,105,0.4)' : 'rgba(169,118,47,0.15)'}`,
        borderRadius: 16, padding: '12px 14px',
        boxShadow: hover ? '0 4px 24px rgba(169,118,47,0.25)' : 'none',
        transition: 'all 0.2s',
      }}
    >
      {/* Pack art thumbnail */}
      <div style={{
        width: 72, height: 72, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
        background: pack.image_url
          ? `url(${pack.image_url}) center/cover`
          : 'linear-gradient(145deg, #4a3218, #2b1d10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, border: '1px solid rgba(169,118,47,0.2)',
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
            fontSize: 11, color: '#a89a7c', lineHeight: 1.4, marginBottom: 6,
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
            fontSize: 9, background: 'rgba(169,118,47,0.15)',
            color: '#f0c869', padding: '2px 8px', borderRadius: 20,
            border: '1px solid rgba(169,118,47,0.2)', fontWeight: 700,
          }}>5 Kartu</span>
        </div>
      </div>

      {/* Open button */}
      <button
        onClick={onOpen}
        disabled={disabled}
        style={{
          background: 'linear-gradient(135deg, #a9762f, #a855f7)',
          color: 'white',
          fontWeight: 800, fontSize: 12,
          padding: '10px 16px', borderRadius: 12, border: 'none',
          cursor: 'pointer',
          whiteSpace: 'nowrap', flexShrink: 0,
          boxShadow: '0 2px 12px rgba(169,118,47,0.4)',
          transition: 'all 0.2s',
        }}
      >
        Buka 🎴
      </button>
    </div>
  );
}

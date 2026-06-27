/**
 * PackOpener — Animasi buka pack mirip Pokemon TCG Pocket
 * Mendukung buka gratis (slot) atau berbayar (gold/gems) saat slot habis
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import CardRenderer from '../Card/CardRenderer';
import { packApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const REVEAL_DELAY = 600;
const REGEN_MS     = 12 * 60 * 60 * 1000;

function useRegenCountdown(user) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const anchor   = user?.last_slot_reset ? new Date(user.last_slot_reset).getTime() : null;
  const elapsed  = anchor ? now - anchor : 0;
  const remaining = anchor ? Math.max(0, REGEN_MS - (elapsed % REGEN_MS)) : 0;
  const progress  = anchor ? Math.min((elapsed % REGEN_MS) / REGEN_MS * 100, 100) : 0;

  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  return { remaining, progress, fmt };
}

export default function PackOpener({ pack, onClose, onCardsObtained }) {
  const { user } = useAuth();
  const { remaining, progress, fmt } = useRegenCountdown(user);
  const canvasRef = useRef(null);
  const [phase, setPhase]         = useState('ready'); // ready | paywall | opening | reveal | done
  const [cards, setCards]         = useState([]);
  const [revealed, setRevealed]   = useState(0);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [currentCard, setCurrentCard] = useState(null);
  const [slotsEmpty, setSlotsEmpty]   = useState(false);
  const [goldCost, setGoldCost]       = useState(pack?.cost_gold ?? 0);
  const [gemsCost, setGemsCost]       = useState(pack?.cost_gems ?? 0);

  // Three.js particle burst
  useEffect(() => {
    if (phase !== 'opening' || !canvasRef.current) return;

    const canvas   = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.offsetWidth / canvas.offsetHeight, 0.1, 100);
    camera.position.z = 3;

    const count = 300;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);
    const vel   = new Float32Array(count * 3);
    const cols  = new Float32Array(count * 3);

    const rarityColor = {
      common: [0.58, 0.64, 0.72], uncommon: [0.13, 0.77, 0.37],
      rare: [0.23, 0.51, 0.96], epic: [0.66, 0.33, 0.97], legendary: [0.96, 0.62, 0.04],
    };

    for (let i = 0; i < count; i++) {
      pos[i*3] = 0; pos[i*3+1] = 0; pos[i*3+2] = 0;
      vel[i*3]   = (Math.random()-0.5)*0.15;
      vel[i*3+1] = (Math.random()-0.5)*0.15 + 0.05;
      vel[i*3+2] = (Math.random()-0.5)*0.05;
      const rc = rarityColor['rare'];
      cols[i*3] = rc[0]; cols[i*3+1] = rc[1]; cols[i*3+2] = rc[2];
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(cols, 3));

    const mat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true });
    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const p = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        p[i*3]   += vel[i*3];
        p[i*3+1] += vel[i*3+1];
        p[i*3+2] += vel[i*3+2];
        vel[i*3+1] -= 0.002;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = Math.max(0, mat.opacity - 0.008);
      renderer.render(scene, camera);
    };
    animate();

    return () => { cancelAnimationFrame(frame); renderer.dispose(); };
  }, [phase]);

  const doOpen = async (paymentMethod = null) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await packApi.open(pack.id, paymentMethod);
      setCards(data.cards);
      setPhase('opening');
      setSlotsEmpty(false);

      setTimeout(() => {
        setPhase('reveal');
        revealCards(data.cards);
      }, 1500);

      if (onCardsObtained) onCardsObtained(data);
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.slotsEmpty) {
        // Slot habis — tampilkan pilihan bayar
        setSlotsEmpty(true);
        setGoldCost(resp.goldCost ?? pack?.cost_gold ?? 0);
        setGemsCost(resp.gemsCost ?? pack?.cost_gems ?? 0);
        setPhase('paywall');
      } else {
        setError(resp?.error || 'Gagal membuka pack.');
      }
      setLoading(false);
    }
  };

  const revealCards = (cardList) => {
    cardList.forEach((card, idx) => {
      setTimeout(() => {
        setCurrentCard(card);
        setRevealed(idx + 1);
        if (idx === cardList.length - 1) {
          setTimeout(() => setPhase('done'), 800);
        }
      }, idx * REVEAL_DELAY);
    });
  };

  const canAffordGold = (user?.gold ?? 0) >= goldCost;
  const canAffordGems = (user?.gems ?? 0) >= gemsCost;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <canvas ref={canvasRef} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none',
        display: phase === 'opening' ? 'block' : 'none',
      }} />

      {/* ── READY ──────────────────────────────────────────── */}
      {phase === 'ready' && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <PackArt pack={pack} />
          <h2 style={{ color: 'white', marginBottom: 8, fontSize: 20 }}>Buka Pack</h2>
          <p style={{ color: '#8b7aa8', marginBottom: 24, fontSize: 14 }}>{pack?.description}</p>

          {error && <ErrorBox>{error}</ErrorBox>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => doOpen(null)} disabled={loading} className="btn-primary" style={{ fontSize: 16 }}>
              {loading ? 'Membuka...' : '✨ Buka Sekarang'}
            </button>
            <button onClick={onClose} style={cancelBtnStyle}>Batal</button>
          </div>
        </div>
      )}

      {/* ── PAYWALL — slot habis, pilih cara bayar ─────────── */}
      {phase === 'paywall' && (
        <div style={{ padding: '28px 20px 24px', maxWidth: 400, width: '100%' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🎴</div>
            <h2 style={{ color: 'white', fontSize: 19, fontWeight: 900, marginBottom: 6 }}>
              Slot Habis
            </h2>
            <p style={{ color: '#8b7aa8', fontSize: 13, lineHeight: 1.5 }}>
              Kamu masih bisa buka{' '}
              <strong style={{ color: '#c084fc' }}>{pack?.name}</strong>{' '}
              dengan cara di bawah ini.
            </p>
          </div>

          {/* Regen timer box */}
          {remaining > 0 && (
            <div style={{
              background: 'rgba(26,10,46,0.8)',
              border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 14, padding: '12px 16px', marginBottom: 18,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 8,
              }}>
                <span style={{ fontSize: 12, color: '#8b7aa8' }}>⏱ Slot berikutnya dalam</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: '#f59e0b',
                  fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(remaining)}
                </span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
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
              <div style={{ fontSize: 10, color: '#6b5a88', marginTop: 6 }}>
                Slot regen otomatis setiap 12 jam
              </div>
            </div>
          )}

          {error && <ErrorBox style={{ marginBottom: 14 }}>{error}</ErrorBox>}

          {/* Payment options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {goldCost > 0 && (
              <PayOption
                icon="💰"
                label="Bayar dengan Gold"
                cost={`${goldCost.toLocaleString()} Gold`}
                have={`Kamu punya: ${(user?.gold ?? 0).toLocaleString()}`}
                canAfford={canAffordGold}
                onClick={() => { setError(''); doOpen('gold'); }}
                loading={loading}
                color="#f59e0b"
                glowColor="rgba(245,158,11,0.3)"
              />
            )}
            {gemsCost > 0 && (
              <PayOption
                icon="💎"
                label="Bayar dengan Gems"
                cost={`${gemsCost} Gems`}
                have={`Kamu punya: ${user?.gems ?? 0}`}
                canAfford={canAffordGems}
                onClick={() => { setError(''); doOpen('gems'); }}
                loading={loading}
                color="#60a5fa"
                glowColor="rgba(96,165,250,0.3)"
              />
            )}
            {goldCost === 0 && gemsCost === 0 && (
              <button
                onClick={() => { setError(''); doOpen('free'); }}
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 16,
                  border: '1px solid rgba(34,197,94,0.4)',
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.2)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  width: '100%', opacity: loading ? 0.6 : 1,
                }}
              >
                <span style={{ fontSize: 32 }}>🎁</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'white', marginBottom: 2 }}>Buka Pack Gratis</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#22c55e' }}>GRATIS</div>
                  <div style={{ fontSize: 10, color: '#8b7aa8', marginTop: 2 }}>Pack ini tidak memerlukan biaya tambahan</div>
                </div>
                <div style={{
                  background: '#22c55e', color: '#0a0418',
                  fontWeight: 800, fontSize: 11,
                  padding: '6px 14px', borderRadius: 20, flexShrink: 0,
                }}>Buka</div>
              </button>
            )}
          </div>

          <button onClick={onClose} style={{ ...cancelBtnStyle, width: '100%', textAlign: 'center' }}>
            Tutup
          </button>
        </div>
      )}

      {/* ── OPENING ────────────────────────────────────────── */}
      {phase === 'opening' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 80, animation: 'spin 0.5s linear infinite' }}>✨</div>
          <p style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>Membuka...</p>
        </div>
      )}

      {/* ── REVEAL ─────────────────────────────────────────── */}
      {phase === 'reveal' && currentCard && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#8b7aa8', fontSize: 12, marginBottom: 12 }}>
            {revealed} / {cards.length}
          </p>
          <div style={{ animation: 'cardReveal 0.4s ease' }}>
            <CardRenderer card={currentCard} size="lg" animated />
          </div>
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 14, color: 'white', fontWeight: 600 }}>{currentCard.name}</span>
            <span className={`rarity-badge rarity-${currentCard.rarity}`} style={{ marginLeft: 8 }}>
              {currentCard.rarity}
            </span>
          </div>
          <p style={{ color: '#8b7aa8', fontSize: 11, marginTop: 8 }}>Tap untuk lanjutkan</p>
        </div>
      )}

      {/* ── DONE ───────────────────────────────────────────── */}
      {phase === 'done' && (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <h2 style={{ color: 'white', marginBottom: 20, fontSize: 18 }}>Kartu Didapatkan! 🎉</h2>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            {cards.map((card, idx) => (
              <div key={idx} style={{ animation: `cardReveal 0.3s ${idx * 0.1}s ease both` }}>
                <CardRenderer card={card} size="sm" />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => { setPhase('ready'); setLoading(false); setError(''); }}>
              🎴 Buka Lagi
            </button>
            <button onClick={onClose} style={cancelBtnStyle}>Selesai</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes cardReveal {
          from { transform: scale(0.5) rotateY(90deg); opacity: 0; }
          to { transform: scale(1) rotateY(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

function PackArt({ pack }) {
  return (
    <div style={{
      width: 160, height: 220, margin: '0 auto 24px',
      background: pack?.image_url
        ? `url(${pack.image_url}) center/cover`
        : 'linear-gradient(135deg, #3b1f72, #1a0a2e)',
      borderRadius: 12, border: '2px solid #7c3aed',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontSize: 60, boxShadow: '0 0 40px rgba(124,58,237,0.5)',
      animation: 'float 2s ease-in-out infinite',
    }}>
      {!pack?.image_url && <>🎴<div style={{ fontSize: 14, fontWeight: 700, color: '#c084fc', marginTop: 8 }}>{pack?.name}</div></>}
    </div>
  );
}

function PayOption({ icon, label, cost, have, canAfford, onClick, loading, color, glowColor }) {
  return (
    <button
      onClick={onClick}
      disabled={!canAfford || loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', borderRadius: 16, cursor: canAfford ? 'pointer' : 'not-allowed',
        background: canAfford
          ? `linear-gradient(135deg, rgba(${hexToRgbStr(color)},0.15) 0%, rgba(${hexToRgbStr(color)},0.05) 100%)`
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${canAfford ? `rgba(${hexToRgbStr(color)},0.4)` : 'rgba(255,255,255,0.08)'}`,
        boxShadow: canAfford ? `0 4px 20px ${glowColor}` : 'none',
        transition: 'all 0.2s', width: '100%',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: 32, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: canAfford ? 'white' : '#6b5a88', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 900, color: canAfford ? color : '#6b5a88' }}>{cost}</div>
        <div style={{ fontSize: 10, color: canAfford ? '#8b7aa8' : '#ef4444', marginTop: 2 }}>{have}</div>
      </div>
      {canAfford && (
        <div style={{
          background: color, color: '#0a0418',
          fontWeight: 800, fontSize: 11,
          padding: '6px 14px', borderRadius: 20, flexShrink: 0,
        }}>
          Pilih
        </div>
      )}
      {!canAfford && (
        <div style={{ fontSize: 11, color: '#ef4444', flexShrink: 0 }}>Tidak<br />cukup</div>
      )}
    </button>
  );
}

function ErrorBox({ children, style }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5',
      marginBottom: 16, ...style,
    }}>{children}</div>
  );
}

const cancelBtnStyle = {
  padding: '12px 24px', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'transparent', color: '#8b7aa8',
  cursor: 'pointer', fontSize: 14,
};

function hexToRgbStr(hex) {
  const m = String(hex).match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!m) return '124,58,237';
  return `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}`;
}

/**
 * PackOpener — Animasi buka pack mirip Pokemon TCG Pocket
 * Menggunakan Three.js untuk partikel + CSS untuk card reveal
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import CardRenderer from '../Card/CardRenderer';
import { packApi } from '../../utils/api';

const REVEAL_DELAY = 600; // ms antar kartu

export default function PackOpener({ pack, onClose, onCardsObtained }) {
  const canvasRef   = useRef(null);
  const rendererRef = useRef(null);
  const [phase, setPhase] = useState('ready'); // ready | opening | reveal | done
  const [cards, setCards] = useState([]);
  const [revealed, setRevealed] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentCard, setCurrentCard] = useState(null);

  // Three.js particle burst
  useEffect(() => {
    if (phase !== 'opening' || !canvasRef.current) return;

    const canvas   = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    rendererRef.current = renderer;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.offsetWidth / canvas.offsetHeight, 0.1, 100);
    camera.position.z = 3;

    // Burst particles
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
      const rc = rarityColor[pack?.theme === 'dragon' ? 'legendary' : 'rare'];
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
        vel[i*3+1] -= 0.002; // gravity
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = Math.max(0, mat.opacity - 0.008);
      renderer.render(scene, camera);
    };
    animate();

    return () => { cancelAnimationFrame(frame); renderer.dispose(); };
  }, [phase]);

  const openPack = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await packApi.open(pack.id);
      setCards(data.cards);
      setPhase('opening');

      // Mulai reveal setelah animasi burst
      setTimeout(() => {
        setPhase('reveal');
        revealCards(data.cards);
      }, 1500);

      if (onCardsObtained) onCardsObtained(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal membuka pack.');
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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Canvas for particles */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none',
        display: phase === 'opening' ? 'block' : 'none',
      }} />

      {/* READY phase */}
      {phase === 'ready' && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{
            width: 160, height: 220, margin: '0 auto 24px',
            background: `linear-gradient(135deg, #3b1f72, #1a0a2e)`,
            borderRadius: 12, border: '2px solid #7c3aed',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 60, boxShadow: '0 0 40px rgba(124,58,237,0.5)',
            animation: 'float 2s ease-in-out infinite',
          }}>
            🎴
            <div style={{ fontSize: 14, fontWeight: 700, color: '#c084fc', marginTop: 8 }}>
              {pack?.name}
            </div>
          </div>

          <h2 style={{ color: 'white', marginBottom: 8, fontSize: 20 }}>Buka Pack</h2>
          <p style={{ color: '#8b7aa8', marginBottom: 24, fontSize: 14 }}>
            {pack?.description}
          </p>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px', fontSize: 13, color: '#fca5a5', marginBottom: 16,
            }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={openPack} disabled={loading} className="btn-primary" style={{ fontSize: 16 }}>
              {loading ? 'Membuka...' : '✨ Buka Sekarang'}
            </button>
            <button onClick={onClose} style={{
              padding: '12px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent', color: '#8b7aa8', cursor: 'pointer', fontSize: 14,
            }}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* OPENING phase */}
      {phase === 'opening' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 80, animation: 'spin 0.5s linear infinite' }}>✨</div>
          <p style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>Membuka...</p>
        </div>
      )}

      {/* REVEAL phase — one card at a time */}
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

      {/* DONE phase — show all 5 cards */}
      {phase === 'done' && (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <h2 style={{ color: 'white', marginBottom: 20, fontSize: 18 }}>Kartu Didapatkan! 🎉</h2>
          <div style={{
            display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
            marginBottom: 24,
          }}>
            {cards.map((card, idx) => (
              <div key={idx} style={{ animation: `cardReveal 0.3s ${idx * 0.1}s ease both` }}>
                <CardRenderer card={card} size="sm" />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn-primary" onClick={openPack}>
              🎴 Buka Lagi
            </button>
            <button onClick={onClose} style={{
              padding: '12px 24px', borderRadius: 12, border: '1px solid #7c3aed',
              background: 'transparent', color: '#c084fc', cursor: 'pointer',
            }}>
              Selesai
            </button>
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

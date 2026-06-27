/**
 * BattleArena — In-game battle UI dengan Three.js background
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import CardRenderer from '../Card/CardRenderer';

export default function BattleArena({ gameState, socket, battleId, onEnd }) {
  const canvasRef = useRef(null);
  const [gs, setGs] = useState(gameState);
  const [selectedCard, setSelectedCard] = useState(null);
  const [targetCard, setTargetCard]     = useState(null);
  const [log, setLog]   = useState([]);
  const [phase, setPhase] = useState('player1'); // player1 | ai_turn

  // Sync gameState updates
  useEffect(() => { if (gameState) setGs(gameState); }, [gameState]);

  // Three.js arena background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.offsetWidth / canvas.offsetHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    // Dungeon floor grid
    const grid = new THREE.GridHelper(20, 20, 0x3b1f72, 0x221442);
    grid.rotation.x = Math.PI / 4;
    grid.position.y = -2;
    scene.add(grid);

    // Ambient particles
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      pPos[i*3]   = (Math.random()-0.5)*15;
      pPos[i*3+1] = (Math.random()-0.5)*10;
      pPos[i*3+2] = (Math.random()-0.5)*8;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.03, color: 0x7c3aed, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Points(pGeo, pMat));

    // Fog
    scene.fog = new THREE.FogExp2(0x0d0520, 0.08);

    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      grid.rotation.z += 0.001;
      pMat.opacity = 0.4 + Math.sin(Date.now() * 0.002) * 0.2;
      renderer.render(scene, camera);
    };
    animate();

    return () => { cancelAnimationFrame(frame); renderer.dispose(); };
  }, []);

  const playCard = (card) => {
    if (!selectedCard) {
      setSelectedCard(card);
      return;
    }
    if (selectedCard.id === card.id) {
      setSelectedCard(null);
      return;
    }
    // Play card
    socket?.emit('play_card', { battleId, cardId: selectedCard.id, targetId: targetCard?.id });
    setSelectedCard(null);
    setTargetCard(null);
  };

  const endTurn = () => {
    socket?.emit('end_turn', { battleId });
    setPhase('ai_turn');
  };

  const surrender = () => {
    if (confirm('Yakin menyerah?')) {
      socket?.emit('surrender', { battleId });
      onEnd();
    }
  };

  if (!gs) return null;

  const { player1, player2 } = gs;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #0d0520 0%, #1a0a2e 100%)',
    }}>
      {/* Three.js Background */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Top: Opponent info */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px',
          background: 'rgba(0,0,0,0.4)',
          borderBottom: '1px solid rgba(239,68,68,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #1a0a2e)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>AI Opponent</div>
              <div style={{ fontSize: 10, color: '#8b7aa8' }}>{gs.difficulty || 'Normal'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: '#ef4444' }}>❤️ {player2.hp}</div>
            <div style={{ fontSize: 11, color: '#8b7aa8' }}>🃏 {player2.hand.length}</div>
          </div>
        </div>

        {/* Opponent field */}
        <div style={{
          flex: '0 0 120px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '8px',
          background: 'rgba(239,68,68,0.05)',
          borderBottom: '1px dashed rgba(239,68,68,0.2)',
        }}>
          {player2.field.length === 0 ? (
            <p style={{ color: 'rgba(239,68,68,0.4)', fontSize: 11 }}>Field kosong</p>
          ) : player2.field.map((card, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <CardRenderer
                card={card}
                size="sm"
                onClick={() => setTargetCard(targetCard?.id === card.id ? null : card)}
                selected={targetCard?.id === card.id}
              />
              <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                background: '#ef4444', borderRadius: 8, padding: '1px 6px', fontSize: 9, fontWeight: 700, color: 'white' }}>
                {card.currentHp}HP
              </div>
            </div>
          ))}
        </div>

        {/* Turn indicator */}
        <div style={{
          textAlign: 'center', padding: '6px',
          background: phase === 'ai_turn' ? 'rgba(239,68,68,0.2)' : 'rgba(124,58,237,0.2)',
          fontSize: 12, fontWeight: 700,
          color: phase === 'ai_turn' ? '#ef4444' : '#c084fc',
        }}>
          {phase === 'ai_turn' ? '⏳ AI sedang bergerak...' : `Turn ${gs.turn} — Giliranmu | Energy: ${player1.energy}⚡`}
        </div>

        {/* Player field */}
        <div style={{
          flex: '0 0 120px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '8px',
          background: 'rgba(124,58,237,0.05)',
          borderTop: '1px dashed rgba(124,58,237,0.2)',
        }}>
          {player1.field.length === 0 ? (
            <p style={{ color: 'rgba(124,58,237,0.4)', fontSize: 11 }}>Mainkan kartu ke field</p>
          ) : player1.field.map((card, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <CardRenderer card={card} size="sm" />
              <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                background: '#22c55e', borderRadius: 8, padding: '1px 6px', fontSize: 9, fontWeight: 700, color: 'white' }}>
                {card.currentHp}HP
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: Player info + Hand */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.4)' }}>
          {/* Player HP */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px',
            borderBottom: '1px solid rgba(124,58,237,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #f59e0b)',
                border: '2px solid #7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⚔️</div>
              <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>You</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 11, color: '#22c55e' }}>❤️ {player1.hp}</span>
              <span style={{ fontSize: 11, color: '#c084fc' }}>⚡ {player1.energy}</span>
              <span style={{ fontSize: 11, color: '#8b7aa8' }}>🃏 {player1.deck.length}</span>
            </div>
          </div>

          {/* Hand */}
          <div style={{ flex: 1, overflowX: 'auto', display: 'flex', alignItems: 'center',
            gap: 8, padding: '10px 16px' }}>
            {player1.hand.length === 0 ? (
              <p style={{ color: '#8b7aa8', fontSize: 12 }}>Tangan kosong. Deck mungkin habis.</p>
            ) : player1.hand.map((card, i) => (
              <CardRenderer
                key={i}
                card={card}
                size="sm"
                onClick={() => playCard(card)}
                selected={selectedCard?.id === card.id}
                animated
              />
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, padding: '10px 16px', borderTop: '1px solid rgba(124,58,237,0.2)' }}>
            {selectedCard && (
              <button className="btn-primary" style={{ flex: 1, fontSize: 12 }}
                onClick={() => {
                  socket?.emit('play_card', { battleId, cardId: selectedCard.id, targetId: targetCard?.id });
                  setSelectedCard(null);
                  setTargetCard(null);
                }}>
                ✨ Mainkan {selectedCard.name}
              </button>
            )}
            <button className="btn-primary" style={{ flex: 1, fontSize: 12, background: '#22c55e' }}
              onClick={endTurn} disabled={phase === 'ai_turn'}>
              ➡️ Akhiri Giliran
            </button>
            <button onClick={surrender}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)',
                background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
              🏳️ Menyerah
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

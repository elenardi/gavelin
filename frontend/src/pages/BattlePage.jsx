import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { battleApi, collectionApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import CardRenderer from '../components/Card/CardRenderer';
import BattleArena from '../components/Battle/BattleArena';

export default function BattlePage() {
  const { user } = useAuth();
  const [tab, setTab]         = useState('menu'); // menu | ai | pvp | history | leaderboard
  const [decks, setDecks]     = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [difficulty, setDifficulty] = useState('normal');
  const [battleState, setBattleState] = useState(null);
  const [battleId, setBattleId]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [toast, setToast]     = useState('');
  const socketRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    collectionApi.getDecks().then(r => setDecks(r.data.decks));
  }, []);

  // Socket.IO setup
  useEffect(() => {
    const token = localStorage.getItem('gavelin_token');
    const socket = io('/', { auth: { token } });
    socketRef.current = socket;

    socket.on('battle_started', ({ battleId, gameState }) => {
      setBattleId(battleId);
      setBattleState(gameState);
      setLoading(false);
    });

    socket.on('game_update', ({ gameState }) => {
      setBattleState({ ...gameState });
    });

    socket.on('battle_ended', ({ winner, gameState }) => {
      setBattleState(prev => ({ ...prev, ...gameState, winner }));
    });

    socket.on('error', ({ message }) => {
      showToast(message);
      setLoading(false);
    });

    return () => socket.disconnect();
  }, []);

  // Hide navigation while in battle
  useEffect(() => {
    const active = !!(battleState && !battleState.winner);
    document.body.classList.toggle('in-battle', active);
    return () => document.body.classList.remove('in-battle');
  }, [battleState]);

  const startAIBattle = () => {
    if (!selectedDeck) return showToast('Pilih deck dulu!');
    setLoading(true);
    socketRef.current?.emit('start_ai_battle', { deckId: selectedDeck.id, difficulty });
  };

  const loadHistory = () => {
    battleApi.getHistory().then(r => setHistory(r.data.history));
    setTab('history');
  };

  const loadLeaderboard = () => {
    battleApi.getLeaderboard().then(r => setLeaderboard(r.data.leaderboard));
    setTab('leaderboard');
  };

  // In-battle view
  if (battleState && !battleState.winner) {
    return (
      <BattleArena
        gameState={battleState}
        socket={socketRef.current}
        battleId={battleId}
        onEnd={() => { setBattleState(null); setBattleId(null); setTab('menu'); }}
      />
    );
  }

  // Battle ended
  if (battleState?.winner) {
    const won = battleState.winner === 'player1';
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>{won ? '🏆' : '💀'}</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: won ? '#f59e0b' : '#ef4444', marginBottom: 8 }}>
            {won ? 'KEMENANGAN!' : 'KEKALAHAN'}
          </h2>
          <p style={{ color: '#8b7aa8', marginBottom: 24 }}>
            {won ? 'Luar biasa! Musuhmu dikalahkan!' : 'Lebih baik lain kali, petualang!'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => {
              setBattleState(null);
              setBattleId(null);
            }}>
              ⚔️ Battle Lagi
            </button>
            <button onClick={() => { setBattleState(null); setBattleId(null); setTab('menu'); }}
              style={{ padding: '12px 24px', borderRadius: 12, border: '1px solid #7c3aed',
                background: 'transparent', color: '#c084fc', cursor: 'pointer' }}>
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {toast && <div className="toast">{toast}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'rgba(13,5,32,0.9)', borderBottom: '1px solid rgba(124,58,237,0.2)',
        position: 'sticky', top: 0, zIndex: 10 }}>
        {[
          { id: 'menu',        label: '⚔️ Battle' },
          { id: 'history',     label: '📜 History' },
          { id: 'leaderboard', label: '🏆 Rank' },
        ].map(t => (
          <button key={t.id} onClick={() => t.id === 'history' ? loadHistory() : t.id === 'leaderboard' ? loadLeaderboard() : setTab(t.id)}
            style={{
              flex: 1, padding: '14px', border: 'none', background: 'transparent',
              color: tab === t.id ? '#c084fc' : '#8b7aa8',
              fontWeight: 700, fontSize: 12,
              borderBottom: `2px solid ${tab === t.id ? '#7c3aed' : 'transparent'}`,
              cursor: 'pointer',
            }}>{t.label}</button>
        ))}
      </div>

      {/* MENU */}
      {tab === 'menu' && (
        <div style={{ padding: '20px 16px' }}>
          {/* Deck Selection */}
          <h3 style={{ color: '#c084fc', fontSize: 14, marginBottom: 12 }}>🃏 Pilih Deck</h3>
          {decks.length === 0 ? (
            <div className="glass" style={{ padding: 20, textAlign: 'center', borderRadius: 12, marginBottom: 20 }}>
              <p style={{ color: '#8b7aa8', fontSize: 13 }}>Belum ada deck. Buat deck di halaman Koleksi dulu!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 20, paddingBottom: 8 }}>
              {decks.map(deck => (
                <div key={deck.id}
                  className="glass"
                  onClick={() => setSelectedDeck(deck)}
                  style={{
                    minWidth: 140, padding: '12px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${selectedDeck?.id === deck.id ? '#f59e0b' : 'rgba(124,58,237,0.3)'}`,
                    transition: 'border-color 0.2s',
                  }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>📋</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{deck.name}</div>
                  <div style={{ fontSize: 10, color: '#8b7aa8' }}>{deck.cards?.length || 0} kartu</div>
                </div>
              ))}
            </div>
          )}

          {/* VS AI */}
          <div className="glass" style={{ padding: '20px', borderRadius: 16, marginBottom: 16 }}>
            <h3 style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🤖 Battle vs AI</h3>

            {/* Difficulty */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['easy', 'normal', 'hard'].map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                    background: difficulty === d ? 'rgba(124,58,237,0.8)' : 'rgba(0,0,0,0.3)',
                    color: difficulty === d ? 'white' : '#8b7aa8',
                    fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                  {d === 'easy' ? '🟢 Mudah' : d === 'normal' ? '🟡 Normal' : '🔴 Susah'}
                </button>
              ))}
            </div>

            <button className="btn-primary" style={{ width: '100%', fontSize: 15 }}
              disabled={!selectedDeck || loading} onClick={startAIBattle}>
              {loading ? '⏳ Memulai...' : '⚔️ Mulai Battle vs AI'}
            </button>
          </div>

          {/* PvP */}
          <div className="glass" style={{ padding: '20px', borderRadius: 16 }}>
            <h3 style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>👥 Battle vs Player</h3>
            <p style={{ color: '#8b7aa8', fontSize: 12, marginBottom: 16 }}>
              Matchmaking otomatis dengan pemain lain secara real-time.
            </p>
            <button className="btn-primary" style={{ width: '100%', fontSize: 15 }}
              disabled={!selectedDeck}
              onClick={async () => {
                if (!selectedDeck) return showToast('Pilih deck dulu!');
                try {
                  const { data } = await battleApi.pvpQueue({ deckId: selectedDeck.id });
                  showToast(data.message);
                  setBattleId(data.battleId);
                  socketRef.current?.emit('join_battle', { battleId: data.battleId });
                } catch (err) {
                  showToast('Gagal masuk antrian.');
                }
              }}>
              🔍 Cari Lawan
            </button>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        <div style={{ padding: '16px' }}>
          {history.length === 0 && (
            <div style={{ textAlign: 'center', color: '#8b7aa8', padding: '60px 0' }}>
              <div style={{ fontSize: 40 }}>📜</div>
              <p style={{ marginTop: 8 }}>Belum ada riwayat battle.</p>
            </div>
          )}
          {history.map(b => {
            const won = b.winner_id === user?.id;
            return (
              <div key={b.id} className="glass" style={{
                padding: '14px 16px', marginBottom: 10, borderRadius: 12,
                borderLeft: `3px solid ${won ? '#22c55e' : b.winner_id ? '#ef4444' : '#8b7aa8'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700,
                      color: won ? '#22c55e' : b.winner_id ? '#ef4444' : '#8b7aa8' }}>
                      {won ? '🏆 MENANG' : b.winner_id ? '💀 KALAH' : '🤝 SERI'}
                    </span>
                    <div style={{ fontSize: 12, color: 'white', marginTop: 2 }}>
                      vs {b.is_ai ? `AI (${b.ai_difficulty})` : (b.player2_name || 'Unknown')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#8b7aa8' }}>
                    <div>{b.turns} turn</div>
                    <div>{new Date(b.ended_at).toLocaleDateString('id-ID')}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LEADERBOARD */}
      {tab === 'leaderboard' && (
        <div style={{ padding: '16px' }}>
          {leaderboard.map((p, i) => (
            <div key={p.id} className="glass"
              style={{ padding: '12px 16px', marginBottom: 8, borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 12,
                background: p.id === user?.id ? 'rgba(124,58,237,0.15)' : undefined }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: i < 3 ? '#1a0a2e' : '#8b7aa8',
              }}>
                {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{p.username}</div>
                <div style={{ fontSize: 10, color: '#8b7aa8' }}>{p.title}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>{p.wins}W</div>
                <div style={{ fontSize: 10, color: '#8b7aa8' }}>{p.win_rate}% win</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

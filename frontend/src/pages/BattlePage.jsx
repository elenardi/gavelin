import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { battleApi, collectionApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import BattleArena from '../components/Battle/BattleArena';

// ── tiny helpers ──────────────────────────────────────────────────
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(34,20,66,0.97)', border: '1px solid rgba(124,58,237,0.45)',
      borderRadius: 12, padding: '10px 22px', fontSize: 13, fontWeight: 600,
      color: '#e2d9f3', zIndex: 2000, whiteSpace: 'nowrap',
      boxShadow: '0 4px 24px rgba(124,58,237,0.25)',
      animation: 'slideDown .3s ease',
    }}>{msg}</div>
  );
}

const BATTLE_TYPES = [
  {
    id: 'ai',
    icon: '🤖',
    label: 'vs AI',
    desc: 'Latihan melawan kecerdasan buatan',
    color: '#7c3aed',
    glow: 'rgba(124,58,237,0.35)',
  },
  {
    id: 'pvp',
    icon: '⚔️',
    label: 'Matchmaking',
    desc: 'Temukan lawan dari seluruh penjuru',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.35)',
  },
];

const DIFFICULTIES = [
  { id: 'easy',   label: 'Mudah',  color: '#22c55e', desc: 'Cocok untuk pemula' },
  { id: 'normal', label: 'Normal', color: '#f59e0b', desc: 'Seimbang & menantang' },
  { id: 'hard',   label: 'Susah',  color: '#ef4444', desc: 'AI bermain optimal' },
];

const PVP_MODES = [
  { id: 'unranked', icon: '🎮', label: 'Unranked', desc: 'Bermain santai tanpa mempengaruhi peringkat', color: '#3b82f6' },
  { id: 'ranked',   icon: '🏆', label: 'Ranked',   desc: 'Pertahankan posisimu di papan peringkat',     color: '#f59e0b' },
];

// ── Step indicator ────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Jenis', 'Deck', 'Mulai'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '14px 0 6px' }}>
      {steps.map((s, i) => {
        const done    = i < step;
        const active  = i === step;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
                background: done ? '#7c3aed' : active ? 'linear-gradient(135deg,#4c1d95,#7c3aed)' : 'rgba(255,255,255,0.07)',
                color: done || active ? 'white' : '#4b5563',
                border: active ? '2px solid #c084fc' : done ? '2px solid #7c3aed' : '2px solid rgba(255,255,255,0.1)',
                boxShadow: active ? '0 0 12px rgba(192,132,252,0.6)' : 'none',
                transition: 'all .3s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 9, color: active ? '#c084fc' : done ? '#7c3aed' : '#4b5563', fontWeight: 700, letterSpacing: .5 }}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 48, height: 2, margin: '0 4px', marginBottom: 16, background: done ? '#7c3aed' : 'rgba(255,255,255,0.08)', transition: 'background .3s' }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function BattlePage() {
  const { user } = useAuth();

  // flow state
  const [tab,        setTab]        = useState('battle'); // battle | history | leaderboard
  const [step,       setStep]       = useState(0);        // 0=type 1=deck 2=config
  const [battleType, setBattleType] = useState(null);     // 'ai' | 'pvp'
  const [pvpMode,    setPvpMode]    = useState(null);     // 'unranked' | 'ranked'
  const [difficulty, setDifficulty] = useState('normal');
  const [decks,      setDecks]      = useState([]);
  const [selDeck,    setSelDeck]    = useState(null);

  // battle runtime
  const [battleState, setBattleState] = useState(null);
  const [battleId,    setBattleId]    = useState(null);
  const [lastLog,     setLastLog]     = useState([]);
  const [loading,     setLoading]     = useState(false);

  // misc
  const [history,     setHistory]     = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [toast,       setToast]       = useState('');
  const socketRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => { collectionApi.getDecks().then(r => setDecks(r.data.decks)); }, []);

  // Socket.IO
  useEffect(() => {
    const token  = localStorage.getItem('gavelin_token');
    const socket = io('/', { auth: { token } });
    socketRef.current = socket;

    socket.on('battle_started', ({ battleId, gameState }) => {
      setBattleId(battleId); setBattleState(gameState); setLastLog([]); setLoading(false);
    });
    socket.on('game_update',  ({ gameState, log }) => { setBattleState({ ...gameState }); if (log?.length) setLastLog([...log]); });
    socket.on('battle_ended', ({ winner, gameState }) => setBattleState(p => ({ ...p, ...gameState, winner })));
    socket.on('error',        ({ message }) => { showToast(message); setLoading(false); });

    return () => socket.disconnect();
  }, []);

  // Hide nav in battle
  useEffect(() => {
    const active = !!(battleState && !battleState.winner);
    document.body.classList.toggle('in-battle', active);
    return () => document.body.classList.remove('in-battle');
  }, [battleState]);

  const resetFlow = () => { setStep(0); setBattleType(null); setPvpMode(null); setSelDeck(null); setLoading(false); };

  const startAI = () => {
    if (!selDeck) return showToast('Pilih deck dulu!');
    setLoading(true);
    socketRef.current?.emit('start_ai_battle', { deckId: selDeck.id, difficulty });
  };

  const startPvP = async () => {
    if (!selDeck) return showToast('Pilih deck dulu!');
    try {
      setLoading(true);
      const { data } = await battleApi.pvpQueue({ deckId: selDeck.id, mode: pvpMode });
      showToast(data.message);
      setBattleId(data.battleId);
      socketRef.current?.emit('join_battle', { battleId: data.battleId });
    } catch {
      showToast('Gagal masuk antrian.');
      setLoading(false);
    }
  };

  // ── In-battle ───────────────────────────────────────────────────
  if (battleState && !battleState.winner) {
    return (
      <BattleArena
        gameState={battleState}
        lastLog={lastLog}
        socket={socketRef.current}
        battleId={battleId}
        onEnd={() => { setBattleState(null); setBattleId(null); }}
      />
    );
  }

  // ── Battle result ───────────────────────────────────────────────
  if (battleState?.winner) {
    const won = battleState.winner === 'player1';
    return (
      <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Toast msg={toast}/>
        <div style={{ textAlign:'center', padding:32 }}>
          <div style={{ fontSize:72, marginBottom:12, filter: won?'drop-shadow(0 0 20px #f59e0b)':'none' }}>{won?'🏆':'💀'}</div>
          <h2 style={{ fontSize:26, fontWeight:900, color:won?'#f59e0b':'#ef4444', marginBottom:6 }}>
            {won?'KEMENANGAN!':'KEKALAHAN'}
          </h2>
          <p style={{ color:'#8b7aa8', fontSize:13, marginBottom:28 }}>
            {won?'Luar biasa! Musuhmu berhasil dikalahkan!':'Lebih baik lain kali, petualang!'}
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
            <button className="btn-primary" onClick={() => { setBattleState(null); setBattleId(null); setStep(2); }}>
              ⚔️ Ulangi
            </button>
            <button onClick={() => { setBattleState(null); setBattleId(null); resetFlow(); }}
              style={{ padding:'12px 20px', borderRadius:12, border:'1px solid rgba(124,58,237,0.4)', background:'transparent', color:'#c084fc', cursor:'pointer', fontSize:13 }}>
              Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Tabs header ────────────────────────────────────────────────
  const TABS = [
    { id:'battle',      label:'⚔️ Battle' },
    { id:'history',     label:'📜 History' },
    { id:'leaderboard', label:'🏆 Rank' },
  ];

  const handleTab = (id) => {
    if (id === 'history')     { battleApi.getHistory().then(r => setHistory(r.data.history)); }
    if (id === 'leaderboard') { battleApi.getLeaderboard().then(r => setLeaderboard(r.data.leaderboard)); }
    setTab(id);
  };

  return (
    <div className="page">
      <Toast msg={toast}/>

      {/* ── Tab bar ─────────────────────────────────────── */}
      <div style={{ display:'flex', background:'rgba(13,5,32,0.95)', borderBottom:'1px solid rgba(124,58,237,0.18)', position:'sticky', top:0, zIndex:10 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTab(t.id)}
            style={{ flex:1, padding:'14px 0', border:'none', background:'transparent',
              color: tab===t.id ? '#c084fc' : '#6b5f8a', fontWeight:700, fontSize:12,
              borderBottom:`2px solid ${tab===t.id?'#7c3aed':'transparent'}`,
              cursor:'pointer', transition:'all .2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BATTLE TAB ──────────────────────────────────── */}
      {tab === 'battle' && (
        <div style={{ padding:'0 16px 32px' }}>
          <StepBar step={step}/>

          {/* STEP 0 — pilih jenis battle */}
          {step === 0 && (
            <div style={{ marginTop:8 }}>
              <p style={{ color:'#8b7aa8', fontSize:12, textAlign:'center', marginBottom:20 }}>Pilih mode pertarunganmu</p>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {BATTLE_TYPES.map(bt => (
                  <button key={bt.id}
                    onClick={() => { setBattleType(bt.id); setPvpMode(null); setStep(1); }}
                    style={{
                      width:'100%', padding:'20px', borderRadius:18, border:`1.5px solid ${bt.color}44`,
                      background:`linear-gradient(135deg, ${bt.color}11, rgba(13,5,32,0.6))`,
                      cursor:'pointer', textAlign:'left', transition:'all .2s',
                      boxShadow:`0 4px 24px ${bt.glow}`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.border=`1.5px solid ${bt.color}99`}
                    onMouseLeave={e => e.currentTarget.style.border=`1.5px solid ${bt.color}44`}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                      <div style={{ fontSize:38, lineHeight:1 }}>{bt.icon}</div>
                      <div>
                        <div style={{ fontSize:18, fontWeight:800, color:'white', marginBottom:4 }}>{bt.label}</div>
                        <div style={{ fontSize:12, color:'#8b7aa8' }}>{bt.desc}</div>
                      </div>
                      <div style={{ marginLeft:'auto', color:`${bt.color}`, fontSize:20 }}>›</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1 — pilih deck */}
          {step === 1 && (
            <div style={{ marginTop:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <button onClick={() => setStep(0)}
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#8b7aa8', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12 }}>
                  ← Kembali
                </button>
                <span style={{ fontSize:13, color:'#c084fc', fontWeight:700 }}>Pilih Deck</span>
              </div>

              {decks.length === 0 ? (
                <div className="glass" style={{ padding:24, textAlign:'center', borderRadius:16 }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>🃏</div>
                  <p style={{ color:'#8b7aa8', fontSize:13 }}>Belum ada deck. Buat deck di halaman Koleksi dulu!</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {decks.map(deck => {
                    const selected = selDeck?.id === deck.id;
                    return (
                      <button key={deck.id}
                        onClick={() => setSelDeck(deck)}
                        style={{
                          width:'100%', padding:'14px 16px', borderRadius:14, border:`2px solid ${selected?'#f59e0b':'rgba(124,58,237,0.2)'}`,
                          background: selected?'rgba(245,158,11,0.08)':'rgba(34,20,66,0.5)',
                          cursor:'pointer', textAlign:'left', transition:'all .2s',
                          display:'flex', alignItems:'center', gap:14,
                        }}>
                        <div style={{ width:42, height:42, borderRadius:10, background:`${selected?'rgba(245,158,11,0.2)':'rgba(124,58,237,0.15)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>📋</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:'white' }}>{deck.name}</div>
                          <div style={{ fontSize:11, color:'#8b7aa8', marginTop:2 }}>{deck.cards?.length || 0} kartu</div>
                        </div>
                        {selected && <div style={{ color:'#f59e0b', fontSize:18 }}>✓</div>}
                      </button>
                    );
                  })}
                </div>
              )}

              {selDeck && (
                <button className="btn-primary" onClick={() => setStep(2)}
                  style={{ width:'100%', marginTop:20, fontSize:14 }}>
                  Lanjut →
                </button>
              )}
            </div>
          )}

          {/* STEP 2 — konfigurasi & mulai */}
          {step === 2 && (
            <div style={{ marginTop:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <button onClick={() => setStep(1)}
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#8b7aa8', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12 }}>
                  ← Kembali
                </button>
                <span style={{ fontSize:13, color:'#c084fc', fontWeight:700 }}>
                  {battleType==='ai'?'Konfigurasi AI':'Pilih Mode'}
                </span>
              </div>

              {/* Deck summary */}
              <div className="glass" style={{ padding:'12px 16px', borderRadius:12, marginBottom:16, display:'flex', alignItems:'center', gap:12, border:'1px solid rgba(245,158,11,0.25)' }}>
                <div style={{ fontSize:22 }}>📋</div>
                <div>
                  <div style={{ fontSize:12, color:'#8b7aa8' }}>Deck dipilih</div>
                  <div style={{ fontSize:14, fontWeight:700, color:'white' }}>{selDeck?.name}</div>
                </div>
                <button onClick={() => setStep(1)}
                  style={{ marginLeft:'auto', fontSize:11, color:'#7c3aed', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                  Ganti
                </button>
              </div>

              {/* AI: pilih difficulty */}
              {battleType === 'ai' && (
                <>
                  <p style={{ fontSize:12, color:'#8b7aa8', marginBottom:10 }}>Tingkat kesulitan AI</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                    {DIFFICULTIES.map(d => {
                      const sel = difficulty === d.id;
                      return (
                        <button key={d.id} onClick={() => setDifficulty(d.id)}
                          style={{
                            width:'100%', padding:'12px 16px', borderRadius:12,
                            border:`2px solid ${sel ? d.color : 'rgba(255,255,255,0.08)'}`,
                            background: sel ? `${d.color}15` : 'rgba(0,0,0,0.2)',
                            cursor:'pointer', display:'flex', alignItems:'center', gap:12, transition:'all .2s',
                          }}>
                          <div style={{ width:10, height:10, borderRadius:'50%', background:d.color, flexShrink:0, boxShadow:sel?`0 0 8px ${d.color}`:undefined }}/>
                          <div style={{ textAlign:'left' }}>
                            <div style={{ fontSize:13, fontWeight:700, color: sel?d.color:'white' }}>{d.label}</div>
                            <div style={{ fontSize:11, color:'#6b5f8a' }}>{d.desc}</div>
                          </div>
                          {sel && <div style={{ marginLeft:'auto', color:d.color, fontSize:16 }}>✓</div>}
                        </button>
                      );
                    })}
                  </div>
                  <button className="btn-primary" style={{ width:'100%', fontSize:15 }}
                    disabled={loading} onClick={startAI}>
                    {loading ? '⏳ Memulai...' : '⚔️ Mulai Battle vs AI'}
                  </button>
                </>
              )}

              {/* PvP: pilih unranked/ranked */}
              {battleType === 'pvp' && (
                <>
                  <p style={{ fontSize:12, color:'#8b7aa8', marginBottom:10 }}>Pilih mode matchmaking</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                    {PVP_MODES.map(m => {
                      const sel = pvpMode === m.id;
                      return (
                        <button key={m.id} onClick={() => setPvpMode(m.id)}
                          style={{
                            width:'100%', padding:'16px', borderRadius:14,
                            border:`2px solid ${sel ? m.color : 'rgba(255,255,255,0.08)'}`,
                            background: sel ? `${m.color}15` : 'rgba(0,0,0,0.2)',
                            cursor:'pointer', display:'flex', alignItems:'center', gap:14, transition:'all .2s',
                          }}>
                          <div style={{ fontSize:28 }}>{m.icon}</div>
                          <div style={{ textAlign:'left' }}>
                            <div style={{ fontSize:14, fontWeight:700, color: sel?m.color:'white' }}>{m.label}</div>
                            <div style={{ fontSize:11, color:'#6b5f8a', marginTop:2 }}>{m.desc}</div>
                          </div>
                          {sel && <div style={{ marginLeft:'auto', color:m.color, fontSize:18 }}>✓</div>}
                        </button>
                      );
                    })}
                  </div>
                  <button className="btn-primary" style={{ width:'100%', fontSize:15, background: pvpMode?undefined:'rgba(100,100,100,0.3)' }}
                    disabled={!pvpMode || loading} onClick={startPvP}>
                    {loading ? '⏳ Mencari lawan...' : '🔍 Mulai Matchmaking'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────── */}
      {tab === 'history' && (
        <div style={{ padding:16 }}>
          {history.length === 0 ? (
            <div style={{ textAlign:'center', color:'#8b7aa8', padding:'60px 0' }}>
              <div style={{ fontSize:40 }}>📜</div>
              <p style={{ marginTop:8, fontSize:13 }}>Belum ada riwayat battle.</p>
            </div>
          ) : history.map(b => {
            const won = b.winner_id === user?.id;
            return (
              <div key={b.id} className="glass" style={{
                padding:'14px 16px', marginBottom:10, borderRadius:14,
                borderLeft:`3px solid ${won?'#22c55e':b.winner_id?'#ef4444':'#8b7aa8'}`,
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <span style={{ fontSize:11, fontWeight:800, color:won?'#22c55e':b.winner_id?'#ef4444':'#8b7aa8' }}>
                      {won?'🏆 MENANG':b.winner_id?'💀 KALAH':'🤝 SERI'}
                    </span>
                    <div style={{ fontSize:13, color:'white', marginTop:3 }}>
                      vs {b.is_ai ? `AI (${b.ai_difficulty})` : (b.player2_name||'Unknown')}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', fontSize:11, color:'#8b7aa8' }}>
                    <div>{b.turns} turn</div>
                    <div>{new Date(b.ended_at).toLocaleDateString('id-ID')}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LEADERBOARD TAB ─────────────────────────────── */}
      {tab === 'leaderboard' && (
        <div style={{ padding:16 }}>
          {leaderboard.map((p, i) => (
            <div key={p.id} className="glass"
              style={{ padding:'12px 16px', marginBottom:8, borderRadius:14,
                display:'flex', alignItems:'center', gap:12,
                background: p.id===user?.id?'rgba(124,58,237,0.15)':undefined,
                border: p.id===user?.id?'1px solid rgba(124,58,237,0.4)':'1px solid rgba(124,58,237,0.15)',
              }}>
              <div style={{
                width:32, height:32, borderRadius:'50%', flexShrink:0,
                background: i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#b45309':'rgba(255,255,255,0.08)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:13, fontWeight:800, color: i<3?'#1a0a2e':'#8b7aa8',
              }}>
                {i<3?['🥇','🥈','🥉'][i]:i+1}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'white' }}>{p.username}</div>
                <div style={{ fontSize:10, color:'#8b7aa8' }}>{p.title}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#22c55e' }}>{p.wins}W</div>
                <div style={{ fontSize:10, color:'#8b7aa8' }}>{p.win_rate}% win</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

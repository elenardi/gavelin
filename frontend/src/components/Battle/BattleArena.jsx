import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import CardRenderer from '../Card/CardRenderer';

// Semua kartu battle pakai xs (68×96). Detail ditampilkan via hold modal (md).
const CW = 68;
const CH = 96;

// Hitung step fan agar kartu tidak overflow container
function fanStep(count, maxW, minVisible = 32) {
  if (count <= 1) return 0;
  const ideal = (maxW - CW) / (count - 1);
  return Math.max(minVisible, Math.min(CW + 12, ideal));
}

const RARITY_BG = {
  legendary: 'linear-gradient(135deg,#78350f,#b45309)',
  epic:      'linear-gradient(135deg,#4c1d95,#7c3aed)',
  rare:      'linear-gradient(135deg,#1e3a5f,#2563eb)',
  uncommon:  'linear-gradient(135deg,#14532d,#16a34a)',
  common:    'linear-gradient(135deg,#1f2937,#374151)',
};
const RARITY_BORDER = {
  legendary: '#f59e0b', epic: '#a855f7', rare: '#3b82f6', uncommon: '#22c55e', common: '#94a3b8',
};
const RARITY_GLOW = {
  legendary: 'rgba(245,158,11,0.7)', epic: 'rgba(168,85,247,0.6)', rare: 'rgba(59,130,246,0.5)',
  uncommon:  'rgba(34,197,94,0.4)',  common: 'rgba(148,163,184,0.3)',
};

// ── HpBar ────────────────────────────────────────────────────────
function HpBar({ current, max = 100, color = '#22c55e' }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const c   = pct > 50 ? color : pct > 25 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${pct}%`, borderRadius:2, background:`linear-gradient(90deg,${c}88,${c})`, transition:'width .5s', boxShadow:`0 0 6px ${c}88` }} />
    </div>
  );
}

// ── DeckPile ─────────────────────────────────────────────────────
function DeckPile({ count, red }) {
  const bc = red ? 'rgba(239,68,68,0.5)' : 'rgba(169,118,47,0.5)';
  const bg = red ? 'linear-gradient(135deg,#7f1d1d,#170f06)' : 'linear-gradient(135deg,#4a3218,#2b1d10)';
  return (
    <div style={{ position:'relative', width:38, height:52, flexShrink:0 }}>
      {[2,1,0].map(i=>(
        <div key={i} style={{ position:'absolute', width:30, height:42, borderRadius:5, background:bg, border:`1px solid ${bc}`, top:i*3, left:i*2, opacity:i===0?1:0.55, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>{i===0&&'🎲'}</div>
      ))}
      {count>0&&<div style={{ position:'absolute', bottom:-4, right:-4, background:red?'#dc2626':'#a9762f', borderRadius:10, fontSize:8, fontWeight:800, color:'white', padding:'1px 4px', minWidth:14, textAlign:'center', border:'1px solid #150e07' }}>{count}</div>}
    </div>
  );
}

// ── DiscardPile ──────────────────────────────────────────────────
function DiscardPile({ cards=[], red, onClick }) {
  const n    = cards.length;
  const top  = cards[n - 1];   // kartu terakhir yang di-discard
  const ec   = red ? 'rgba(239,68,68,0.2)' : 'rgba(100,100,100,0.25)';
  const bbg  = red ? '#dc2626' : '#4b5563';

  // Warna fallback per rarity untuk kartu yang tidak punya gambar
  const rarityBg = {
    legendary: 'linear-gradient(135deg,#78350f,#f59e0b)',
    epic:      'linear-gradient(135deg,#4c1d95,#a855f7)',
    rare:      'linear-gradient(135deg,#1e3a5f,#3b82f6)',
    uncommon:  'linear-gradient(135deg,#14532d,#22c55e)',
    common:    'linear-gradient(135deg,#1f2937,#4b5563)',
  };

  const cardStyle = (idx, total) => ({
    position: 'absolute',
    width: 30, height: 42, borderRadius: 5,
    top: idx, left: idx,
    transform: `rotate(${(idx - Math.floor(total/2)) * 5}deg)`,
    overflow: 'hidden',
    border: `1px solid ${red ? 'rgba(239,68,68,0.35)' : 'rgba(100,100,100,0.3)'}`,
  });

  return (
    <div onClick={n>0 ? onClick : undefined}
      style={{ position:'relative', width:38, height:52, flexShrink:0, cursor:n>0?'pointer':'default' }}
    >
      {n === 0 ? (
        <div style={{ width:30, height:42, borderRadius:5, border:`1px dashed ${ec}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:ec }}>🗑</div>
      ) : (
        <>
          {/* Shadow cards di bawah */}
          {n >= 3 && (
            <div style={{ ...cardStyle(0, 3), background:'rgba(30,30,30,0.7)', opacity:0.35 }}/>
          )}
          {n >= 2 && (
            <div style={{ ...cardStyle(1, 3), background:'rgba(40,40,40,0.7)', opacity:0.55 }}/>
          )}
          {/* Kartu teratas — tampilkan gambar */}
          <div style={{ ...cardStyle(Math.min(n-1,2), 3), opacity:1 }}>
            {top?.image_url ? (
              <img src={top.image_url} alt={top.name}
                style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
              />
            ) : null}
            <div style={{
              width:'100%', height:'100%', display: top?.image_url ? 'none' : 'flex',
              alignItems:'center', justifyContent:'center', fontSize:8, color:'rgba(255,255,255,0.5)',
              background: rarityBg[top?.rarity] || rarityBg.common,
            }}>
              {top?.name?.slice(0,4) || '?'}
            </div>
          </div>
          {/* Badge jumlah */}
          <div style={{ position:'absolute', bottom:-4, right:-4, background:bbg, borderRadius:10, fontSize:8, fontWeight:800, color:'white', padding:'1px 4px', minWidth:14, textAlign:'center', border:'1px solid #150e07' }}>{n}</div>
        </>
      )}
    </div>
  );
}

// ── PileColumn ───────────────────────────────────────────────────
function PileColumn({ deckCount, discard, red, onDiscard }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', alignSelf:'stretch', flexShrink:0, width:44, padding:'6px 0' }}>
      <DeckPile count={deckCount} red={red} />
      <DiscardPile cards={discard} red={red} onClick={onDiscard} />
    </div>
  );
}

// ── DiscardModal ─────────────────────────────────────────────────
function DiscardModal({ cards, title, onClose }) {
  const [selCard, setSelCard] = useState(null);

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
        <div onClick={e=>e.stopPropagation()} className="glass" style={{ width:'100%', maxWidth:460, borderRadius:20, maxHeight:'82vh', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px 10px', flexShrink:0, borderBottom:'1px solid rgba(169,118,47,0.2)' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'white' }}>{title}</div>
              <div style={{ fontSize:11, color:'#a89a7c', marginTop:1 }}>{cards.length} kartu — ketuk kartu untuk detail</div>
            </div>
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', color:'#a89a7c', borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>
          <div style={{ overflowY:'auto', padding:'14px', display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
            {cards.map((c,i)=>(
              <div key={i} onClick={()=>setSelCard(c)} style={{ cursor:'pointer', borderRadius:9, transition:'transform .15s, box-shadow .15s' }}
                onPointerEnter={e=>{e.currentTarget.style.transform='scale(1.07)';e.currentTarget.style.boxShadow='0 0 12px rgba(169,118,47,0.6)';}}
                onPointerLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';}}>
                <CardRenderer card={c} size="sm"/>
              </div>
            ))}
            {!cards.length&&<div style={{ padding:'40px 0', color:'#a89a7c', fontSize:12 }}>Belum ada kartu buangan</div>}
          </div>
        </div>
      </div>
      {selCard && <CardDetailModal card={selCard} onClose={()=>setSelCard(null)} zIndex={500}/>}
    </>
  );
}

// ── CardDetailModal ──────────────────────────────────────────────
function CardDetailModal({ card, onClose, zIndex = 300 }) {
  if (!card) return null;
  // base_hp/base_attack/base_defense disimpan backend saat apply level bonus.
  // Jika ada → tampilkan sebagai "base + bonus", jika tidak → tampilkan stat langsung.
  const hasBonus = !!(card.base_hp);
  const statRows = card.card_type==='character' ? [
    { l:'HP',  icon:'❤️', c:'#22c55e', val: hasBonus ? card.base_hp      : card.hp,     bonus: hasBonus ? card.hp      - card.base_hp      : null },
    { l:'ATK', icon:'⚔️', c:'#ef4444', val: hasBonus ? card.base_attack  : card.attack,  bonus: hasBonus ? card.attack  - card.base_attack  : null },
    { l:'DEF', icon:'🛡', c:'#3b82f6', val: hasBonus ? card.base_defense : card.defense, bonus: hasBonus ? card.defense - card.base_defense : null },
  ] : [];

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex, display:'flex', alignItems:'center', justifyContent:'center', padding:14 }}>
      <div onClick={e=>e.stopPropagation()} className="glass" style={{ width:'100%', maxWidth:380, borderRadius:20, maxHeight:'88vh', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'10px 14px 0', display:'flex', justifyContent:'flex-end', flexShrink:0 }}>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', color:'#a89a7c', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>
        <div style={{ overflowY:'auto', padding:'6px 16px 16px', flex:1 }}>
          <div style={{ display:'flex', gap:12, marginBottom:12, alignItems:'flex-start' }}>
            <div style={{ flexShrink:0 }}><CardRenderer card={card} size="md"/></div>
            <div style={{ flex:1, minWidth:0 }}>
              <h2 style={{ fontSize:14, fontWeight:700, color:'white', marginBottom:5 }}>{card.name}</h2>
              <div style={{ display:'flex', gap:5, alignItems:'center', marginBottom:7, flexWrap:'wrap' }}>
                <span className={`rarity-badge rarity-${card.rarity}`}>{card.rarity}</span>
                <span style={{ fontSize:10, color:'#a89a7c', textTransform:'capitalize' }}>{card.card_type}</span>
                {card.class&&card.class!=='any'&&<span style={{ fontSize:10, background:'rgba(169,118,47,0.18)', color:'#f0c869', borderRadius:4, padding:'1px 5px', fontWeight:600, textTransform:'capitalize' }}>{card.class}</span>}
                {(card.current_level||1)>1&&<span style={{ fontSize:10, background:'rgba(245,158,11,0.2)', color:'#f59e0b', borderRadius:4, padding:'1px 5px', fontWeight:700 }}>Lv.{card.current_level}</span>}
              </div>
              {card.card_type==='character' && card.currentHp !== undefined && (
                <div style={{ marginBottom:6 }}>
                  <div style={{ fontSize:9, color:'#a89a7c', marginBottom:2 }}>HP Saat Ini</div>
                  <div style={{ height:5, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.max(0,card.currentHp/(hasBonus?card.hp:card.hp)*100)}%`, background:'linear-gradient(90deg,#15803d,#22c55e)', borderRadius:3, transition:'width .4s' }}/>
                  </div>
                  <div style={{ fontSize:9, color:'#22c55e', marginTop:1 }}>{card.currentHp} / {card.hp}</div>
                </div>
              )}
              {statRows.length>0&&(
                <div style={{ display:'flex', gap:4, marginBottom:7 }}>
                  {statRows.map(s=>(
                    <div key={s.l} style={{ flex:1, background:`${s.c}18`, borderRadius:7, padding:'4px 2px', textAlign:'center' }}>
                      <div style={{ fontSize:9, color:s.c }}>{s.icon}</div>
                      <div style={{ fontSize:12, fontWeight:800, color:s.c }}>
                        {s.val}
                        {s.bonus>0&&<span style={{ fontSize:9, color:'#22c55e' }}>+{s.bonus}</span>}
                      </div>
                      <div style={{ fontSize:7, color:`${s.c}99` }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize:10, color:'#f0c869' }}>⚡ Biaya: <strong>{card.energy_cost}</strong></div>
            </div>
          </div>
          {card.special_name&&(
            <div style={{ background:'rgba(169,118,47,0.14)', borderRadius:10, padding:'8px 10px', borderLeft:'3px solid #a9762f' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#f0c869', marginBottom:2 }}>{card.special_name}</div>
              <div style={{ fontSize:10, color:'#c9a86a', lineHeight:1.5 }}>{card.special_desc}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── FanHand — fan tanpa scroll ───────────────────────────────────
const FACEDOWN = { rarity:'common', card_type:'character', name:'?', hp:0, attack:0, defense:0, energy_cost:0 };

function FanHand({ cards, selectedId, newCardIdx, isMyTurn, energy, onPointerDown, onPointerUp, flipped=false, isAI=false }) {
  const ref = useRef(null);
  const [availW, setAvailW] = useState(300);
  useEffect(()=>{
    if(!ref.current) return;
    const obs=new ResizeObserver(([e])=>setAvailW(e.contentRect.width));
    obs.observe(ref.current);
    return()=>obs.disconnect();
  },[]);

  const n     = cards.length;
  const step  = fanStep(n, Math.max(availW-8, CW+4));
  const total = n===0 ? 0 : CW+(n-1)*step;

  return (
    <div ref={ref} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', minWidth:0 }}>
      {n===0
        ? <span style={{ fontSize:10, color:flipped?'rgba(239,68,68,0.25)':'rgba(169,118,47,0.35)' }}>—</span>
        : <div style={{ position:'relative', width:total, height:CH+20, flexShrink:0 }}>
            {cards.map((card,i)=>{
              const sel  = !flipped&&selectedId===card.id;
              const play = !flipped&&isMyTurn&&card.energy_cost<=energy;
              return (
                <div key={card.id??i}
                  className={[
                    i===newCardIdx ? (isAI ? 'card-deal-in-ai' : 'card-deal-in') : '',
                    play ? 'card-playable-glow' : '',
                  ].filter(Boolean).join(' ') || undefined}
                  style={{ position:'absolute', left:i*step, bottom:sel?16:0, zIndex:sel?n+10:i+1, transition:'bottom .15s', touchAction:'none', cursor:!flipped&&isMyTurn?'grab':'default', opacity:!flipped&&isMyTurn&&!play?0.45:1 }}
                  onPointerDown={!flipped?(e=>onPointerDown(e,card)):undefined}
                  onPointerUp={!flipped?(()=>onPointerUp(card)):undefined}
                >
                  <CardRenderer card={flipped?FACEDOWN:card} size="xs" faceDown={flipped} selected={sel} animated={!flipped}/>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

// ── FieldCard — satu kartu di field dengan hold-to-detail ────────
function FieldCard({ card, isEnemy, isAttacker, canAttack, attackerActive, onClick, onHold }) {
  const holdT = useRef(null);
  const holdF = useRef(false);

  const startHold = (e) => {
    holdF.current = false;
    holdT.current = setTimeout(() => { holdF.current = true; onHold(card); }, 480);
  };
  const cancelHold = () => { clearTimeout(holdT.current); };
  const handleClick = () => {
    if (holdF.current) return;
    cancelHold();
    onClick(card);
  };

  return (
    <div
      onPointerDown={startHold}
      onPointerUp={handleClick}
      onPointerLeave={cancelHold}
      onContextMenu={e => { e.preventDefault(); onHold(card); }}
      className={isEnemy&&attackerActive?'card-target-glow':undefined}
      style={{
        borderRadius:9, touchAction:'none',
        boxShadow: isAttacker ? '0 0 0 2px #f59e0b,0 0 14px rgba(245,158,11,0.8)' : canAttack ? '0 0 8px rgba(34,197,94,0.4)' : undefined,
        cursor: (isEnemy&&attackerActive)||(!isEnemy) ? 'pointer' : 'default',
        opacity: card.status === 'stealth' ? 0.45 : !isEnemy&&card.hasAttacked ? 0.55 : 1,
        filter: card.status === 'stealth' ? 'brightness(0.7) saturate(0.4) blur(0.5px)' : !isEnemy&&card.hasAttacked ? 'grayscale(.4)' : undefined,
        transition: 'opacity .3s',
      }}
    >
      <CardRenderer card={card} size="xs" selected={isAttacker}/>
    </div>
  );
}

// ── FieldRow ─────────────────────────────────────────────────────
function FieldRow({ cards, isEnemy, attackerCard, isMyTurn, onPlayer, onEnemy, isDragOver, onDirectAttack, onCardHold, newCardIdx=null, damageHits=[] }) {
  const ref = useRef(null);
  const [availW, setAvailW] = useState(320);
  useEffect(()=>{
    if(!ref.current) return;
    const obs=new ResizeObserver(([e])=>setAvailW(e.contentRect.width));
    obs.observe(ref.current);
    return()=>obs.disconnect();
  },[]);

  const n     = cards.length;
  const step  = fanStep(n, Math.max(availW-24, CW+4), 40);
  const total = n===0?0:CW+(n-1)*step;

  return (
    <div ref={ref} onClick={isEnemy&&attackerCard&&n===0?onDirectAttack:undefined}
      style={{
        flex:1, display:'flex', alignItems:'center', justifyContent:'center',
        padding:'0 10px', position:'relative', minHeight: CH+28,
        background: isEnemy?(attackerCard?'rgba(239,68,68,0.08)':'rgba(239,68,68,0.03)'):(isDragOver?'rgba(34,197,94,0.1)':'rgba(169,118,47,0.03)'),
        borderTop:isEnemy?undefined:'1px solid rgba(169,118,47,0.08)',
        borderBottom:isEnemy?'1px solid rgba(239,68,68,0.1)':undefined,
        transition:'background .2s', cursor:isEnemy&&attackerCard&&n===0?'crosshair':'default',
      }}
    >
      {/* Label zona */}
      <div style={{ position:'absolute', ...(isEnemy?{top:4}:{bottom:4}), left:10, fontSize:7, fontWeight:700, letterSpacing:1.2, textTransform:'uppercase', color:isEnemy?'rgba(239,68,68,0.28)':'rgba(169,118,47,0.28)', pointerEvents:'none' }}>
        {isEnemy?'Zona Musuh':'Zona Kamu'}
      </div>

      {isEnemy&&attackerCard&&n===0&&(
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#ef4444', animation:'aiThink 1s ease-in-out infinite', pointerEvents:'none' }}>⚔️ Serang Langsung</div>
      )}

      {n===0&&!(isEnemy&&attackerCard)
        ? <div style={{ border:`1px dashed ${isEnemy?'rgba(239,68,68,0.12)':isDragOver?'rgba(34,197,94,0.55)':'rgba(169,118,47,0.18)'}`, borderRadius:8, padding:'7px 20px', color:isEnemy?'rgba(239,68,68,0.22)':isDragOver?'rgba(34,197,94,0.7)':'rgba(169,118,47,0.28)', fontSize:9, transition:'all .2s' }}>
            {!isEnemy&&isDragOver?'✦ Lepaskan':!isEnemy&&isMyTurn?'Seret kartu':'kosong'}
          </div>
        : <div style={{ position:'relative', width:total, height:CH+22, flexShrink:0 }}>
            {cards.map((card,i)=>{
              const isAtk = !isEnemy&&attackerCard?.id===card.id;
              const canAtk= !isEnemy&&isMyTurn&&!card.hasAttacked;
              return (
                <div key={i}
                  className={i===newCardIdx ? 'card-play-to-field' : undefined}
                  style={{ position:'absolute', left:i*step, bottom:0, zIndex:i+1 }}
                >
                  <FieldCard
                    card={card} isEnemy={isEnemy} isAttacker={isAtk} canAttack={canAtk}
                    attackerActive={!!attackerCard}
                    onClick={isEnemy ? onEnemy : onPlayer}
                    onHold={onCardHold}
                  />
                  {/* HP badge */}
                  <div style={{ position:'absolute', top:-8, left:'50%', transform:'translateX(-50%)', background:isEnemy?'linear-gradient(90deg,#b91c1c,#ef4444)':'linear-gradient(90deg,#15803d,#22c55e)', borderRadius:5, padding:'1px 4px', fontSize:8, fontWeight:800, color:'white', whiteSpace:'nowrap', pointerEvents:'none' }}>
                    ❤️{card.currentHp}
                  </div>
                  {/* Stealth badge */}
                  {card.status==='stealth'&&(
                    <div style={{ position:'absolute', top:-8, left:'50%', transform:'translateX(-50%)', borderRadius:4, padding:'1px 5px', fontSize:7, fontWeight:700, whiteSpace:'nowrap', background:'rgba(138,90,43,0.9)', color:'white', pointerEvents:'none' }}>👻 STEALTH</div>
                  )}
                  {/* Status badge player */}
                  {!isEnemy&&(
                    <div style={{ position:'absolute', bottom:-8, left:'50%', transform:'translateX(-50%)', borderRadius:4, padding:'1px 4px', fontSize:7, fontWeight:700, whiteSpace:'nowrap', background:card.hasAttacked?'rgba(60,60,60,0.85)':canAtk?'rgba(34,197,94,0.85)':'transparent', color:card.hasAttacked?'#9ca3af':'white', pointerEvents:'none' }}>
                      {card.hasAttacked?'✓':canAtk?'⚔️':''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      }

      {!isEnemy&&isDragOver&&n>0&&(
        <div style={{ position:'absolute', inset:0, border:'2px solid rgba(34,197,94,0.7)', background:'rgba(34,197,94,0.07)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#22c55e', fontWeight:700, pointerEvents:'none', borderRadius:4 }}>✦ Lepaskan di sini</div>
      )}

      {/* Floating damage numbers */}
      {damageHits.map(hit => (
        <span key={hit.id} className="dmg-float"
          style={{ left:`${hit.x}%`, [isEnemy?'bottom':'top']:'30%', color: isEnemy?'#fca5a5':'#f87171' }}>
          -{hit.damage}
        </span>
      ))}
    </div>
  );
}

// ── BattleArena ──────────────────────────────────────────────────
export default function BattleArena({ gameState, lastLog=[], socket, battleId, onEnd }) {
  const canvasRef   = useRef(null);
  const fieldRef    = useRef(null);
  const prevDrawTick   = useRef(0);
  const prevAiDrawTick = useRef(0);
  const prevP1Fld   = useRef([]);
  const prevP2Fld   = useRef([]);
  const holdTimer   = useRef(null);
  const holdStartXY = useRef({x:0,y:0});
  const holdFired   = useRef(false);

  const [gs, setGs]               = useState(gameState);
  const [selCard, setSelCard]     = useState(null);
  const [atkCard, setAtkCard]     = useState(null);
  const [detailCard, setDetail]   = useState(null);
  const [newIdx, setNewIdx]           = useState(null);
  const [newAiIdx, setNewAiIdx]       = useState(null);
  const [newAiFieldIdx, setNewAiFieldIdx] = useState(null);
  const [revealedCard, setRevealedCard] = useState(null);
  const [p1FieldHits, setP1FieldHits] = useState([]); // damage numbers di zona player
  const [p2FieldHits, setP2FieldHits] = useState([]); // damage numbers di zona AI
  const [p1HpFlash,   setP1HpFlash]   = useState(false);
  const [p2HpFlash,   setP2HpFlash]   = useState(false);
  const prevLogLen = useRef(0);
  const [dragCard, setDrag]       = useState(null);
  const [dragPos, setDragPos]     = useState({x:0,y:0});
  const [overField, setOverField] = useState(false);
  const [p1Dis, setP1Dis]         = useState([]);
  const [p2Dis, setP2Dis]         = useState([]);
  const [disModal, setDisModal]   = useState(null);
  const [surrenderConfirm, setSurrenderConfirm] = useState(false);

  // Sync state
  useEffect(()=>{
    if(!gameState) return;
    const timers = [];
    // Kartu karakter yang mati dari field → tambah ke discard lokal
    // (spell/item/trap/location sudah dihandle backend via gameState.*.discard)
    const gone1 = prevP1Fld.current.filter(c => !gameState.player1?.field?.some(f=>f.id===c.id));
    const gone2 = prevP2Fld.current.filter(c => !gameState.player2?.field?.some(f=>f.id===c.id));
    if (gone1.length || gone2.length) {
      const backendP1 = gameState.player1?.discard ?? [];
      const backendP2 = gameState.player2?.discard ?? [];
      if (gone1.length) setP1Dis([...backendP1, ...gone1]);
      if (gone2.length) setP2Dis([...backendP2, ...gone2]);
    }

    // Deteksi kartu baru di field AI
    const prevP2Ids = new Set(prevP2Fld.current.map(c=>c.id));
    const p2Field   = gameState.player2?.field ?? [];
    const newInP2   = p2Field.findIndex(c => !prevP2Ids.has(c.id));
    if (newInP2 !== -1) {
      setNewAiFieldIdx(newInP2);
      timers.push(setTimeout(() => setNewAiFieldIdx(null), 600));
    }

    prevP1Fld.current = gameState.player1?.field ?? [];
    prevP2Fld.current = gameState.player2?.field ?? [];

    // Sync discard pile dari backend (mencakup spell/item/trap/location)
    if (gameState.player1?.discard) setP1Dis(gameState.player1.discard);
    if (gameState.player2?.discard) setP2Dis(gameState.player2.discard);

    // Reveal (Torch) — tetap dari accumulated log
    const accLog = gameState.log ?? [];
    const newAcc = accLog.slice(prevLogLen.current);
    prevLogLen.current = accLog.length;
    const revealEntry = newAcc.findLast?.(e => e.action === 'reveal') ?? newAcc.filter(e => e.action === 'reveal').pop();
    if (revealEntry) {
      setRevealedCard(revealEntry.revealed);
      timers.push(setTimeout(() => setRevealedCard(null), 2800));
    }
    const tick   = gameState.player1?.drawTick ?? 0;
    const aiTick = gameState.player2?.drawTick ?? 0;

    if (tick > prevDrawTick.current) {
      const idx = (gameState.player1?.hand?.length ?? 1) - 1;
      setNewIdx(idx);
      timers.push(setTimeout(() => setNewIdx(null), 650));
    }
    if (aiTick > prevAiDrawTick.current) {
      const idx = (gameState.player2?.hand?.length ?? 1) - 1;
      setNewAiIdx(idx);
      timers.push(setTimeout(() => setNewAiIdx(null), 650));
    }

    prevDrawTick.current   = tick;
    prevAiDrawTick.current = aiTick;
    setGs(gameState);
    return () => timers.forEach(clearTimeout);
  },[gameState]);

  // Damage animations dari lastLog (per game_update event)
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; } // skip mount
    if (!lastLog?.length) return;
    const timers = [];

    const spawnHit = (setter, dmg) => {
      if (!dmg) return;
      const id = Date.now() + Math.random();
      const x  = 20 + Math.random() * 60;
      setter(p => [...p, { id, damage: dmg, x }]);
      timers.push(setTimeout(() => setter(p => p.filter(h => h.id !== id)), 1100));
    };

    const flashHp = (setter) => {
      setter(true);
      timers.push(setTimeout(() => setter(false), 600));
    };

    for (const e of lastLog) {
      const dmg = e.damage;
      const byAI = e.player === 'ai';
      const byP1 = e.player === 'player1';

      switch (e.action) {
        case 'attack':
        case 'spell':
          if (byAI) spawnHit(setP1FieldHits, dmg);
          if (byP1) spawnHit(setP2FieldHits, dmg);
          break;
        case 'direct_attack':
          if (byAI) { spawnHit(setP1FieldHits, dmg); flashHp(setP1HpFlash); }
          if (byP1) { spawnHit(setP2FieldHits, dmg); flashHp(setP2HpFlash); }
          break;
        case 'direct':
          if (byAI) flashHp(setP1HpFlash);
          if (byP1) flashHp(setP2HpFlash);
          break;
        case 'special':
        case 'trap_trigger':
          // special log entries tidak selalu punya player field —
          // tentukan target dari konteks: byAI berarti kena player1, byP1 kena AI
          if (dmg) {
            if (byAI) spawnHit(setP1FieldHits, dmg);
            else if (byP1) spawnHit(setP2FieldHits, dmg);
          }
          break;
        default:
          break;
      }
    }

    return () => timers.forEach(clearTimeout);
  }, [lastLog]);

  // Three.js BG
  useEffect(()=>{
    const c=canvasRef.current; if(!c) return;
    const r=new THREE.WebGLRenderer({canvas:c,alpha:true,antialias:true});
    r.setSize(c.offsetWidth,c.offsetHeight);
    const scene=new THREE.Scene(), cam=new THREE.PerspectiveCamera(60,c.offsetWidth/c.offsetHeight,.1,100);
    cam.position.set(0,0,5);
    const gE=new THREE.GridHelper(20,20,0x7f1d1d,0x450a0a); gE.rotation.x=Math.PI/3; gE.position.y=3; scene.add(gE);
    const gP=new THREE.GridHelper(20,20,0x3b1f72,0x221442); gP.rotation.x=-Math.PI/3; gP.position.y=-3; scene.add(gP);
    const mkP=(col,n)=>{const g=new THREE.BufferGeometry(),p=new Float32Array(n*3);for(let i=0;i<n;i++){p[i*3]=(Math.random()-.5)*14;p[i*3+1]=(Math.random()-.5)*14;p[i*3+2]=(Math.random()-.5)*8;}g.setAttribute('position',new THREE.BufferAttribute(p,3));const m=new THREE.PointsMaterial({size:.04,color:col,transparent:true,opacity:.7});scene.add(new THREE.Points(g,m));return m;};
    const mP=mkP(0x7c3aed,250),mR=mkP(0xef4444,150);
    scene.fog=new THREE.FogExp2(0x0d0520,.07);
    let fr; const anim=()=>{fr=requestAnimationFrame(anim);const t=Date.now()*.001;gE.rotation.z+=.0008;gP.rotation.z-=.0008;mP.opacity=.4+Math.sin(t*1.5)*.3;mR.opacity=.3+Math.cos(t*1.2)*.2;r.render(scene,cam);};
    anim(); return()=>{cancelAnimationFrame(fr);r.dispose();};
  },[]);

  // ── Drag & hold ─────────────────────────────────────────────
  const checkOver=useCallback((x,y)=>{
    if(!fieldRef.current) return false;
    const b=fieldRef.current.getBoundingClientRect();
    return x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom;
  },[]);

  const onMove=useCallback((e)=>{
    if(dragCard){ setDragPos({x:e.clientX,y:e.clientY}); setOverField(checkOver(e.clientX,e.clientY)); }
    if(holdTimer.current&&!holdFired.current){
      const dx=e.clientX-holdStartXY.current.x, dy=e.clientY-holdStartXY.current.y;
      if(dx*dx+dy*dy>64){ clearTimeout(holdTimer.current); holdTimer.current=null; }
    }
  },[dragCard,checkOver]);

  const onUp=useCallback((e)=>{
    clearTimeout(holdTimer.current); holdTimer.current=null;
    if(dragCard){
      if(checkOver(e.clientX,e.clientY)){ socket?.emit('play_card',{battleId,cardId:dragCard.id}); setSelCard(null); }
      setDrag(null); setOverField(false);
    }
  },[dragCard,battleId,socket,checkOver]);

  // pointerDown pada kartu tangan: mulai hold timer + drag
  const onCardDown=(e,card)=>{
    holdFired.current=false;
    holdStartXY.current={x:e.clientX,y:e.clientY};
    holdTimer.current=setTimeout(()=>{
      holdFired.current=true; setDetail(card); setDrag(null);
    },480);
    if(isMyTurn&&gs&&card.energy_cost<=gs.player1.energy){
      e.preventDefault(); setDrag(card); setDragPos({x:e.clientX,y:e.clientY});
    }
  };

  // pointerUp pada kartu tangan: klik = pilih/deselect
  const onCardUp=(card)=>{
    if(holdFired.current) return;
    clearTimeout(holdTimer.current); holdTimer.current=null;
    setSelCard(p=>p?.id===card.id?null:card);
  };

  const playSelected=()=>{
    if(!selCard) return;
    socket?.emit('play_card',{battleId,cardId:selCard.id}); setSelCard(null);
  };

  const onPlayerField=(card)=>{
    if(!isMyTurn||card.hasAttacked) return;
    setAtkCard(p=>p?.id===card.id?null:card); setSelCard(null);
  };

  const onEnemyField=(card)=>{
    if(atkCard){ socket?.emit('attack_card',{battleId,attackerId:atkCard.id,targetId:card.id}); setAtkCard(null); }
  };

  const onDirect=()=>{ if(!atkCard) return; socket?.emit('attack_card',{battleId,attackerId:atkCard.id,targetId:null}); setAtkCard(null); };
  const endTurn =()=>{ setAtkCard(null); setSelCard(null); socket?.emit('end_turn',{battleId}); };
  const surrender=()=>setSurrenderConfirm(true);
  const doSurrender=()=>{ socket?.emit('surrender',{battleId}); };

  if(!gs) return null;
  const {player1,player2}=gs;
  const isMyTurn=gs.phase==='player1';

  // ── Layout heights via CSS custom props ──────────────────────
  // Setiap row pakai vh sehingga muat di semua ukuran layar
  const aiHeaderH  = 'clamp(40px, 6vh, 58px)';
  const handRowH   = `clamp(${CH+12}px, 16vh, ${CH+22}px)`;  // sama untuk AI & player
  const turnBarH   = 'clamp(26px, 4vh, 38px)';
  const bottomBarH = 'clamp(44px, 7vh, 60px)';

  return (
    <div onPointerMove={onMove} onPointerUp={onUp}
      style={{ position:'fixed', inset:0, zIndex:150, display:'flex', flexDirection:'column', background:'linear-gradient(180deg,#170f06,#150e07 50%,#170f06)', userSelect:'none', touchAction:'none' }}>
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:.38 }}/>

      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', height:'100%', width:'100%' }}>

        {/* ── AI HEADER ──────────────────────────────────────── */}
        <div style={{ flexShrink:0, height:aiHeaderH, display:'flex', alignItems:'center', gap:8, padding:'0 12px', background:'linear-gradient(180deg,rgba(239,68,68,0.14),transparent)', borderBottom:'1px solid rgba(239,68,68,0.18)', position:'relative', overflow:'hidden' }}>
          {p2HpFlash && <div className="hp-flash-overlay"/>}
          <div style={{ width:28, height:28, borderRadius:'50%', background:'radial-gradient(circle,#7f1d1d,#170f06)', border:'1.5px solid #ef4444', boxShadow:'0 0 8px rgba(239,68,68,0.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>🤖</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ fontSize:10, fontWeight:700, color:'#fca5a5' }}>AI — {gs.difficulty||'Normal'}</span>
              <span style={{ fontSize:10, color:'#ef4444', fontWeight:700 }}>❤️ {player2.hp}</span>
            </div>
            <HpBar current={player2.hp} color="#ef4444"/>
          </div>
        </div>

        {/* ── AI HAND ────────────────────────────────────────── */}
        <div style={{ flexShrink:0, height:handRowH, display:'flex', alignItems:'center', padding:'0 10px', gap:6, background:'rgba(239,68,68,0.03)', borderBottom:'1px solid rgba(239,68,68,0.08)', overflow:'hidden' }}>
          <FanHand cards={player2.hand} flipped isAI isMyTurn={false} energy={0} selectedId={null} newCardIdx={newAiIdx} onPointerDown={()=>{}} onPointerUp={()=>{}}/>
          <PileColumn deckCount={player2.deck.length} discard={p2Dis} red onDiscard={()=>setDisModal('p2')}/>
        </div>

        {/* ── AI FIELD ───────────────────────────────────────── */}
        <FieldRow cards={player2.field} isEnemy attackerCard={atkCard} isMyTurn={isMyTurn} onEnemy={onEnemyField} onPlayer={()=>{}} isDragOver={false} onDirectAttack={onDirect} onCardHold={setDetail} newCardIdx={newAiFieldIdx} damageHits={p2FieldHits}/>

        {/* ── TURN BAR ───────────────────────────────────────── */}
        <div style={{ flexShrink:0, height:turnBarH, display:'flex', alignItems:'center', justifyContent:'center', gap:10, borderTop:'1px solid rgba(239,68,68,0.06)', borderBottom:'1px solid rgba(169,118,47,0.06)' }}>
          <span style={{ fontSize:9, color:'#8a7a5c', fontWeight:700 }}>T{gs.turn}</span>
          <div style={{ background:isMyTurn?'linear-gradient(135deg,#5c3d12,#a9762f)':'linear-gradient(135deg,#7f1d1d,#ef4444)', border:isMyTurn?'1px solid rgba(240,200,105,0.4)':'1px solid rgba(239,68,68,0.4)', borderRadius:20, padding:'3px 14px', fontSize:10, fontWeight:800, color:'white', boxShadow:isMyTurn?'0 0 12px rgba(169,118,47,0.45)':'0 0 12px rgba(239,68,68,0.45)', animation:!isMyTurn?'aiThink 1.5s ease-in-out infinite':undefined, whiteSpace:'nowrap' }}>
            {isMyTurn?`Giliranmu ⚡${player1.energy}`:'⏳ AI bergerak...'}
          </div>
        </div>

        {/* ── PLAYER FIELD (drop zone) ────────────────────────── */}
        <div ref={fieldRef} style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
          <FieldRow cards={player1.field} isEnemy={false} attackerCard={atkCard} isMyTurn={isMyTurn} onPlayer={onPlayerField} onEnemy={()=>{}} isDragOver={overField} onDirectAttack={()=>{}} onCardHold={setDetail} damageHits={p1FieldHits}/>
        </div>

        {/* ── PLAYER HAND ────────────────────────────────────── */}
        <div style={{ flexShrink:0, height:handRowH, display:'flex', alignItems:'center', padding:'0 10px', gap:6, background:'rgba(169,118,47,0.04)', borderTop:'1px solid rgba(169,118,47,0.1)', overflow:'hidden' }}>
          <FanHand cards={player1.hand} flipped={false} isMyTurn={isMyTurn} energy={player1.energy} selectedId={selCard?.id} newCardIdx={newIdx} onPointerDown={onCardDown} onPointerUp={onCardUp}/>
          <PileColumn deckCount={player1.deck.length} discard={p1Dis} onDiscard={()=>setDisModal('p1')}/>
        </div>

        {/* ── BOTTOM BAR ─────────────────────────────────────── */}
        <div style={{ flexShrink:0, height:bottomBarH, display:'flex', alignItems:'center', gap:6, padding:'0 10px', background:'linear-gradient(0deg,rgba(169,118,47,0.16),transparent)', borderTop:'1px solid rgba(169,118,47,0.18)', position:'relative', overflow:'hidden' }}>
          {p1HpFlash && <div className="hp-flash-overlay"/>}
          {/* Surrender */}
          <button onClick={surrender} style={{ padding:'6px 8px', borderRadius:9, flexShrink:0, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.07)', color:'#ef4444', cursor:'pointer', fontSize:10, fontWeight:700 }}>🏳️</button>

          {/* Player HP */}
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:'radial-gradient(circle,#5c3d12,#170f06)', border:'1.5px solid #a9762f', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>⚔️</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                <span style={{ fontSize:9, fontWeight:700, color:'#e2c98f' }}>Kamu</span>
                <span style={{ fontSize:9, color:'#22c55e', fontWeight:700 }}>❤️ {player1.hp}</span>
              </div>
              <HpBar current={player1.hp} color="#22c55e"/>
            </div>
          </div>

          {/* Attacker info */}
          {atkCard&&(
            <div style={{ fontSize:9, color:'#f59e0b', fontWeight:700, flexShrink:0, padding:'4px 6px', background:'rgba(245,158,11,0.09)', borderRadius:7, border:'1px solid rgba(245,158,11,0.28)', textAlign:'center', maxWidth:76 }}>
              ⚔️ {atkCard.name}<br/><span style={{ fontSize:8, color:'#a89a7c' }}>pilih target</span>
            </div>
          )}

          {/* Play selected card */}
          {selCard&&!atkCard&&isMyTurn&&selCard.energy_cost<=player1.energy&&(
            <button className="btn-primary" onClick={playSelected} style={{ fontSize:9, padding:'6px 8px', flexShrink:0, maxWidth:84, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              ✨ {selCard.name}
            </button>
          )}

          {/* End turn */}
          <button onClick={isMyTurn?endTurn:undefined} disabled={!isMyTurn}
            style={{ padding:'6px 11px', borderRadius:9, fontSize:10, fontWeight:700, flexShrink:0, border:isMyTurn?'1px solid rgba(34,197,94,0.45)':'1px solid rgba(100,100,100,0.18)', background:isMyTurn?'linear-gradient(135deg,#15803d,#22c55e)':'rgba(50,50,50,0.3)', color:isMyTurn?'white':'#4b5563', cursor:isMyTurn?'pointer':'not-allowed', animation:isMyTurn?'turnPulse 1.5s ease-in-out infinite':undefined, whiteSpace:'nowrap' }}>
            ➡️ Akhiri
          </button>
        </div>
      </div>

      {/* Drag ghost */}
      {dragCard&&(
        <div style={{ position:'fixed', left:dragPos.x-CW/2, top:dragPos.y-CH/2, width:CW, height:CH, zIndex:999, pointerEvents:'none', opacity:.9, transform:overField?'scale(1.1) rotate(-3deg)':'scale(1.04) rotate(2deg)', transition:'transform .15s', filter:overField?'drop-shadow(0 0 16px #22c55e)':'drop-shadow(0 0 10px rgba(169,118,47,0.9))' }}>
          <CardRenderer card={dragCard} size="xs" animated={false}/>
        </div>
      )}

      {disModal==='p1'&&<DiscardModal cards={p1Dis} title="Kartu Buanganmu" onClose={()=>setDisModal(null)}/>}
      {disModal==='p2'&&<DiscardModal cards={p2Dis} title="Kartu Buangan Musuh" onClose={()=>setDisModal(null)}/>}
      {detailCard&&<CardDetailModal card={detailCard} onClose={()=>setDetail(null)}/>}

      {revealedCard&&(
        <div style={{ position:'fixed', top:'18%', right:16, zIndex:450, pointerEvents:'none' }}>
          <div className="card-reveal-spill">
            {/* Label */}
            <div style={{ position:'absolute', top:-22, left:'50%', transform:'translateX(-50%)', whiteSpace:'nowrap', fontSize:10, fontWeight:700, color:'#fbbf24', textShadow:'0 0 8px #f59e0b', letterSpacing:.5 }}>
              🔦 Kartu Terungkap!
            </div>
            {/* Card face */}
            <div style={{
              width: CW+8, height: CH+8, borderRadius: 10,
              background: RARITY_BG[revealedCard.rarity] || RARITY_BG.common,
              border: `2px solid ${RARITY_BORDER[revealedCard.rarity] || '#94a3b8'}`,
              boxShadow: `0 0 24px ${RARITY_GLOW[revealedCard.rarity] || 'rgba(148,163,184,0.5)'}`,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, padding:6,
            }}>
              <div style={{ fontSize:8, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color: RARITY_BORDER[revealedCard.rarity] || '#94a3b8' }}>{revealedCard.rarity}</div>
              <div style={{ fontSize:11, fontWeight:800, color:'white', textAlign:'center', lineHeight:1.3 }}>{revealedCard.name}</div>
              <div style={{ fontSize:8, color:'rgba(255,255,255,0.5)' }}>kartu lawan</div>
            </div>
          </div>
        </div>
      )}

      {surrenderConfirm&&(
        <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(0,0,0,0.55)' }}
          onClick={()=>setSurrenderConfirm(false)}>
          <div onClick={e=>e.stopPropagation()} className="glass"
            style={{ borderRadius:18, padding:'22px 24px', maxWidth:300, width:'100%', textAlign:'center', border:'1px solid rgba(239,68,68,0.35)', boxShadow:'0 0 32px rgba(239,68,68,0.2)' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🏳️</div>
            <div style={{ fontSize:15, fontWeight:700, color:'white', marginBottom:6 }}>Yakin menyerah?</div>
            <div style={{ fontSize:12, color:'#a89a7c', marginBottom:20 }}>Kamu akan kalah dan battle berakhir.</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setSurrenderConfirm(false)}
                style={{ flex:1, padding:'9px 0', borderRadius:10, border:'1px solid rgba(169,118,47,0.35)', background:'rgba(169,118,47,0.1)', color:'#e2c98f', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                Batal
              </button>
              <button onClick={doSurrender}
                style={{ flex:1, padding:'9px 0', borderRadius:10, border:'none', background:'linear-gradient(135deg,#b91c1c,#ef4444)', color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                Ya, Menyerah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

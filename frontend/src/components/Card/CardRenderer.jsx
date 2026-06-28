/**
 * CardRenderer — Rarity-tiered card visual system
 * common    : bold border, flat
 * uncommon  : green glow
 * rare      : blue shimmer sweep
 * epic      : purple animated glow + sparkles
 * legendary : full-art + light rays + floating gold particles (ML login style)
 */

import { useRef, useState, useMemo } from 'react';
import { generateCardSvg } from '../../utils/cardArtGenerator';

// Returns { hp, atk, def } bonus at current level, or null
function getLevelBonus(card) {
  if (!card?.upgrade_stats || card.current_level <= 1) return null;
  const stats = typeof card.upgrade_stats === 'string'
    ? JSON.parse(card.upgrade_stats)
    : card.upgrade_stats;
  return stats.find(u => u.level === card.current_level) || null;
}

const SIZES = {
  sm:  { w: 100, h: 140 },
  md:  { w: 130, h: 182 },
  lg:  { w: 200, h: 280 },
  xl:  { w: 280, h: 392 },
};

const RARITY_COLORS = {
  common:    '#94a3b8',
  uncommon:  '#22c55e',
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#f59e0b',
};

const RARITY_BG = {
  common:    'linear-gradient(160deg, #16182a 0%, #0d0f1e 100%)',
  uncommon:  'linear-gradient(160deg, #0b1f12 0%, #060f09 100%)',
  rare:      'linear-gradient(160deg, #091426 0%, #050b18 100%)',
  epic:      'linear-gradient(160deg, #190828 0%, #0d0420 100%)',
  legendary: 'linear-gradient(160deg, #1a0a00 0%, #0d0500 100%)',
};

const CLASS_ICONS = {
  warrior:'🛡️', mage:'🔮', rogue:'🗡️', cleric:'✝️',
  ranger:'🏹', barbarian:'💢', druid:'🌿', paladin:'⚡',
  bard:'🎵', monk:'👊', any:'🎲',
};

// Gold particle configs for legendary
const LEGEND_PARTICLES = [
  { x: 12, delay: '0s',    dur: '3.2s', size: 3 },
  { x: 28, delay: '0.7s',  dur: '2.6s', size: 2 },
  { x: 47, delay: '1.3s',  dur: '3.8s', size: 4 },
  { x: 63, delay: '0.4s',  dur: '2.9s', size: 2 },
  { x: 80, delay: '1.8s',  dur: '3.4s', size: 3 },
  { x: 38, delay: '2.2s',  dur: '2.7s', size: 2 },
  { x: 72, delay: '0.9s',  dur: '3.1s', size: 3 },
  { x: 55, delay: '1.6s',  dur: '2.5s', size: 2 },
];

// Light ray angles for legendary
const LIGHT_RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

// Epic sparkle positions
const EPIC_SPARKLES = [
  { top: '12%', left: '18%', delay: '0s'   },
  { top: '25%', left: '78%', delay: '0.6s' },
  { top: '55%', left: '12%', delay: '1.1s' },
  { top: '42%', left: '88%', delay: '0.3s' },
  { top: '78%', left: '58%', delay: '0.9s' },
  { top: '68%', left: '30%', delay: '1.5s' },
];

export default function CardRenderer({ card, size = 'md', onClick, selected, faceDown, animated = true }) {
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  if (!card) return null;

  const dim        = SIZES[size] || SIZES.md;
  const rarity     = card.rarity || 'common';
  const rarityColor = RARITY_COLORS[rarity] || '#94a3b8';
  const isLegendary = rarity === 'legendary';
  const isEpic      = rarity === 'epic';
  const isRare      = rarity === 'rare';
  const isUncommon  = rarity === 'uncommon';
  const isFullArt   = isLegendary || isEpic;
  const isLarge     = size === 'xl' || size === 'lg';

  const bonus = useMemo(() => getLevelBonus(card), [card]);
  // Accumulated totals (base + bonus)
  const totalHp  = card.hp     + (bonus?.hp  || 0);
  const totalAtk = card.attack + (bonus?.atk || 0);
  const totalDef = card.defense + (bonus?.def || 0);

  // xl: show "base+bonus", others: show accumulated total
  const statDisplay = (base, bonusVal, color) => {
    if (size === 'xl' && bonusVal) {
      return <span>{base}<span style={{ color: '#4ade80', fontSize: 10 }}>+{bonusVal}</span></span>;
    }
    return base + (bonusVal || 0);
  };

  const handleMouseMove = (e) => {
    if (!animated || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
    const y = ((e.clientY - rect.top)  / rect.height - 0.5) * -2;
    containerRef.current.style.transform =
      `perspective(600px) rotateY(${x * 15}deg) rotateX(${y * 15}deg) scale(1.05)`;
  };

  const handleMouseLeave = () => {
    if (!containerRef.current) return;
    containerRef.current.style.transform =
      'perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)';
    setHovered(false);
  };

  // ── Border & shadow per rarity ──────────────────────────────
  const rarityBorderStyle = (() => {
    if (selected) return {
      border: '2px solid #f59e0b',
      boxShadow: '0 0 20px rgba(245,158,11,0.8)',
    };
    if (isLegendary) return {
      border: 'none',
      outline: '2px solid rgba(245,158,11,0.8)',
      outlineOffset: '1px',
      animation: 'legendaryGlow 2.5s ease-in-out infinite',
    };
    if (isEpic) return {
      border: 'none',
      outline: '2px solid rgba(168,85,247,0.8)',
      outlineOffset: '1px',
      animation: 'epicGlow 2s ease-in-out infinite',
    };
    if (isRare) return {
      border: '2px solid #3b82f6',
      boxShadow: '0 0 14px rgba(59,130,246,0.55), 0 0 28px rgba(59,130,246,0.2)',
    };
    if (isUncommon) return {
      border: '2px solid #22c55e',
      boxShadow: '0 0 8px rgba(34,197,94,0.45)',
    };
    // common — bold flat border
    return { border: '3px solid #64748b' };
  })();

  const energyBadgeSize  = size === 'xl' ? 32 : 22;
  const energyFontSize   = size === 'xl' ? 14 : 10;
  const energyPos        = size === 'xl' ? 8 : 4;
  const levelFontSize    = size === 'xl' ? 12 : 9;
  const levelPadding     = size === 'xl' ? '3px 8px' : '1px 5px';

  // ── Shared top badges (energy + level) ─────────────────────
  const TopBadges = ({ accentColor = rarityColor }) => (
    <>
      <div style={{
        position: 'absolute', top: energyPos, left: energyPos,
        width: energyBadgeSize, height: energyBadgeSize, borderRadius: '50%',
        background: 'rgba(8,4,24,0.92)',
        border: `2px solid ${accentColor}`,
        boxShadow: `0 0 8px ${accentColor}66`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: energyFontSize, fontWeight: 700, color: accentColor,
        zIndex: 6,
      }}>
        {card.energy_cost}
      </div>
      {card.current_level > 1 && (
        <div style={{
          position: 'absolute', top: energyPos, right: energyPos,
          background: 'rgba(245,158,11,0.92)', borderRadius: 4,
          padding: levelPadding, fontSize: levelFontSize,
          fontWeight: 700, color: '#1a0a2e', zIndex: 6,
        }}>
          Lv.{card.current_level}
        </div>
      )}
    </>
  );

  // ── Stat boxes used inside card ─────────────────────────────
  const StatBoxes = ({ compact = false }) => {
    const p    = compact ? '2px 3px' : size === 'xl' ? '5px 4px' : '3px 4px';
    const fs   = compact ? 7 : size === 'xl' ? 15 : 10;
    const lfs  = compact ? 7 : 9;
    const r    = compact ? 4 : 6;
    return (
      <div style={{ display: 'flex', gap: compact ? 3 : 6 }}>
        <div style={{ flex: 1, background: 'rgba(34,197,94,0.18)', borderRadius: r, padding: p, textAlign: 'center' }}>
          <div style={{ fontSize: lfs, color: '#22c55e' }}>❤️</div>
          <div style={{ fontSize: fs, fontWeight: 800, color: '#22c55e' }}>{statDisplay(card.hp, bonus?.hp)}</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(239,68,68,0.18)', borderRadius: r, padding: p, textAlign: 'center' }}>
          <div style={{ fontSize: lfs, color: '#ef4444' }}>⚔️</div>
          <div style={{ fontSize: fs, fontWeight: 800, color: '#ef4444' }}>{statDisplay(card.attack, bonus?.atk)}</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(59,130,246,0.18)', borderRadius: r, padding: p, textAlign: 'center' }}>
          <div style={{ fontSize: lfs, color: '#3b82f6' }}>🛡</div>
          <div style={{ fontSize: fs, fontWeight: 800, color: '#3b82f6' }}>{statDisplay(card.defense, bonus?.def)}</div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setHovered(true)}
      style={{
        width: dim.w, height: dim.h,
        borderRadius: 10,
        background: isFullArt ? 'transparent' : (RARITY_BG[rarity] || RARITY_BG.common),
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.1s ease',
        overflow: 'hidden',
        flexShrink: 0,
        userSelect: 'none',
        display: 'flex', flexDirection: 'column',
        ...rarityBorderStyle,
      }}
    >
      {/* ════════════════════════════════════════
          CARD BACK
      ════════════════════════════════════════ */}
      {faceDown && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #3b1f72, #1a0a2e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: dim.w * 0.4,
        }}>
          🎲
          <div style={{ position: 'absolute', inset: 4, border: '1px solid rgba(124,58,237,0.4)', borderRadius: 6 }} />
        </div>
      )}

      {/* ════════════════════════════════════════
          FULL ART LAYOUT (EPIC + LEGENDARY)
      ════════════════════════════════════════ */}
      {!faceDown && isFullArt && (() => {
        const accentColor  = isLegendary ? '#f59e0b' : '#c084fc';
        const accentColor2 = isLegendary ? '#fbbf24' : '#a855f7';
        const particleColors = isLegendary
          ? ['#fbbf24', '#f59e0b', '#fde68a']
          : ['#c084fc', '#a855f7', '#e879f9'];
        const rayColor = isLegendary
          ? `rgba(251,191,36,${size === 'xl' ? 0.18 : 0.12})`
          : `rgba(192,132,252,${size === 'xl' ? 0.15 : 0.09})`;
        const shimmerClass = isLegendary ? 'legendary-shimmer' : 'epic-shimmer';
        const nameTextShadow = isLegendary
          ? '0 0 12px rgba(245,158,11,0.9), 0 1px 3px rgba(0,0,0,0.8)'
          : '0 0 12px rgba(168,85,247,0.9), 0 1px 3px rgba(0,0,0,0.8)';
        const abilityBg     = isLegendary ? 'rgba(245,158,11,0.12)' : 'rgba(168,85,247,0.14)';
        const abilityBorder = isLegendary ? '#f59e0b' : '#a855f7';
        const abilityDesc   = isLegendary ? '#d4a855' : '#c084fc';
        const topBarBg      = isLegendary
          ? 'linear-gradient(90deg, transparent, #fbbf24, #f59e0b, #fbbf24, transparent)'
          : 'linear-gradient(90deg, transparent, #c084fc, #a855f7, #c084fc, transparent)';
        const bottomBarBg   = topBarBg;
        const rayAnimation  = isLegendary ? 'legendaryRay' : 'legendaryRay';

        return (
          <>
            {/* Full art image */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `url(${card.image_url || generateCardSvg(card)}) center/cover`,
              borderRadius: 8,
            }} />

            {/* Dark vignette */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
              pointerEvents: 'none', zIndex: 1,
            }} />

            {/* Light rays (large sizes only) */}
            {isLarge && LIGHT_RAYS.map((deg, i) => (
              <div key={i} style={{
                position: 'absolute', top: '35%', left: '50%',
                width: dim.w * 2, height: size === 'xl' ? 2 : 1,
                background: `linear-gradient(90deg, transparent, ${rayColor}, transparent)`,
                transformOrigin: 'left center',
                transform: `rotate(${deg}deg)`,
                animation: `${rayAnimation} 4s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
                pointerEvents: 'none', zIndex: 2,
              }} />
            ))}

            {/* Shimmer sweep */}
            <div className={shimmerClass} style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', borderRadius: 8 }} />

            {/* Sparkles for epic */}
            {isEpic && EPIC_SPARKLES.map((s, i) => (
              <div key={i} style={{
                position: 'absolute', top: s.top, left: s.left,
                width: size === 'xl' ? 5 : 3, height: size === 'xl' ? 5 : 3,
                borderRadius: '50%',
                background: '#c084fc',
                boxShadow: '0 0 6px #a855f7, 0 0 14px #a855f7',
                animation: 'epicSparkle 2.2s ease-in-out infinite',
                animationDelay: s.delay,
                pointerEvents: 'none', zIndex: 4,
              }} />
            ))}

            {/* Floating particles (large sizes only) */}
            {isLarge && LEGEND_PARTICLES.map((p, i) => (
              <div key={i} style={{
                position: 'absolute', bottom: -4, left: `${p.x}%`,
                width: p.size, height: p.size, borderRadius: '50%',
                background: particleColors[i % 3],
                boxShadow: `0 0 ${p.size * 2}px ${accentColor}`,
                animation: `floatParticle ${p.dur} ease-in infinite`,
                animationDelay: p.animDelay,
                pointerEvents: 'none', zIndex: 4,
              }} />
            ))}

            {/* Top glowing bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: topBarBg,
              animation: 'legendaryTopBar 2s ease-in-out infinite',
              zIndex: 6,
            }} />

            <TopBadges accentColor={accentColor} />

            {/* Bottom info overlay — always show for all sizes */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.82) 60%, transparent 100%)',
              padding: size === 'xl' ? '10px 12px' : size === 'lg' ? '8px 8px 6px' : size === 'sm' ? '4px 5px 4px' : '6px 6px 4px',
              zIndex: 5, borderRadius: '0 0 8px 8px',
            }}>
              {/* Name */}
              <div style={{
                fontSize: size === 'xl' ? 15 : size === 'lg' ? 11 : size === 'sm' ? 9 : Math.max(7, dim.w * 0.08),
                fontWeight: 800, color: accentColor,
                textShadow: nameTextShadow,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                marginBottom: 3,
              }}>
                {card.name}
              </div>

              {/* Rarity badge + class icon */}
              <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginBottom: size === 'sm' ? 3 : 4, flexWrap: 'nowrap', overflow: 'hidden' }}>
                <span className={`rarity-badge rarity-${rarity}`} style={{ fontSize: size === 'xl' ? 9 : 7, flexShrink: 0 }}>
                  {rarity}
                </span>
                {card.class !== 'any' && (
                  <span style={{ fontSize: size === 'xl' ? 11 : 9, flexShrink: 0 }}>{CLASS_ICONS[card.class] || ''}</span>
                )}
              </div>

              {/* Stats — character */}
              {card.card_type === 'character' && (
                size === 'xl'
                  ? <StatBoxes compact={false} />
                  : (
                    <div style={{ display: 'flex', gap: 2, fontSize: Math.max(7, dim.w * 0.07) }}>
                      <span style={{ color: '#22c55e', whiteSpace: 'nowrap' }}>❤️{totalHp}</span>
                      <span style={{ color: '#ef4444', whiteSpace: 'nowrap', margin: '0 1px' }}>⚔️{totalAtk}</span>
                      <span style={{ color: '#3b82f6', whiteSpace: 'nowrap' }}>🛡{totalDef}</span>
                    </div>
                  )
              )}

              {/* Stats — spell/trap */}
              {(card.card_type === 'spell' || card.card_type === 'trap') && (
                size === 'xl'
                  ? (
                    <div style={{ background: 'rgba(239,68,68,0.2)', borderRadius: 5, padding: '3px 6px', textAlign: 'center' }}>
                      <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>✨ {card.attack} DMG</span>
                    </div>
                  )
                  : (
                    <div style={{ fontSize: Math.max(7, dim.w * 0.07), color: '#ef4444' }}>✨{card.attack} DMG</div>
                  )
              )}

              {/* Special ability — xl only */}
              {size === 'xl' && card.special_name && (
                <div style={{
                  marginTop: 8, background: abilityBg,
                  borderRadius: 7, padding: '7px 9px',
                  borderLeft: `3px solid ${abilityBorder}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: accentColor }}>{card.special_name}</div>
                  <div style={{ fontSize: 9, color: abilityDesc, lineHeight: 1.45, marginTop: 3 }}>{card.special_desc}</div>
                </div>
              )}
            </div>

            {/* Bottom rarity bar */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
              background: bottomBarBg, zIndex: 7,
            }} />
          </>
        );
      })()}

      {/* ════════════════════════════════════════
          NON-FULL-ART LAYOUT (RARE, UNCOMMON, COMMON)
      ════════════════════════════════════════ */}
      {!faceDown && !isFullArt && (
        <>
          {/* ── RARE shimmer sweep ── */}
          {isRare && (
            <div className="rare-shimmer" style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', borderRadius: 8 }} />
          )}

          {/* ── UNCOMMON subtle shimmer ── */}
          {isUncommon && (
            <div className="uncommon-shimmer" style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', borderRadius: 8 }} />
          )}

          {/* Image area */}
          <div style={{
            height: size === 'xl' ? '52%' : '45%',
            background: `url(${card.image_url || generateCardSvg(card)}) center/cover`,
            borderRadius: '8px 8px 0 0',
            position: 'relative', flexShrink: 0,
          }}>
            <TopBadges />

            {/* Gradient fade to card body */}
            {size === 'xl' && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
                background: 'linear-gradient(to top, rgba(13,5,32,0.9) 0%, transparent 100%)',
              }} />
            )}
          </div>

          {/* Card info body */}
          <div style={{ padding: size === 'xl' ? '10px 12px' : size === 'sm' ? '4px 5px' : '5px 6px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 5 }}>
            {/* Name */}
            <div style={{
              fontSize: size === 'xl' ? 16 : size === 'sm' ? 9 : Math.max(8, dim.w * 0.075),
              fontWeight: 700, color: 'white',
              lineHeight: 1.2, marginBottom: size === 'xl' ? 6 : 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {card.name}
            </div>

            {/* Rarity badge + class icon — single row, vertically centered */}
            <div style={{ display: 'flex', gap: 3, marginBottom: size === 'xl' ? 8 : 3, alignItems: 'center', overflow: 'hidden' }}>
              <span className={`rarity-badge rarity-${rarity}`} style={{ fontSize: size === 'xl' ? 9 : 7, flexShrink: 0, lineHeight: 1 }}>
                {rarity}
              </span>
              {card.class !== 'any' && (
                <span style={{ fontSize: size === 'xl' ? 12 : 9, lineHeight: 1, flexShrink: 0 }}>{CLASS_ICONS[card.class] || ''}</span>
              )}
            </div>

            {/* Stats — character */}
            {card.card_type === 'character' && size === 'xl' && <StatBoxes />}
            {card.card_type === 'character' && size !== 'xl' && (
              <div style={{ display: 'flex', gap: 1, fontSize: size === 'sm' ? 8 : Math.max(9, dim.w * 0.07) }}>
                <span style={{ color: '#22c55e', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>❤️{totalHp}</span>
                <span style={{ color: '#ef4444', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>⚔️{totalAtk}</span>
                <span style={{ color: '#3b82f6', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🛡{totalDef}</span>
              </div>
            )}

            {/* Stats — spell/trap */}
            {(card.card_type === 'spell' || card.card_type === 'trap') && size === 'xl' && (
              <div style={{ background: 'rgba(239,68,68,0.12)', borderRadius: 6, padding: '6px 8px', textAlign: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: '#ef4444' }}>✨ DMG</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#ef4444' }}>{card.attack}</div>
              </div>
            )}
            {(card.card_type === 'spell' || card.card_type === 'trap') && size !== 'xl' && (
              <div style={{ fontSize: size === 'sm' ? 8 : Math.max(9, dim.w * 0.07), color: '#ef4444', whiteSpace: 'nowrap' }}>✨{card.attack} DMG</div>
            )}

            {/* Special ability (lg + xl) */}
            {isLarge && card.special_name && (
              <div style={{
                marginTop: 'auto',
                background: 'rgba(0,0,0,0.5)', borderRadius: size === 'xl' ? 8 : 4,
                padding: size === 'xl' ? '8px 10px' : '4px 6px',
                borderLeft: `${size === 'xl' ? 3 : 2}px solid ${rarityColor}`,
              }}>
                <div style={{ fontSize: size === 'xl' ? 11 : 9, fontWeight: 700, color: rarityColor }}>
                  {card.special_name}
                </div>
                <div style={{ fontSize: size === 'xl' ? 10 : 8, color: '#a78bfa', lineHeight: 1.4, marginTop: size === 'xl' ? 3 : 1 }}>
                  {card.special_desc}
                </div>
              </div>
            )}
          </div>

          {/* Bottom rarity accent bar */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: isEpic ? 4 : isRare ? 3 : isUncommon ? 3 : 2,
            background: `linear-gradient(90deg, transparent, ${rarityColor}, transparent)`,
            animation: isEpic ? 'rarityBarPulse 2s ease-in-out infinite' : undefined,
            zIndex: 5,
          }} />
        </>
      )}

      {/* Selected overlay */}
      {selected && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(245,158,11,0.1)',
          border: '2px solid #f59e0b',
          borderRadius: 8, pointerEvents: 'none', zIndex: 10,
        }} />
      )}
    </div>
  );
}

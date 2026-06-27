/**
 * CardRenderer — Three.js card with holographic + flip animation
 * Props:
 *   card       — card data object
 *   size       — 'sm' | 'md' | 'lg'
 *   onClick    — click handler
 *   selected   — boolean
 *   faceDown   — boolean (card back)
 *   animated   — boolean (hover 3D tilt)
 */

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { generateCardSvg } from '../../utils/cardArtGenerator';

const SIZES = { sm: { w: 90, h: 126 }, md: { w: 130, h: 182 }, lg: { w: 200, h: 280 } };

const RARITY_COLORS = {
  common:    '#94a3b8',
  uncommon:  '#22c55e',
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#f59e0b',
};

const TYPE_ICONS = { character: '⚔️', spell: '✨', item: '🎒', location: '🗺️', trap: '⚠️' };
const CLASS_ICONS = { warrior:'🛡️', mage:'🔮', rogue:'🗡️', cleric:'✝️', ranger:'🏹', barbarian:'💢', druid:'🌿', paladin:'⚡', bard:'🎵', monk:'👊', any:'🎲' };

export default function CardRenderer({ card, size = 'md', onClick, selected, faceDown, animated = true }) {
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  const dim = SIZES[size] || SIZES.md;
  const rarityColor = RARITY_COLORS[card?.rarity] || '#94a3b8';
  const isLegendary = card?.rarity === 'legendary';
  const isEpic      = card?.rarity === 'epic';

  const handleMouseMove = (e) => {
    if (!animated || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top)  / rect.height - 0.5) * -2;
    containerRef.current.style.transform = `perspective(600px) rotateY(${x * 15}deg) rotateX(${y * 15}deg) scale(1.05)`;
  };

  const handleMouseLeave = () => {
    if (!containerRef.current) return;
    containerRef.current.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)';
    setHovered(false);
  };

  if (!card) return null;

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
        border: `2px solid ${selected ? '#f59e0b' : rarityColor}`,
        background: `linear-gradient(160deg, #1a0a2e 0%, #0d0520 100%)`,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.1s ease, box-shadow 0.2s',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: selected
          ? `0 0 20px rgba(245,158,11,0.8)`
          : isLegendary
            ? `0 0 20px ${rarityColor}60`
            : isEpic
              ? `0 0 12px ${rarityColor}50`
              : `0 0 6px ${rarityColor}30`,
        userSelect: 'none',
      }}
    >
      {/* Holographic shimmer for epic/legendary */}
      {(isLegendary || isEpic) && (
        <div className="holographic" style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }} />
      )}

      {faceDown ? (
        // Card back
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #3b1f72, #1a0a2e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: dim.w * 0.4,
        }}>
          🎲
          {/* Pattern */}
          <div style={{
            position: 'absolute', inset: 4,
            border: `1px solid rgba(124,58,237,0.4)`,
            borderRadius: 6,
          }} />
        </div>
      ) : (
        <>
          {/* Card image area */}
          <div style={{
            height: '45%',
            background: `url(${card.image_url || generateCardSvg(card)}) center/cover`,
            borderRadius: '8px 8px 0 0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: dim.w * 0.35,
            position: 'relative',
          }}>
            {false && ''}

            {/* Energy cost badge */}
            <div style={{
              position: 'absolute', top: 4, left: 4,
              width: 22, height: 22, borderRadius: '50%',
              background: 'rgba(13,5,32,0.9)',
              border: '1px solid #7c3aed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#c084fc',
            }}>
              {card.energy_cost}
            </div>

            {/* Level badge */}
            {card.current_level > 1 && (
              <div style={{
                position: 'absolute', top: 4, right: 4,
                background: 'rgba(245,158,11,0.9)', borderRadius: 4,
                padding: '1px 5px', fontSize: 9, fontWeight: 700, color: '#1a0a2e',
              }}>
                Lv.{card.current_level}
              </div>
            )}
          </div>

          {/* Card info */}
          <div style={{ padding: '5px 6px', flex: 1 }}>
            {/* Name */}
            <div style={{
              fontSize: Math.max(8, dim.w * 0.075),
              fontWeight: 700, color: 'white',
              lineHeight: 1.2, marginBottom: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {card.name}
            </div>

            {/* Rarity + Type row */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
              <span className={`rarity-badge rarity-${card.rarity}`} style={{ fontSize: 8 }}>
                {card.rarity}
              </span>
              {card.class !== 'any' && (
                <span style={{ fontSize: 10 }}>{CLASS_ICONS[card.class] || ''}</span>
              )}
            </div>

            {/* Stats */}
            {card.card_type === 'character' && (
              <div style={{ display: 'flex', gap: 6, fontSize: Math.max(9, dim.w * 0.07) }}>
                <span title="HP" style={{ color: '#22c55e' }}>❤️{card.hp}</span>
                <span title="ATK" style={{ color: '#ef4444' }}>⚔️{card.attack}</span>
                <span title="DEF" style={{ color: '#3b82f6' }}>🛡{card.defense}</span>
              </div>
            )}
            {(card.card_type === 'spell' || card.card_type === 'trap') && (
              <div style={{ fontSize: Math.max(9, dim.w * 0.07), color: '#ef4444' }}>
                ✨{card.attack} DMG
              </div>
            )}

            {/* Special ability (only in lg) */}
            {size === 'lg' && card.special_name && (
              <div style={{
                marginTop: 4,
                background: 'rgba(0,0,0,0.4)',
                borderRadius: 4, padding: '4px 6px',
                borderLeft: `2px solid ${rarityColor}`,
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: rarityColor }}>
                  {card.special_name}
                </div>
                <div style={{ fontSize: 8, color: '#8b7aa8', lineHeight: 1.3, marginTop: 1 }}>
                  {card.special_desc}
                </div>
              </div>
            )}
          </div>

          {/* Bottom rarity bar */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${rarityColor}, transparent)`,
          }} />
        </>
      )}

      {/* Selected overlay */}
      {selected && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(245,158,11,0.1)',
          border: '2px solid #f59e0b',
          borderRadius: 8, pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}

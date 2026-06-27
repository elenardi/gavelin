/**
 * Procedural chibi card art generator
 * Generates unique SVG illustrations based on card properties.
 * All art is original — no copyright concerns.
 */

const RARITY_GLOW = {
  common:    { outer: '#94a3b8', inner: '#cbd5e1', bg1: '#1e2a3a', bg2: '#0f1624' },
  uncommon:  { outer: '#22c55e', inner: '#86efac', bg1: '#0d2a18', bg2: '#051008' },
  rare:      { outer: '#3b82f6', inner: '#93c5fd', bg1: '#0d1a3d', bg2: '#050a1e' },
  epic:      { outer: '#a855f7', inner: '#d8b4fe', bg1: '#1a0d3d', bg2: '#0a0520' },
  legendary: { outer: '#f59e0b', inner: '#fde68a', bg1: '#2a1800', bg2: '#100800' },
};

// Deterministic color from string
function strColor(str, sat = 70, lit = 55) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return `hsl(${Math.abs(h) % 360},${sat}%,${lit}%)`;
}

// Class → visual theme
const CLASS_THEME = {
  warrior:   { skin: '#f5c9a0', hair: '#8b4513', eye: '#4a3000', outfit: '#8b2020', weapon: 'sword',  emoji: '⚔️' },
  mage:      { skin: '#ffe8d6', hair: '#c0a0ff', eye: '#4a0080', outfit: '#2d1a6e', weapon: 'staff',  emoji: '🔮' },
  rogue:     { skin: '#d4a870', hair: '#1a1a1a', eye: '#1a0a00', outfit: '#1a1a2e', weapon: 'dagger', emoji: '🗡️' },
  cleric:    { skin: '#ffe8d6', hair: '#d4a000', eye: '#1a0a00', outfit: '#1a3d6e', weapon: 'mace',   emoji: '✨' },
  ranger:    { skin: '#c8a060', hair: '#4a7a20', eye: '#2a4a10', outfit: '#2a4a18', weapon: 'bow',    emoji: '🏹' },
  barbarian: { skin: '#d48040', hair: '#8b2000', eye: '#3a1000', outfit: '#4a2000', weapon: 'axe',    emoji: '🪓' },
  druid:     { skin: '#e8c8a0', hair: '#2a6a20', eye: '#0a3a10', outfit: '#1a4a18', weapon: 'staff',  emoji: '🌿' },
  paladin:   { skin: '#ffe8d6', hair: '#d4c080', eye: '#1a2a4a', outfit: '#1a2a5e', weapon: 'sword',  emoji: '🛡️' },
  bard:      { skin: '#f0d0b0', hair: '#c06020', eye: '#2a1a00', outfit: '#6e2a6e', weapon: 'lute',   emoji: '🎵' },
  monk:      { skin: '#c8a060', hair: '#1a1a1a', eye: '#1a1a1a', outfit: '#3a2800', weapon: 'fist',   emoji: '👊' },
  any:       { skin: '#e8c8a8', hair: '#5a3a1a', eye: '#2a1a0a', outfit: '#2a2a4e', weapon: 'none',   emoji: '⚡' },
};

// Card type → background scene
const TYPE_BG = {
  character: (r, theme) => `
    <radialGradient id="bgr" cx="50%" cy="60%" r="70%">
      <stop offset="0%" stop-color="${r.bg1}"/>
      <stop offset="100%" stop-color="${r.bg2}"/>
    </radialGradient>
    <rect width="300" height="300" fill="url(#bgr)"/>
    <ellipse cx="150" cy="280" rx="120" ry="30" fill="${theme.outfit}" opacity="0.25"/>
    <ellipse cx="150" cy="240" rx="90" ry="80" fill="${r.outer}" opacity="0.08"/>`,

  spell: (r) => `
    <radialGradient id="bgr" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="${r.bg1}"/>
      <stop offset="100%" stop-color="${r.bg2}"/>
    </radialGradient>
    <rect width="300" height="300" fill="url(#bgr)"/>
    <circle cx="150" cy="150" r="100" fill="none" stroke="${r.outer}" stroke-width="1.5" opacity="0.3"/>
    <circle cx="150" cy="150" r="75" fill="none" stroke="${r.inner}" stroke-width="1" opacity="0.2"/>
    <circle cx="150" cy="150" r="50" fill="none" stroke="${r.outer}" stroke-width="0.8" opacity="0.15"/>`,

  item: (r) => `
    <radialGradient id="bgr" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="${r.bg1}"/>
      <stop offset="100%" stop-color="${r.bg2}"/>
    </radialGradient>
    <rect width="300" height="300" fill="url(#bgr)"/>
    <rect x="20" y="20" width="260" height="260" rx="12" fill="none" stroke="${r.outer}" stroke-width="1" opacity="0.2"/>`,

  location: (r) => `
    <linearGradient id="bgr" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${r.bg1}"/>
      <stop offset="60%" stop-color="${r.bg2}"/>
    </linearGradient>
    <rect width="300" height="300" fill="url(#bgr)"/>
    <rect x="0" y="200" width="300" height="100" fill="${r.bg2}" opacity="0.6"/>`,

  trap: (r) => `
    <radialGradient id="bgr" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#3a0a0a"/>
      <stop offset="100%" stop-color="#0a0202"/>
    </radialGradient>
    <rect width="300" height="300" fill="url(#bgr)"/>
    <path d="M 0 300 L 150 50 L 300 300 Z" fill="${r.outer}" opacity="0.05"/>`,
};

function chibiFace(cx, cy, r, theme) {
  const ex = r * 0.32, ey = r * 0.1;
  return `
  <!-- Hair back -->
  <ellipse cx="${cx}" cy="${cy - r * 0.15}" rx="${r * 1.05}" ry="${r * 0.9}" fill="${theme.hair}"/>
  <!-- Head -->
  <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.95}" fill="${theme.skin}"/>
  <!-- Ears -->
  <ellipse cx="${cx - r}" cy="${cy + r * 0.1}" rx="${r * 0.2}" ry="${r * 0.28}" fill="${theme.skin}"/>
  <ellipse cx="${cx + r}" cy="${cy + r * 0.1}" rx="${r * 0.2}" ry="${r * 0.28}" fill="${theme.skin}"/>
  <!-- Hair front -->
  <path d="M ${cx - r * 0.8} ${cy - r * 0.6} Q ${cx - r * 0.6} ${cy - r * 1.15} ${cx} ${cy - r * 1.1} Q ${cx + r * 0.6} ${cy - r * 1.15} ${cx + r * 0.8} ${cy - r * 0.6}" fill="${theme.hair}"/>
  <!-- Eyes white -->
  <ellipse cx="${cx - ex}" cy="${cy - ey}" rx="${r * 0.22}" ry="${r * 0.25}" fill="white"/>
  <ellipse cx="${cx + ex}" cy="${cy - ey}" rx="${r * 0.22}" ry="${r * 0.25}" fill="white"/>
  <!-- Iris -->
  <ellipse cx="${cx - ex}" cy="${cy - ey + r * 0.03}" rx="${r * 0.15}" ry="${r * 0.18}" fill="${theme.eye}"/>
  <ellipse cx="${cx + ex}" cy="${cy - ey + r * 0.03}" rx="${r * 0.15}" ry="${r * 0.18}" fill="${theme.eye}"/>
  <!-- Pupil -->
  <circle cx="${cx - ex - r * 0.02}" cy="${cy - ey + r * 0.03}" r="${r * 0.08}" fill="#0a0505"/>
  <circle cx="${cx + ex - r * 0.02}" cy="${cy - ey + r * 0.03}" r="${r * 0.08}" fill="#0a0505"/>
  <!-- Shine -->
  <circle cx="${cx - ex - r * 0.06}" cy="${cy - ey - r * 0.04}" r="${r * 0.04}" fill="white"/>
  <circle cx="${cx + ex - r * 0.06}" cy="${cy - ey - r * 0.04}" r="${r * 0.04}" fill="white"/>
  <!-- Eyebrow -->
  <path d="M ${cx - ex - r * 0.18} ${cy - ey - r * 0.18} Q ${cx - ex} ${cy - ey - r * 0.24} ${cx - ex + r * 0.18} ${cy - ey - r * 0.16}" stroke="${theme.hair}" stroke-width="${r * 0.05}" fill="none" stroke-linecap="round"/>
  <path d="M ${cx + ex - r * 0.18} ${cy - ey - r * 0.16} Q ${cx + ex} ${cy - ey - r * 0.24} ${cx + ex + r * 0.18} ${cy - ey - r * 0.18}" stroke="${theme.hair}" stroke-width="${r * 0.05}" fill="none" stroke-linecap="round"/>
  <!-- Nose -->
  <ellipse cx="${cx}" cy="${cy + r * 0.2}" rx="${r * 0.07}" ry="${r * 0.05}" fill="${theme.skin === '#f5c9a0' ? '#e0a070' : '#c8986a'}" opacity="0.6"/>
  <!-- Smile -->
  <path d="M ${cx - r * 0.25} ${cy + r * 0.38} Q ${cx} ${cy + r * 0.55} ${cx + r * 0.25} ${cy + r * 0.38}" stroke="#c87a60" stroke-width="${r * 0.055}" fill="none" stroke-linecap="round"/>
  <!-- Blush -->
  <ellipse cx="${cx - r * 0.5}" cy="${cy + r * 0.2}" rx="${r * 0.2}" ry="${r * 0.11}" fill="rgba(255,140,120,0.35)"/>
  <ellipse cx="${cx + r * 0.5}" cy="${cy + r * 0.2}" rx="${r * 0.2}" ry="${r * 0.11}" fill="rgba(255,140,120,0.35)"/>`;
}

function weaponEmoji(theme) {
  return theme.emoji;
}

export function generateCardSvg(card) {
  const r = RARITY_GLOW[card.rarity] || RARITY_GLOW.common;
  const theme = CLASS_THEME[card.class] || CLASS_THEME.any;
  const type = card.card_type || 'character';
  const bgFn = TYPE_BG[type] || TYPE_BG.character;
  const accentColor = strColor(card.name || 'card');

  let bodyContent = '';

  if (type === 'character') {
    bodyContent = `
    ${chibiFace(150, 115, 75, theme)}
    <!-- Body -->
    <ellipse cx="150" cy="235" rx="55" ry="50" fill="${theme.outfit}"/>
    <!-- Outfit detail -->
    <ellipse cx="150" cy="215" rx="35" ry="25" fill="${accentColor}" opacity="0.3"/>
    <!-- Weapon / class icon -->
    <text x="150" y="275" font-size="28" text-anchor="middle">${weaponEmoji(theme)}</text>`;
  } else if (type === 'spell') {
    bodyContent = `
    <!-- Magic burst -->
    <circle cx="150" cy="140" r="65" fill="${r.outer}" opacity="0.15"/>
    <circle cx="150" cy="140" r="45" fill="${r.inner}" opacity="0.2"/>
    <circle cx="150" cy="140" r="28" fill="${r.outer}" opacity="0.3"/>
    <circle cx="150" cy="140" r="14" fill="${r.inner}" opacity="0.5"/>
    <!-- Spell runes -->
    <text x="150" y="155" font-size="42" text-anchor="middle">${theme.emoji}</text>
    <!-- Orbiting stars -->
    <circle cx="95" cy="95" r="6" fill="${r.inner}" opacity="0.8"/>
    <circle cx="205" cy="95" r="6" fill="${r.inner}" opacity="0.8"/>
    <circle cx="80" cy="175" r="5" fill="${r.outer}" opacity="0.7"/>
    <circle cx="220" cy="175" r="5" fill="${r.outer}" opacity="0.7"/>
    <circle cx="150" cy="55" r="7" fill="${r.inner}" opacity="0.9"/>`;
  } else if (type === 'item') {
    bodyContent = `
    <!-- Item glow -->
    <circle cx="150" cy="135" r="75" fill="${r.outer}" opacity="0.1"/>
    <!-- Item box/pedestal -->
    <rect x="105" y="190" width="90" height="20" rx="8" fill="${theme.outfit}" opacity="0.6"/>
    <rect x="115" y="175" width="70" height="20" rx="6" fill="${theme.outfit}" opacity="0.4"/>
    <!-- Item icon -->
    <text x="150" y="165" font-size="52" text-anchor="middle">${theme.emoji}</text>
    <!-- Sparkle -->
    <text x="90" y="100" font-size="16" fill="${r.inner}" opacity="0.8">✦</text>
    <text x="202" y="108" font-size="12" fill="${r.inner}" opacity="0.7">✦</text>
    <text x="150" y="82" font-size="10" fill="${r.outer}" opacity="0.6">✦</text>`;
  } else if (type === 'location') {
    bodyContent = `
    <!-- Sky gradient -->
    <rect x="0" y="0" width="300" height="170" fill="${r.bg1}" opacity="0.6"/>
    <!-- Ground -->
    <rect x="0" y="180" width="300" height="120" fill="${theme.outfit}" opacity="0.4"/>
    <!-- Trees / pillars -->
    <rect x="55" y="120" width="18" height="70" rx="4" fill="${theme.outfit}" opacity="0.8"/>
    <ellipse cx="64" cy="112" rx="28" ry="36" fill="${theme.outfit}" opacity="0.7"/>
    <rect x="225" y="120" width="18" height="70" rx="4" fill="${theme.outfit}" opacity="0.8"/>
    <ellipse cx="234" cy="112" rx="28" ry="36" fill="${theme.outfit}" opacity="0.7"/>
    <!-- Path -->
    <path d="M 100 300 Q 150 200 200 300" fill="${r.outer}" opacity="0.2"/>
    <!-- Location emoji -->
    <text x="150" y="175" font-size="38" text-anchor="middle">${theme.emoji}</text>`;
  } else if (type === 'trap') {
    bodyContent = `
    <!-- Warning triangle -->
    <path d="M 150 50 L 260 240 L 40 240 Z" fill="none" stroke="${r.outer}" stroke-width="3" opacity="0.4"/>
    <path d="M 150 75 L 240 225 L 60 225 Z" fill="${r.outer}" opacity="0.08"/>
    <!-- Trap icon -->
    <text x="150" y="175" font-size="48" text-anchor="middle">⚠️</text>
    <!-- Spikes at bottom -->
    <path d="M 60 260 L 75 230 L 90 260 L 105 230 L 120 260 L 135 230 L 150 260 L 165 230 L 180 260 L 195 230 L 210 260 L 225 230 L 240 260" stroke="${r.outer}" stroke-width="2" fill="none" opacity="0.4"/>`;
  }

  const glowFilter = card.rarity === 'legendary'
    ? `<filter id="lg"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
    : '';

  const legendaryAura = card.rarity === 'legendary'
    ? `<circle cx="150" cy="150" r="140" fill="none" stroke="${r.outer}" stroke-width="2" opacity="0.3"/>
       <circle cx="150" cy="150" r="130" fill="none" stroke="${r.inner}" stroke-width="1" opacity="0.2"/>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
  <defs>
    ${bgFn(r, theme)}
    ${glowFilter}
  </defs>
  ${legendaryAura}
  ${bodyContent}
  <!-- Rarity corner glow -->
  <circle cx="275" cy="25" r="18" fill="${r.outer}" opacity="0.35"/>
  <circle cx="275" cy="25" r="10" fill="${r.inner}" opacity="0.5"/>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function generatePackSvg(pack) {
  const themes = {
    dungeon: { color1: '#2d1b4e', color2: '#0a0515', accent: '#7c3aed', emoji: '⚔️' },
    dragon:  { color1: '#7a1a1a', color2: '#1a0505', accent: '#ef4444', emoji: '🔥' },
    arcane:  { color1: '#1a0d4a', color2: '#05020f', accent: '#a855f7', emoji: '✦'  },
    undead:  { color1: '#0d2b0d', color2: '#020802', accent: '#22c55e', emoji: '💀' },
    nature:  { color1: '#0d3d18', color2: '#030d05', accent: '#22c55e', emoji: '🌿' },
  };
  const t = themes[pack.theme] || themes.dungeon;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="${t.color1}"/>
      <stop offset="100%" stop-color="${t.color2}"/>
    </radialGradient>
  </defs>
  <rect width="300" height="420" fill="url(#bg)"/>
  <circle cx="150" cy="190" r="100" fill="${t.accent}" opacity="0.1"/>
  <text x="150" y="210" font-size="80" text-anchor="middle">${t.emoji}</text>
  <rect x="0" y="360" width="300" height="60" fill="rgba(0,0,0,0.75)"/>
  <rect x="0" y="358" width="300" height="3" fill="${t.accent}"/>
  <text x="150" y="387" font-family="Georgia,serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">${pack.name || 'Pack'}</text>
  <text x="150" y="406" font-family="Arial,sans-serif" font-size="10" fill="${t.accent}" text-anchor="middle" letter-spacing="2">GAVELIN CARD CHRONICLES</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

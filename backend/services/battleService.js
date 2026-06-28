const db = require('../config/database');

// ============================================================
// SPECIAL EFFECT ENGINE
// ============================================================

/**
 * Terapkan efek spesial kartu saat dimainkan.
 * caster  = player yang memainkan kartu (player1 / player2 object)
 * opponent= lawan
 * card    = kartu yang dimainkan (sudah ada di field jika character)
 * isFirst = apakah ini kartu pertama yang dimainkan giliran ini
 * log     = array log untuk di-push
 */
function applySpecialEffect(card, caster, opponent, log, isFirst = false) {
  const fx = card.special_name;
  if (!fx) return;

  switch (fx) {

    // ── AMBUSH (Goblin Scout) ─────────────────────────────────────
    // Deal special_damage extra jika kartu pertama dimainkan giliran ini
    case 'Ambush': {
      if (!isFirst) break;
      const dmg = card.special_damage || 20;
      if (opponent.field.length > 0) {
        const t = opponent.field[0];
        t.currentHp -= dmg;
        opponent.field = opponent.field.filter(c => c.currentHp > 0);
        log.push({ action: 'special', effect: fx, card: card.name, damage: dmg, target: t.name });
      } else {
        opponent.hp -= dmg;
        log.push({ action: 'special', effect: fx, card: card.name, damage: dmg });
      }
      break;
    }

    // ── PACK TACTICS (Kobold Warrior) ────────────────────────────
    // +10 ATK jika ada Kobold lain di field
    case 'Pack Tactics': {
      const hasAlly = caster.field.some(c => c.name.toLowerCase().includes('kobold') && c.id !== card.id);
      if (hasAlly) {
        const fc = caster.field.find(c => c.id === card.id);
        if (fc) fc.attack += 10;
        log.push({ action: 'special', effect: fx, card: card.name, bonus: '+10 ATK' });
      }
      break;
    }

    // ── RESTORE (Healing Potion) ─────────────────────────────────
    // Pulihkan 30 HP ke player
    case 'Restore': {
      const heal = 30;
      caster.hp = Math.min(100, caster.hp + heal);
      log.push({ action: 'special', effect: fx, card: card.name, heal });
      break;
    }

    // ── LOOT (Dungeon Chest) ─────────────────────────────────────
    // Ambil 2 kartu tambahan
    case 'Loot': {
      let drew = 0;
      for (let i = 0; i < 2; i++) {
        if (caster.deck.length > 0) {
          caster.hand.push(caster.deck.shift());
          caster.drawTick = (caster.drawTick || 0) + 1;
          drew++;
        }
      }
      log.push({ action: 'special', effect: fx, card: card.name, drew });
      break;
    }

    // ── SHIELD BASH (Dwarven Fighter) ───────────────────────────
    // Deal special_damage + stun target 1 turn
    case 'Shield Bash': {
      if (opponent.field.length > 0) {
        const t = opponent.field[0];
        t.currentHp -= card.special_damage;
        if (t.currentHp > 0) t.status = 'stunned';
        opponent.field = opponent.field.filter(c => c.currentHp > 0);
        log.push({ action: 'special', effect: fx, card: card.name, damage: card.special_damage, stun: true, target: t.name });
      } else {
        opponent.hp -= card.special_damage;
        log.push({ action: 'special', effect: fx, card: card.name, damage: card.special_damage });
      }
      break;
    }

    // ── PIERCING SHOT (Elven Archer) ────────────────────────────
    // Abaikan defense, deal special_damage
    case 'Piercing Shot': {
      const dmg = card.special_damage || 25;
      if (opponent.field.length > 0) {
        const t = opponent.field[0];
        t.currentHp -= dmg;
        opponent.field = opponent.field.filter(c => c.currentHp > 0);
        log.push({ action: 'special', effect: fx, card: card.name, damage: dmg, target: t.name });
      } else {
        opponent.hp -= dmg;
        log.push({ action: 'special', effect: fx, card: card.name, damage: dmg });
      }
      break;
    }

    // ── DARK BURST (Shadow Bolt) ────────────────────────────────
    // +20 bonus jika target stunned
    case 'Dark Burst': {
      if (opponent.field.length > 0) {
        const t = opponent.field[0];
        const bonus = t.status === 'stunned' ? 20 : 0;
        const dmg = Math.max(0, card.attack - (t.defense || 0)) + bonus;
        t.currentHp -= dmg;
        opponent.field = opponent.field.filter(c => c.currentHp > 0);
        log.push({ action: 'special', effect: fx, card: card.name, damage: dmg, bonus, target: t.name });
      } else {
        opponent.hp -= card.attack;
        log.push({ action: 'special', effect: fx, card: card.name, damage: card.attack });
      }
      break;
    }

    // ── GORE (Minotaur Guard) ────────────────────────────────────
    // +15 bonus jika target HP < 50%
    case 'Gore': {
      if (opponent.field.length > 0) {
        const t = opponent.field[0];
        const bonus = t.currentHp < (t.hp / 2) ? 15 : 0;
        const dmg = card.special_damage + bonus;
        t.currentHp -= dmg;
        opponent.field = opponent.field.filter(c => c.currentHp > 0);
        log.push({ action: 'special', effect: fx, card: card.name, damage: dmg, bonus, target: t.name });
      } else {
        opponent.hp -= card.special_damage;
        log.push({ action: 'special', effect: fx, card: card.name, damage: card.special_damage });
      }
      break;
    }

    // ── BACKSTAB (Rogue Assassin) ────────────────────────────────
    // Kartu pertama: double ATK extra
    case 'Backstab': {
      if (!isFirst) break;
      const dmg = card.attack;
      if (opponent.field.length > 0) {
        const t = opponent.field[0];
        const actual = Math.max(0, dmg - (t.defense || 0));
        t.currentHp -= actual;
        opponent.field = opponent.field.filter(c => c.currentHp > 0);
        log.push({ action: 'special', effect: fx, card: card.name, damage: actual, target: t.name });
      } else {
        opponent.hp -= dmg;
        log.push({ action: 'special', effect: fx, card: card.name, damage: dmg });
      }
      break;
    }

    // ── SPLASH (Fireball) ────────────────────────────────────────
    // +20 DMG ke semua kartu musuh selain target utama
    case 'Splash': {
      if (opponent.field.length > 1) {
        for (let i = 1; i < opponent.field.length; i++) {
          opponent.field[i].currentHp -= 20;
        }
        opponent.field = opponent.field.filter(c => c.currentHp > 0);
        log.push({ action: 'special', effect: fx, card: card.name, splash: 20 });
      }
      break;
    }

    // ── EYE RAYS (Beholder) ─────────────────────────────────────
    // Deal special_damage ke SEMUA kartu musuh
    case 'Eye Rays': {
      const dmg = card.special_damage || 55;
      opponent.field.forEach(t => { t.currentHp -= dmg; });
      opponent.field = opponent.field.filter(c => c.currentHp > 0);
      log.push({ action: 'special', effect: fx, card: card.name, damage: dmg, aoe: true });
      break;
    }

    // ── MIND BLAST (Mind Flayer) ─────────────────────────────────
    // Stun semua kartu musuh di field
    case 'Mind Blast': {
      opponent.field.forEach(t => { t.status = 'stunned'; });
      log.push({ action: 'special', effect: fx, card: card.name, stun: true, targets: opponent.field.length });
      break;
    }

    // ── REALITY BEND (Dungeon Master) ────────────────────────────
    // Deal 80 ke musuh HP langsung
    case 'Reality Bend': {
      const dmg = card.special_damage || 80;
      if (opponent.field.length > 0) {
        const t = opponent.field.sort((a, b) => b.currentHp - a.currentHp)[0];
        t.currentHp -= dmg;
        opponent.field = opponent.field.filter(c => c.currentHp > 0);
        log.push({ action: 'special', effect: fx, card: card.name, damage: dmg, target: t.name });
      } else {
        opponent.hp -= dmg;
        log.push({ action: 'special', effect: fx, card: card.name, damage: dmg });
      }
      break;
    }

    // ── ILLUMINATE (Torch) ──────────────────────────────────────
    // Deal attack damage (sudah di handle default) + reveal top card lawan
    case 'Illuminate': {
      const dmg = card.attack || card.special_damage || 10;
      if (opponent.field.length > 0) {
        const t = opponent.field[0];
        const actual = Math.max(0, dmg - (t.defense || 0));
        t.currentHp -= actual;
        opponent.field = opponent.field.filter(c => c.currentHp > 0);
        log.push({ action: 'special', effect: fx, card: card.name, damage: actual, target: t.name });
      } else {
        opponent.hp -= dmg;
        log.push({ action: 'special', effect: fx, card: card.name, damage: dmg });
      }
      // Reveal top card deck lawan (masukkan ke log agar frontend bisa tampilkan)
      if (opponent.deck.length > 0) {
        const revealed = opponent.deck[0];
        log.push({ action: 'reveal', effect: fx, card: card.name, revealed: { name: revealed.name, rarity: revealed.rarity } });
      }
      break;
    }

    // ── HATCH (Dragon Egg) ──────────────────────────────────────
    // Summon Dragon Hatchling token ke field
    case 'Hatch': {
      const token = {
        id: `token_${Date.now()}`,
        name: 'Dragon Hatchling',
        card_type: 'character',
        rarity: 'common',
        hp: 20, attack: 10, defense: 5,
        currentHp: 20, status: null,
        special_name: 'Flame Breath',
        special_damage: 12,
        image_url: '/assets/cards/dragon-hatchling.png',
        isToken: true,
      };
      caster.field.push(token);
      log.push({ action: 'special', effect: fx, card: card.name, summon: token.name });
      break;
    }

    // ── AMBUSH ZONE (Dark Corridor) ─────────────────────────────
    // Semua kartu sendiri di field gain stealth (status: 'stealth')
    case 'Ambush Zone': {
      caster.field.forEach(c => { c.status = 'stealth'; });
      log.push({ action: 'special', effect: fx, card: card.name, stealth: caster.field.length });
      break;
    }

    // ── FLAME BREATH (Dragon Hatchling) ─────────────────────────
    // Deal special_damage ke satu target saat dimainkan
    case 'Flame Breath': {
      const dmg = card.special_damage || 12;
      if (opponent.field.length > 0) {
        const t = opponent.field[0];
        t.currentHp -= dmg;
        opponent.field = opponent.field.filter(c => c.currentHp > 0);
        log.push({ action: 'special', effect: fx, card: card.name, damage: dmg, target: t.name });
      } else {
        opponent.hp -= dmg;
        log.push({ action: 'special', effect: fx, card: card.name, damage: dmg });
      }
      break;
    }

    // ── DIVE BOMB (Fire Drake) ───────────────────────────────────
    // Deal special_damage + kurangi DEF target -10
    case 'Dive Bomb': {
      if (opponent.field.length > 0) {
        const t = opponent.field[0];
        t.currentHp -= card.special_damage;
        t.defense = Math.max(0, (t.defense || 0) - 10);
        if (t.currentHp > 0) t.defDebuffTurns = 2;
        opponent.field = opponent.field.filter(c => c.currentHp > 0);
        log.push({ action: 'special', effect: fx, card: card.name, damage: card.special_damage, defDebuff: -10, target: t.name });
      } else {
        opponent.hp -= card.special_damage;
        log.push({ action: 'special', effect: fx, card: card.name, damage: card.special_damage });
      }
      break;
    }

    // ── FROST NOVA (Ice Wyvern) ──────────────────────────────────
    // Freeze (stun) semua kartu lawan 1 turn
    case 'Frost Nova': {
      opponent.field.forEach(t => { t.status = 'stunned'; });
      log.push({ action: 'special', effect: fx, card: card.name, freeze: true, targets: opponent.field.length });
      break;
    }

    // ── DRAGON BOND (Dragon Knight) ──────────────────────────────
    // +30 ATK jika ada dragon di field
    case 'Dragon Bond': {
      const hasDragon = caster.field.some(c =>
        c.name.toLowerCase().includes('dragon') || c.name.toLowerCase().includes('drake') || c.name.toLowerCase().includes('wyvern')
      );
      if (hasDragon) {
        const fc = caster.field.find(c => c.id === card.id);
        if (fc) fc.attack += 30;
        log.push({ action: 'special', effect: fx, card: card.name, bonus: '+30 ATK' });
      }
      break;
    }

    // ── CATACLYSM (Ancient Red Dragon) ──────────────────────────
    // Deal 100 DMG ke semua kartu lawan + kurangi ATK mereka -20
    case 'Cataclysm': {
      const dmg = card.special_damage || 100;
      opponent.field.forEach(t => {
        t.currentHp -= dmg;
        t.attack = Math.max(0, (t.attack || 0) - 20);
      });
      opponent.field = opponent.field.filter(c => c.currentHp > 0);
      log.push({ action: 'special', effect: fx, card: card.name, damage: dmg, atkDebuff: -20, aoe: true });
      break;
    }

    default:
      break;
  }
}

// ============================================================
// DISCARD HELPER
// ============================================================

/** Pindahkan kartu non-character ke discard pile (stack di atas). */
function discardCard(player, card) {
  player.discard = player.discard || [];
  player.discard.push(card);
}

// ============================================================
// TRAP SYSTEM
// ============================================================

/**
 * Cek dan aktifkan trap milik defender saat attacker memainkan kartu character.
 * traps   = array trap milik defender (akan di-clear setelah aktif)
 * attacker= player yang baru mainkan character (kartu terakhir di field mereka)
 * log     = array log
 */
function triggerTraps(defender, attacker, log, owner) {
  if (!defender.traps || !defender.traps.length) return;

  const remaining = [];
  for (const trap of defender.traps) {
    if (trap.special_name === 'Trigger') {
      const dmg = trap.special_damage || 25;
      if (attacker.field.length > 0) {
        const t = attacker.field[attacker.field.length - 1];
        t.currentHp -= dmg;
        attacker.field = attacker.field.filter(c => c.currentHp > 0);
        log.push({ action: 'trap_trigger', effect: 'Trigger', card: trap.name, damage: dmg, target: t.name, player: owner });
      } else {
        attacker.hp -= dmg;
        log.push({ action: 'trap_trigger', effect: 'Trigger', card: trap.name, damage: dmg, player: owner });
      }
    } else {
      remaining.push(trap);
    }
  }
  defender.traps = remaining;
}

// ============================================================
// AI LOGIC
// ============================================================

const AI_DIFFICULTY = {
  easy: { aggression: 0.3, optimalPlay: 0.4 },
  normal: { aggression: 0.6, optimalPlay: 0.6 },
  hard: { aggression: 0.8, optimalPlay: 0.9 },
};

function aiChooseCard(hand, field, opponentField, energy, difficulty) {
  const cfg = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.normal;
  const playable = hand.filter(c => c.energy_cost <= energy);
  if (!playable.length) return null;

  if (Math.random() > cfg.optimalPlay) {
    return playable[Math.floor(Math.random() * playable.length)];
  }

  const characters = playable.filter(c => c.card_type === 'character');
  const spells = playable.filter(c => c.card_type === 'spell');

  if (opponentField.length > 0 && Math.random() < cfg.aggression && spells.length > 0) {
    return spells.sort((a, b) => b.attack - a.attack)[0];
  }
  if (characters.length > 0) {
    return characters.sort((a, b) => (b.attack + b.defense) - (a.attack + a.defense))[0];
  }
  return playable[0];
}

function processAITurn(gameState, difficulty = 'normal') {
  const ai = gameState.player2;
  const human = gameState.player1;
  const log = [];

  // Bersihkan stun dari giliran sebelumnya (kartu AI yang stunned)
  ai.field.forEach(c => { if (c.status === 'stunned') c.status = null; });

  let energy = ai.energyThisTurn || 3;
  let cardsPlayed = 0;

  while (true) {
    const card = aiChooseCard(ai.hand, ai.field, human.field, energy, difficulty);
    if (!card) break;

    energy -= card.energy_cost;

    const idx = ai.hand.findIndex(c => c.id === card.id);
    if (idx !== -1) ai.hand.splice(idx, 1);

    const isFirst = cardsPlayed === 0;

    if (card.card_type === 'character') {
      ai.field.push({ ...card, currentHp: card.hp, status: null });
      log.push({ action: 'play', player: 'ai', card: card.name });
      // Aktifkan trap milik human jika ada
      triggerTraps(human, ai, log, 'player1');
      // Efek on-play character
      applySpecialEffect(card, ai, human, log, isFirst);
    } else if (card.card_type === 'trap') {
      ai.traps = ai.traps || [];
      ai.traps.push({ ...card });
      discardCard(ai, card);
      log.push({ action: 'trap_set', player: 'ai', card: card.name });
    } else if (card.card_type === 'location') {
      applySpecialEffect(card, ai, human, log, isFirst);
      discardCard(ai, card);
      log.push({ action: 'location', player: 'ai', card: card.name });
    } else if (card.card_type === 'spell' || card.card_type === 'item') {
      const selfEffects = ['Restore', 'Loot', 'Hatch', 'Illuminate', 'Dark Burst'];
      if (selfEffects.includes(card.special_name)) {
        applySpecialEffect(card, ai, human, log, isFirst);
      } else {
        // Default spell: damage pakai attack stat
        if (human.field.length > 0) {
          const target = human.field.sort((a, b) => b.currentHp - a.currentHp)[0];
          const dmg = Math.max(0, card.attack - (target.defense || 0));
          target.currentHp -= dmg;
          log.push({ action: 'spell', player: 'ai', card: card.name, target: target.name, damage: dmg });
          human.field = human.field.filter(c => c.currentHp > 0);
          applySpecialEffect(card, ai, human, log, isFirst);
        } else {
          human.hp -= card.attack;
          log.push({ action: 'direct', player: 'ai', card: card.name, damage: card.attack });
        }
      }
      discardCard(ai, card);
    }

    cardsPlayed++;
    if (energy <= 0) break;
  }

  // Kartu di field AI menyerang (skip stunned, skip stealth target)
  for (const attacker of ai.field) {
    if (attacker.status === 'stunned') {
      log.push({ action: 'stunned', player: 'ai', attacker: attacker.name });
      attacker.status = null;
      continue;
    }
    const visibleTargets = human.field.filter(c => c.status !== 'stealth');
    if (visibleTargets.length > 0) {
      const target = visibleTargets[0];
      const dmg = Math.max(0, attacker.attack - (target.defense || 0));
      target.currentHp -= dmg;
      log.push({ action: 'attack', player: 'ai', attacker: attacker.name, target: target.name, damage: dmg });
      human.field = human.field.filter(c => c.currentHp > 0);
    } else if (human.field.length === 0) {
      const dmg = Math.max(0, attacker.attack - (human.defense || 0));
      human.hp -= dmg;
      log.push({ action: 'direct_attack', player: 'ai', attacker: attacker.name, damage: dmg });
    }
    // jika semua kartu human stealth: skip serangan
  }
  // Stealth player1 habis setelah AI serang
  human.field.forEach(c => { if (c.status === 'stealth') c.status = null; });

  // Draw kartu baru (AI)
  if (ai.deck.length > 0) {
    ai.hand.push(ai.deck.shift());
    ai.drawTick = (ai.drawTick || 0) + 1;
  }

  return { gameState, log };
}

// ============================================================
// WIN CONDITION
// ============================================================
function checkWinCondition(gameState) {
  if (gameState.player1.hp <= 0) return 'player2';
  if (gameState.player2.hp <= 0) return 'player1';
  if (gameState.player1.deck.length === 0 && gameState.player1.hand.length === 0) return 'player2';
  if (gameState.player2.deck.length === 0 && gameState.player2.hand.length === 0) return 'player1';
  return null;
}

// ============================================================
// INIT GAME STATE
// ============================================================
function initGameState(deck1Cards, deck2Cards) {
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
  const d1 = shuffle(deck1Cards);
  const d2 = shuffle(deck2Cards);

  return {
    turn: 1,
    phase: 'player1',
    player1: {
      hp: 100,
      defense: 0,
      energy: 3,
      hand: d1.splice(0, 4),
      deck: d1,
      field: [],
      traps: [],
      discard: [],
      cardsPlayedThisTurn: 0,
    },
    player2: {
      hp: 100,
      defense: 0,
      energy: 3,
      hand: d2.splice(0, 4),
      deck: d2,
      field: [],
      traps: [],
      discard: [],
      cardsPlayedThisTurn: 0,
    },
    log: [],
  };
}

// ============================================================
// SAVE RESULT
// ============================================================
async function saveBattleResult(battleId, winnerId, gameState) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      'UPDATE battles SET winner_id = ?, status = "completed", ended_at = NOW(), turns = ?, battle_log = ? WHERE id = ?',
      [winnerId, gameState.turn, JSON.stringify(gameState.log), battleId]
    );

    const [battle] = await conn.query('SELECT * FROM battles WHERE id = ?', [battleId]);
    const b = battle[0];

    if (b.player1_id) {
      const win1 = winnerId === b.player1_id ? 1 : 0;
      await conn.query(
        'UPDATE user_stats SET total_battles=total_battles+1, wins=wins+?, losses=losses+? WHERE user_id=?',
        [win1, 1 - win1, b.player1_id]
      );
    }
    if (b.player2_id) {
      const win2 = winnerId === b.player2_id ? 1 : 0;
      await conn.query(
        'UPDATE user_stats SET total_battles=total_battles+1, wins=wins+?, losses=losses+? WHERE user_id=?',
        [win2, 1 - win2, b.player2_id]
      );
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { initGameState, processAITurn, checkWinCondition, saveBattleResult, applySpecialEffect, triggerTraps, discardCard };

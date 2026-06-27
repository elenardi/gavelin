const db = require('../config/database');

// ============================================================
// AI LOGIC
// ============================================================

const AI_DIFFICULTY = {
  easy:   { aggression: 0.3, optimalPlay: 0.4 },
  normal: { aggression: 0.6, optimalPlay: 0.6 },
  hard:   { aggression: 0.8, optimalPlay: 0.9 },
};

/**
 * AI memilih kartu terbaik untuk dimainkan
 */
function aiChooseCard(hand, field, opponentField, energy, difficulty) {
  const cfg = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.normal;

  // Filter kartu yang bisa dimainkan (energy cukup)
  const playable = hand.filter(c => c.energy_cost <= energy);
  if (!playable.length) return null;

  if (Math.random() > cfg.optimalPlay) {
    // Random play (lebih manusiawi)
    return playable[Math.floor(Math.random() * playable.length)];
  }

  // Pilih kartu dengan ATK tertinggi jika ada ancaman
  const characters = playable.filter(c => c.card_type === 'character');
  const spells     = playable.filter(c => c.card_type === 'spell');

  if (opponentField.length > 0 && Math.random() < cfg.aggression && spells.length > 0) {
    return spells.sort((a, b) => b.attack - a.attack)[0];
  }

  if (characters.length > 0) {
    return characters.sort((a, b) => (b.attack + b.defense) - (a.attack + a.defense))[0];
  }

  return playable[0];
}

/**
 * Proses 1 turn AI
 */
function processAITurn(gameState, difficulty = 'normal') {
  const ai    = gameState.player2;
  const human = gameState.player1;
  const log   = [];

  let energy = ai.energyThisTurn || 3;

  while (true) {
    const card = aiChooseCard(ai.hand, ai.field, human.field, energy, difficulty);
    if (!card) break;

    energy -= card.energy_cost;

    // Remove dari hand
    const idx = ai.hand.findIndex(c => c.id === card.id);
    if (idx !== -1) ai.hand.splice(idx, 1);

    if (card.card_type === 'character') {
      ai.field.push({ ...card, currentHp: card.hp, status: null });
      log.push({ action: 'play', player: 'ai', card: card.name });
    } else if (card.card_type === 'spell' || card.card_type === 'item') {
      // Target: kartu dengan HP tertinggi di pihak manusia
      if (human.field.length > 0) {
        const target = human.field.sort((a, b) => b.currentHp - a.currentHp)[0];
        const dmg = Math.max(0, card.attack - (target.defense || 0));
        target.currentHp -= dmg;
        log.push({ action: 'spell', player: 'ai', card: card.name, target: target.name, damage: dmg });
        human.field = human.field.filter(c => c.currentHp > 0);
      } else {
        human.hp -= card.attack;
        log.push({ action: 'direct', player: 'ai', card: card.name, damage: card.attack });
      }
    }
    if (energy <= 0) break;
  }

  // Kartu di field AI menyerang
  for (const attacker of ai.field) {
    if (human.field.length > 0) {
      const target = human.field[0];
      const dmg = Math.max(0, attacker.attack - (target.defense || 0));
      target.currentHp -= dmg;
      log.push({ action: 'attack', player: 'ai', attacker: attacker.name, target: target.name, damage: dmg });
      human.field = human.field.filter(c => c.currentHp > 0);
    } else {
      const dmg = Math.max(0, attacker.attack - human.defense);
      human.hp -= dmg;
      log.push({ action: 'direct_attack', player: 'ai', attacker: attacker.name, damage: dmg });
    }
  }

  // Draw kartu baru
  if (ai.deck.length > 0) {
    ai.hand.push(ai.deck.shift());
  }

  return { gameState, log };
}

/**
 * Check apakah game sudah selesai
 */
function checkWinCondition(gameState) {
  if (gameState.player1.hp <= 0) return 'player2';
  if (gameState.player2.hp <= 0) return 'player1';
  if (gameState.player1.deck.length === 0 && gameState.player1.hand.length === 0) return 'player2';
  if (gameState.player2.deck.length === 0 && gameState.player2.hand.length === 0) return 'player1';
  return null;
}

/**
 * Initialize game state dari deck
 */
function initGameState(deck1Cards, deck2Cards) {
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
  const d1 = shuffle(deck1Cards);
  const d2 = shuffle(deck2Cards);

  return {
    turn:    1,
    phase:   'player1', // player1 atau player2
    player1: {
      hp:     100,
      defense: 0,
      energy:  3,
      hand:    d1.splice(0, 4),
      deck:    d1,
      field:   [],
    },
    player2: {
      hp:     100,
      defense: 0,
      energy:  3,
      hand:    d2.splice(0, 4),
      deck:    d2,
      field:   [],
    },
    log: [],
  };
}

/**
 * Simpan hasil battle ke DB
 */
async function saveBattleResult(battleId, winnerId, gameState) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      'UPDATE battles SET winner_id = ?, status = "completed", ended_at = NOW(), turns = ?, battle_log = ? WHERE id = ?',
      [winnerId, gameState.turn, JSON.stringify(gameState.log), battleId]
    );

    // Update stats
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

module.exports = { initGameState, processAITurn, checkWinCondition, saveBattleResult };

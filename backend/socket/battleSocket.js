const jwt = require('jsonwebtoken');
const db  = require('../config/database');
const { initGameState, processAITurn, checkWinCondition, saveBattleResult, applySpecialEffect, triggerTraps, discardCard } = require('../services/battleService');

// Active game states di memory
const gameStates = new Map(); // battleId -> gameState
const waitingRooms = new Map(); // userId -> { socket, deckId }

module.exports = function setupBattleSocket(io) {
  // Auth middleware untuk socket
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const [rows] = await db.query('SELECT id, username FROM users WHERE id=? AND is_active=1', [decoded.id]);
      if (!rows.length) return next(new Error('User not found'));
      socket.user = rows[0];
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] ${socket.user.username} connected (${socket.id})`);

    // ── Join battle room ──────────────────────────────────
    socket.on('join_battle', async ({ battleId }) => {
      const [battles] = await db.query('SELECT * FROM battles WHERE id=?', [battleId]);
      if (!battles.length) return socket.emit('error', { message: 'Battle tidak ditemukan.' });
      socket.join(`battle:${battleId}`);
      socket.emit('joined', { battleId });
    });

    // ── Start AI Battle ───────────────────────────────────
    socket.on('start_ai_battle', async ({ deckId, difficulty = 'normal' }) => {
      try {
        const [deckCards] = await db.query(
          `SELECT c.*, uc.current_level, c.upgrade_stats
           FROM deck_cards dc
           JOIN cards c ON dc.card_id = c.id
           JOIN user_cards uc ON uc.card_id = c.id AND uc.user_id = ?
           WHERE dc.deck_id = ?
             AND EXISTS (SELECT 1 FROM decks d WHERE d.id = dc.deck_id AND d.user_id = ?)`,
          [socket.user.id, deckId, socket.user.id]
        );
        if (deckCards.length < 5) return socket.emit('error', { message: 'Deck butuh minimal 5 kartu.' });

        // Terapkan bonus stat sesuai level kartu milik user
        const applyLevelBonus = (card) => {
          const lvl = card.current_level || 1;
          if (lvl <= 1 || !card.upgrade_stats) return card;
          const stats = typeof card.upgrade_stats === 'string'
            ? JSON.parse(card.upgrade_stats) : card.upgrade_stats;
          const bonus = stats.find(u => u.level === lvl);
          if (!bonus) return card;
          return {
            ...card,
            base_hp:      card.hp,
            base_attack:  card.attack,
            base_defense: card.defense,
            hp:      card.hp      + (bonus.hp  || 0),
            attack:  card.attack  + (bonus.atk || 0),
            defense: card.defense + (bonus.def || 0),
            upgrade_stats: null,  // sudah di-apply, cegah CardRenderer double-count
          };
        };

        const boostedDeckCards = deckCards.map(applyLevelBonus);

        const [aiCards] = await db.query('SELECT * FROM cards WHERE is_active=1 ORDER BY RAND() LIMIT 20');
        const [result] = await db.query(
          'INSERT INTO battles (player1_id, deck1_id, is_ai, ai_difficulty, status) VALUES (?, ?, 1, ?, "in_progress")',
          [socket.user.id, deckId, difficulty]
        );
        const battleId = result.insertId;
        const gameState = initGameState(boostedDeckCards, aiCards);
        gameState.battleId = battleId;
        gameState.difficulty = difficulty;
        gameStates.set(battleId, gameState);

        socket.join(`battle:${battleId}`);
        socket.emit('battle_started', { battleId, gameState, yourRole: 'player1' });
      } catch (err) {
        console.error(err);
        socket.emit('error', { message: 'Gagal memulai battle.' });
      }
    });

    // ── Player plays a card ───────────────────────────────
    socket.on('play_card', async ({ battleId, cardId, targetId }) => {
      const gs = gameStates.get(parseInt(battleId));
      if (!gs) return socket.emit('error', { message: 'Battle state tidak ditemukan.' });
      if (gs.phase !== 'player1') return socket.emit('error', { message: 'Bukan giliran kamu.' });

      const player = gs.player1;
      const cardIdx = player.hand.findIndex(c => c.id === cardId);
      if (cardIdx === -1) return socket.emit('error', { message: 'Kartu tidak ada di tangan.' });

      const card = player.hand[cardIdx];
      if (card.energy_cost > player.energy) return socket.emit('error', { message: 'Energy tidak cukup.' });

      player.energy -= card.energy_cost;
      player.hand.splice(cardIdx, 1);

      const isFirst = (player.cardsPlayedThisTurn || 0) === 0;
      player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn || 0) + 1;

      let log = [];

      if (card.card_type === 'character') {
        player.field.push({ ...card, currentHp: card.hp, status: null });
        log.push({ action: 'play', player: 'player1', card: card.name });
        // Aktifkan trap milik AI jika ada
        triggerTraps(gs.player2, player, log, 'ai');
        // Efek on-play character
        applySpecialEffect(card, player, gs.player2, log, isFirst);

      } else if (card.card_type === 'trap') {
        player.traps = player.traps || [];
        player.traps.push({ ...card });
        discardCard(player, card);
        log.push({ action: 'trap_set', player: 'player1', card: card.name });

      } else if (card.card_type === 'location') {
        applySpecialEffect(card, player, gs.player2, log, isFirst);
        discardCard(player, card);
        log.push({ action: 'location', player: 'player1', card: card.name });

      } else if (card.card_type === 'spell' || card.card_type === 'item') {
        const selfEffects = ['Restore', 'Loot', 'Hatch', 'Illuminate', 'Dark Burst'];
        if (selfEffects.includes(card.special_name)) {
          applySpecialEffect(card, player, gs.player2, log, isFirst);
        } else if (targetId) {
          const target = gs.player2.field.find(c => c.id === targetId);
          if (target) {
            const dmg = Math.max(0, card.attack - (target.defense || 0));
            target.currentHp -= dmg;
            gs.player2.field = gs.player2.field.filter(c => c.currentHp > 0);
            log.push({ action: 'spell', player: 'player1', card: card.name, target: target.name, damage: dmg });
            applySpecialEffect(card, player, gs.player2, log, isFirst);
          }
        } else {
          gs.player2.hp -= card.attack;
          log.push({ action: 'direct', player: 'player1', card: card.name, damage: card.attack });
        }
        discardCard(player, card);
      }

      gs.log.push(...log);
      gs.lastAction = { type: 'play_card', card, log };

      const winner = checkWinCondition(gs);
      if (winner) {
        const winnerId = winner === 'player1' ? socket.user.id : null;
        await saveBattleResult(battleId, winnerId, gs);
        gameStates.delete(parseInt(battleId));
        io.to(`battle:${battleId}`).emit('battle_ended', { winner, gameState: gs });
        return;
      }

      io.to(`battle:${battleId}`).emit('game_update', { gameState: gs, log });
    });

    // ── Manual attack: kartu field player menyerang ──────
    socket.on('attack_card', async ({ battleId, attackerId, targetId }) => {
      const gs = gameStates.get(parseInt(battleId));
      if (!gs) return socket.emit('error', { message: 'Battle tidak ditemukan.' });
      if (gs.phase !== 'player1') return socket.emit('error', { message: 'Bukan giliran kamu.' });

      const attacker = gs.player1.field.find(c => c.id === attackerId);
      if (!attacker) return socket.emit('error', { message: 'Kartu penyerang tidak ditemukan.' });
      if (attacker.hasAttacked) return socket.emit('error', { message: 'Kartu ini sudah menyerang giliran ini.' });
      if (attacker.status === 'stunned') return socket.emit('error', { message: `${attacker.name} sedang stunned!` });

      const log = [];
      if (targetId) {
        const target = gs.player2.field.find(c => c.id === targetId);
        if (!target) return socket.emit('error', { message: 'Target tidak ditemukan.' });
        if (target.status === 'stealth') return socket.emit('error', { message: `${target.name} sedang dalam stealth!` });
        const dmg = Math.max(0, attacker.attack - (target.defense || 0));
        target.currentHp -= dmg;
        gs.player2.field = gs.player2.field.filter(c => c.currentHp > 0);
        log.push({ action: 'attack', player: 'player1', attacker: attacker.name, target: target.name, damage: dmg });
      } else {
        // Serang langsung ke HP musuh (hanya boleh jika tidak ada kartu non-stealth di field)
        const visibleTargets = gs.player2.field.filter(c => c.status !== 'stealth');
        if (visibleTargets.length > 0) return socket.emit('error', { message: 'Harus menyerang kartu musuh terlebih dahulu.' });
        const dmg = Math.max(0, attacker.attack - gs.player2.defense);
        gs.player2.hp -= dmg;
        log.push({ action: 'direct_attack', player: 'player1', attacker: attacker.name, damage: dmg });
      }

      attacker.hasAttacked = true;
      gs.log.push(...log);

      const winner = checkWinCondition(gs);
      if (winner) {
        const winnerId = winner === 'player1' ? socket.user.id : null;
        await saveBattleResult(battleId, winnerId, gs);
        gameStates.delete(parseInt(battleId));
        io.to(`battle:${battleId}`).emit('battle_ended', { winner, gameState: gs });
        return;
      }

      io.to(`battle:${battleId}`).emit('game_update', { gameState: gs, log });
    });

    // ── End player turn → AI responds ────────────────────
    socket.on('end_turn', async ({ battleId }) => {
      const gs = gameStates.get(parseInt(battleId));
      if (!gs || gs.phase !== 'player1') return;

      // Kartu yang belum menyerang manual → auto attack (skip stealth targets)
      const attackLog = [];
      for (const attacker of gs.player1.field) {
        if (attacker.hasAttacked) continue;
        const visibleEnemies = gs.player2.field.filter(c => c.status !== 'stealth');
        if (visibleEnemies.length > 0) {
          const target = visibleEnemies[0];
          const dmg = Math.max(0, attacker.attack - (target.defense || 0));
          target.currentHp -= dmg;
          attackLog.push({ action: 'attack', player: 'player1', attacker: attacker.name, target: target.name, damage: dmg });
          gs.player2.field = gs.player2.field.filter(c => c.currentHp > 0);
        } else if (gs.player2.field.length === 0) {
          const dmg = Math.max(0, attacker.attack - gs.player2.defense);
          gs.player2.hp -= dmg;
          attackLog.push({ action: 'direct_attack', player: 'player1', attacker: attacker.name, damage: dmg });
        }
        // jika semua musuh stealth: skip serangan
      }
      // Stealth AI habis setelah player1 serang
      gs.player2.field.forEach(c => { if (c.status === 'stealth') c.status = null; });
      gs.log.push(...attackLog);

      // Draw kartu baru (player)
      if (gs.player1.deck.length > 0) {
        gs.player1.hand.push(gs.player1.deck.shift());
        gs.player1.drawTick = (gs.player1.drawTick || 0) + 1;
      }

      gs.phase = 'player2';
      gs.turn++;

      io.to(`battle:${battleId}`).emit('game_update', { gameState: gs, log: attackLog, phase: 'ai_turn' });

      // AI turn dengan delay supaya terasa natural
      setTimeout(async () => {
        gs.player2.energy = 3 + Math.floor(gs.turn / 3); // Energy AI meningkat
        gs.player2.energyThisTurn = gs.player2.energy;

        const { gameState: newGs, log: aiLog } = processAITurn(gs, gs.difficulty || 'normal');
        newGs.phase = 'player1';
        newGs.player1.energy = 3 + Math.floor(newGs.turn / 3);
        newGs.player1.cardsPlayedThisTurn = 0;
        // Reset flag serangan & bersihkan stun player1
        newGs.player1.field.forEach(c => {
          c.hasAttacked = false;
          if (c.status === 'stunned') c.status = null;
        });

        const winner = checkWinCondition(newGs);
        if (winner) {
          const winnerId = winner === 'player1' ? socket.user.id : null;
          await saveBattleResult(battleId, winnerId, newGs);
          gameStates.delete(parseInt(battleId));
          io.to(`battle:${battleId}`).emit('battle_ended', { winner, gameState: newGs });
          return;
        }

        gameStates.set(parseInt(battleId), newGs);
        io.to(`battle:${battleId}`).emit('game_update', { gameState: newGs, log: aiLog, phase: 'player1_turn' });
      }, 1500);
    });

    // ── Surrender ─────────────────────────────────────────
    socket.on('surrender', async ({ battleId }) => {
      const gs = gameStates.get(parseInt(battleId));
      if (gs) {
        await saveBattleResult(battleId, null, gs);
        gameStates.delete(parseInt(battleId));
      }
      socket.emit('battle_ended', { winner: 'opponent', surrendered: true });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] ${socket.user.username} disconnected`);
    });
  });
};

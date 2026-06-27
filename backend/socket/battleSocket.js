const jwt = require('jsonwebtoken');
const db  = require('../config/database');
const { initGameState, processAITurn, checkWinCondition, saveBattleResult } = require('../services/battleService');

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
          'SELECT c.* FROM deck_cards dc JOIN cards c ON dc.card_id=c.id WHERE dc.deck_id=? AND EXISTS(SELECT 1 FROM decks d WHERE d.id=dc.deck_id AND d.user_id=?)',
          [deckId, socket.user.id]
        );
        if (deckCards.length < 5) return socket.emit('error', { message: 'Deck butuh minimal 5 kartu.' });

        const [aiCards] = await db.query('SELECT * FROM cards WHERE is_active=1 ORDER BY RAND() LIMIT 20');
        const [result] = await db.query(
          'INSERT INTO battles (player1_id, deck1_id, is_ai, ai_difficulty, status) VALUES (?, ?, 1, ?, "in_progress")',
          [socket.user.id, deckId, difficulty]
        );
        const battleId = result.insertId;
        const gameState = initGameState(deckCards, aiCards);
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

      let log = [];

      if (card.card_type === 'character') {
        player.field.push({ ...card, currentHp: card.hp, status: null });
        log.push({ action: 'play', player: 'player1', card: card.name });
      } else if (card.card_type === 'spell' || card.card_type === 'item') {
        if (targetId) {
          const target = gs.player2.field.find(c => c.id === targetId);
          if (target) {
            const dmg = Math.max(0, card.attack - (target.defense || 0));
            target.currentHp -= dmg;
            gs.player2.field = gs.player2.field.filter(c => c.currentHp > 0);
            log.push({ action: 'spell', player: 'player1', card: card.name, target: target.name, damage: dmg });
          }
        } else {
          gs.player2.hp -= card.attack;
          log.push({ action: 'direct', player: 'player1', card: card.name, damage: card.attack });
        }
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

    // ── End player turn → AI responds ────────────────────
    socket.on('end_turn', async ({ battleId }) => {
      const gs = gameStates.get(parseInt(battleId));
      if (!gs || gs.phase !== 'player1') return;

      // Kartu player di field menyerang
      const attackLog = [];
      for (const attacker of gs.player1.field) {
        if (gs.player2.field.length > 0) {
          const target = gs.player2.field[0];
          const dmg = Math.max(0, attacker.attack - (target.defense || 0));
          target.currentHp -= dmg;
          attackLog.push({ action: 'attack', player: 'player1', attacker: attacker.name, target: target.name, damage: dmg });
          gs.player2.field = gs.player2.field.filter(c => c.currentHp > 0);
        } else {
          const dmg = Math.max(0, attacker.attack - gs.player2.defense);
          gs.player2.hp -= dmg;
          attackLog.push({ action: 'direct_attack', player: 'player1', attacker: attacker.name, damage: dmg });
        }
      }
      gs.log.push(...attackLog);

      // Draw kartu baru
      if (gs.player1.deck.length > 0) gs.player1.hand.push(gs.player1.deck.shift());

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

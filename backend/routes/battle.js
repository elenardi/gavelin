const express = require('express');
const db      = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { initGameState, processAITurn, checkWinCondition, saveBattleResult } = require('../services/battleService');

const router = express.Router();

// ── Battle vs AI ────────────────────────────────────────────
router.post('/ai/start', authMiddleware, async (req, res) => {
  const { deckId, difficulty = 'normal' } = req.body;

  // Validasi deck
  const [decks] = await db.query('SELECT * FROM decks WHERE id=? AND user_id=? AND is_active=1', [deckId, req.user.id]);
  if (!decks.length) return res.status(404).json({ error: 'Deck tidak ditemukan.' });

  // Ambil kartu deck player
  const [deckCards] = await db.query(
    `SELECT c.* FROM deck_cards dc JOIN cards c ON dc.card_id=c.id WHERE dc.deck_id=? ORDER BY dc.position`,
    [deckId]
  );
  if (deckCards.length < 5) return res.status(400).json({ error: 'Deck harus punya minimal 5 kartu.' });

  // Buat deck AI (random dari semua kartu)
  const [aiCards] = await db.query('SELECT * FROM cards WHERE is_active=1 ORDER BY RAND() LIMIT 20');

  const gameState = initGameState(deckCards, aiCards);

  // Simpan battle ke DB
  const [result] = await db.query(
    'INSERT INTO battles (player1_id, deck1_id, is_ai, ai_difficulty, status) VALUES (?, ?, 1, ?, "in_progress")',
    [req.user.id, deckId, difficulty]
  );
  const battleId = result.insertId;

  res.json({ battleId, gameState, message: 'Battle dimulai! Giliran kamu pertama.' });
});

// ── Proses turn player vs AI ────────────────────────────────
router.post('/ai/:battleId/turn', authMiddleware, async (req, res) => {
  const { battleId } = req.params;
  const { playedCards, targetCardId } = req.body;
  // playedCards: array of card IDs yang dimainkan player
  // targetCardId: ID kartu yang diserang (opsional)

  const [battles] = await db.query(
    'SELECT * FROM battles WHERE id=? AND player1_id=? AND status="in_progress"',
    [battleId, req.user.id]
  );
  if (!battles.length) return res.status(404).json({ error: 'Battle tidak ditemukan.' });

  // Note: gameState di-store di memory/Redis untuk produksi.
  // Untuk demo, kita return logika sederhana.
  res.json({
    message: 'Turn diproses. Fitur full battle state management memerlukan Redis/session storage.',
    tip: 'Gunakan Socket.IO untuk real-time battle state yang disimpan di server memory.',
  });
});

// ── Matchmaking PvP ─────────────────────────────────────────
router.post('/pvp/queue', authMiddleware, async (req, res) => {
  const { deckId } = req.body;
  const [decks] = await db.query('SELECT * FROM decks WHERE id=? AND user_id=? AND is_active=1', [deckId, req.user.id]);
  if (!decks.length) return res.status(404).json({ error: 'Deck tidak ditemukan.' });

  // Cari lawan yang sedang menunggu
  const [waiting] = await db.query(
    'SELECT * FROM battles WHERE status="waiting" AND player1_id != ? AND player2_id IS NULL ORDER BY started_at ASC LIMIT 1',
    [req.user.id]
  );

  if (waiting.length) {
    const battle = waiting[0];
    await db.query(
      'UPDATE battles SET player2_id=?, deck2_id=?, status="in_progress" WHERE id=?',
      [req.user.id, deckId, battle.id]
    );
    return res.json({ battleId: battle.id, role: 'player2', message: 'Lawan ditemukan! Battle dimulai.' });
  }

  // Tidak ada lawan, buat room baru
  const [result] = await db.query(
    'INSERT INTO battles (player1_id, deck1_id, status) VALUES (?, ?, "waiting")',
    [req.user.id, deckId]
  );
  res.json({ battleId: result.insertId, role: 'player1', message: 'Mencari lawan... Menunggu.' });
});

// ── Riwayat battle ──────────────────────────────────────────
router.get('/history', authMiddleware, async (req, res) => {
  const [rows] = await db.query(`
    SELECT b.*,
           u1.username AS player1_name, u1.avatar_url AS player1_avatar,
           u2.username AS player2_name, u2.avatar_url AS player2_avatar,
           uw.username AS winner_name
    FROM battles b
    LEFT JOIN users u1 ON b.player1_id=u1.id
    LEFT JOIN users u2 ON b.player2_id=u2.id
    LEFT JOIN users uw ON b.winner_id=uw.id
    WHERE (b.player1_id=? OR b.player2_id=?) AND b.status='completed'
    ORDER BY b.ended_at DESC
    LIMIT 20
  `, [req.user.id, req.user.id]);
  res.json({ history: rows });
});

// ── Leaderboard ─────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  const [rows] = await db.query(`
    SELECT u.id, u.username, u.avatar_url, u.title, u.level,
           us.wins, us.total_battles, us.highest_streak,
           ROUND(us.wins / GREATEST(us.total_battles, 1) * 100, 1) AS win_rate
    FROM user_stats us
    JOIN users u ON us.user_id=u.id
    WHERE us.total_battles >= 5
    ORDER BY us.wins DESC, win_rate DESC
    LIMIT 50
  `);
  res.json({ leaderboard: rows });
});

module.exports = router;

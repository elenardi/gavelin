const express = require('express');
const db      = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Koleksi kartu user ──────────────────────────────────────
router.get('/cards', authMiddleware, async (req, res) => {
  const { rarity, type, class: cardClass, pack, search, sort } = req.query;
  let sql = `
    SELECT uc.*, c.name, c.card_type, c.rarity, c.class, c.hp, c.attack, c.defense,
           c.energy_cost, c.special_name, c.special_desc, c.image_url, c.pack_id,
           c.upgrade_stats, c.dust_cost, c.max_level, p.name AS pack_name
    FROM user_cards uc
    JOIN cards c ON uc.card_id = c.id
    JOIN packs p ON c.pack_id = p.id
    WHERE uc.user_id = ?
  `;
  const params = [req.user.id];

  if (rarity)    { sql += ' AND c.rarity = ?';    params.push(rarity); }
  if (type)      { sql += ' AND c.card_type = ?'; params.push(type); }
  if (cardClass) { sql += ' AND c.class = ?';     params.push(cardClass); }
  if (pack)      { sql += ' AND c.pack_id = ?';   params.push(pack); }
  if (search)    { sql += ' AND c.name LIKE ?';   params.push(`%${search}%`); }

  const sortMap = {
    'name_asc':    'c.name ASC',
    'name_desc':   'c.name DESC',
    'rarity_asc':  'FIELD(c.rarity,"common","uncommon","rare","epic","legendary") ASC',
    'rarity_desc': 'FIELD(c.rarity,"common","uncommon","rare","epic","legendary") DESC',
    'newest':      'uc.obtained_at DESC',
  };
  sql += ` ORDER BY ${sortMap[sort] || 'FIELD(c.rarity,"legendary","epic","rare","uncommon","common"), c.name'}`;

  const [rows] = await db.query(sql, params);
  res.json({ cards: rows, total: rows.length });
});

// ── Upgrade kartu (seperti Marvel Snap) ────────────────────
router.post('/cards/:cardId/upgrade', authMiddleware, async (req, res) => {
  const { cardId } = req.params;
  const userId = req.user.id;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [ucRows] = await conn.query(
      'SELECT uc.*, c.max_level, c.dust_cost FROM user_cards uc JOIN cards c ON uc.card_id=c.id WHERE uc.user_id=? AND uc.card_id=? FOR UPDATE',
      [userId, cardId]
    );
    if (!ucRows.length) return res.status(404).json({ error: 'Kartu tidak ditemukan di koleksi kamu.' });
    const uc = ucRows[0];

    if (uc.current_level >= uc.max_level) {
      await conn.rollback();
      return res.status(400).json({ error: 'Kartu sudah di level maksimum.' });
    }

    const dustCost = typeof uc.dust_cost === 'string' ? JSON.parse(uc.dust_cost) : uc.dust_cost;
    const nextLevel = uc.current_level + 1;
    const cost = dustCost?.[String(nextLevel)] || 0;

    if (uc.card_dust_pool < cost) {
      await conn.rollback();
      return res.status(400).json({ error: `Dust kartu tidak cukup. Butuh ${cost}, punya ${uc.card_dust_pool}.` });
    }

    await conn.query(
      'UPDATE user_cards SET current_level=?, card_dust_pool=card_dust_pool-? WHERE user_id=? AND card_id=?',
      [nextLevel, cost, userId, cardId]
    );

    // Update mission
    const now = new Date();
    const [missions] = await conn.query(`
      SELECT um.id FROM user_missions um
      JOIN missions m ON um.mission_id=m.id
      WHERE um.user_id=? AND m.task_type='upgrade_card' AND um.is_completed=0 AND um.reset_at>?
    `, [userId, now]);
    for (const um of missions) {
      await conn.query('UPDATE user_missions SET progress=progress+1, is_completed=(progress+1>=target_count) WHERE id=?', [um.id]);
    }

    await conn.query('UPDATE user_stats SET cards_upgraded=cards_upgraded+1 WHERE user_id=?', [userId]);
    await conn.commit();

    res.json({ message: `Kartu berhasil diupgrade ke Level ${nextLevel}!`, newLevel: nextLevel });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Gagal upgrade kartu.' });
  } finally {
    conn.release();
  }
});

// ── Convert duplikat jadi dust ──────────────────────────────
router.post('/cards/:cardId/convert', authMiddleware, async (req, res) => {
  const { cardId } = req.params;
  const { amount = 1 } = req.body;
  const userId = req.user.id;

  const [ucRows] = await db.query(
    'SELECT uc.*, c.name FROM user_cards uc JOIN cards c ON uc.card_id=c.id WHERE uc.user_id=? AND uc.card_id=?',
    [userId, cardId]
  );
  if (!ucRows.length || ucRows[0].quantity <= 1) {
    return res.status(400).json({ error: 'Tidak ada kartu duplikat yang bisa dikonversi.' });
  }

  const uc = ucRows[0];
  const convertable = uc.quantity - 1; // Selalu simpan minimal 1
  const toConvert = Math.min(amount, convertable);

  if (toConvert <= 0) return res.status(400).json({ error: 'Jumlah konversi tidak valid.' });

  // Setiap duplikat menghasilkan dust berdasarkan rarity
  const dustPerCard = { common: 5, uncommon: 15, rare: 50, epic: 150, legendary: 500 };
  const cardRarityRow = await db.query('SELECT rarity FROM cards WHERE id=?', [cardId]);
  const rarity = cardRarityRow[0][0]?.rarity || 'common';
  const dustGained = (dustPerCard[rarity] || 5) * toConvert;

  await db.query(
    'UPDATE user_cards SET quantity=quantity-?, card_dust_pool=card_dust_pool+? WHERE user_id=? AND card_id=?',
    [toConvert, dustGained, userId, cardId]
  );

  res.json({ message: `${toConvert} kartu "${uc.name}" dikonversi menjadi ${dustGained} dust kartu!`, dustGained });
});

// ── Deck CRUD ───────────────────────────────────────────────
router.get('/decks', authMiddleware, async (req, res) => {
  const [decks] = await db.query(
    'SELECT d.*, c.image_url AS cover_image FROM decks d LEFT JOIN cards c ON d.cover_card_id=c.id WHERE d.user_id=? AND d.is_active=1',
    [req.user.id]
  );
  for (const deck of decks) {
    const [cards] = await db.query(
      `SELECT dc.card_id, dc.position, c.name, c.card_type, c.rarity, c.image_url, c.energy_cost,
              uc.current_level
       FROM deck_cards dc
       JOIN cards c ON dc.card_id=c.id
       LEFT JOIN user_cards uc ON uc.card_id=c.id AND uc.user_id=?
       WHERE dc.deck_id=? ORDER BY dc.position`,
      [req.user.id, deck.id]
    );
    deck.cards = cards;
  }
  res.json({ decks });
});

router.post('/decks', authMiddleware, async (req, res) => {
  const { name, description, cards, cover_card_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama deck wajib diisi.' });
  if (!cards || cards.length > 20) return res.status(400).json({ error: 'Deck harus 1–20 kartu.' });

  const [result] = await db.query(
    'INSERT INTO decks (user_id, name, description, cover_card_id) VALUES (?, ?, ?, ?)',
    [req.user.id, name, description, cover_card_id || null]
  );
  const deckId = result.insertId;

  if (cards.length > 0) {
    const values = cards.map((cid, idx) => [deckId, cid, idx]);
    await db.query('INSERT INTO deck_cards (deck_id, card_id, position) VALUES ?', [values]);
  }

  res.status(201).json({ message: 'Deck berhasil dibuat!', deckId });
});

router.put('/decks/:id', authMiddleware, async (req, res) => {
  const { name, description, cards, cover_card_id } = req.body;
  const [own] = await db.query('SELECT id FROM decks WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!own.length) return res.status(404).json({ error: 'Deck tidak ditemukan.' });

  await db.query('UPDATE decks SET name=?, description=?, cover_card_id=? WHERE id=?',
    [name, description, cover_card_id, req.params.id]);

  if (cards) {
    await db.query('DELETE FROM deck_cards WHERE deck_id=?', [req.params.id]);
    if (cards.length > 0) {
      const values = cards.map((cid, idx) => [req.params.id, cid, idx]);
      await db.query('INSERT INTO deck_cards (deck_id, card_id, position) VALUES ?', [values]);
    }
  }

  res.json({ message: 'Deck diperbarui!' });
});

router.delete('/decks/:id', authMiddleware, async (req, res) => {
  await db.query('UPDATE decks SET is_active=0 WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  res.json({ message: 'Deck dihapus.' });
});

module.exports = router;

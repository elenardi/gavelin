const express = require('express');
const db      = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { openPack, regenSlotsIfNeeded } = require('../services/packService');

const router = express.Router();

// ── Daftar semua pack ───────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM packs WHERE is_active=1 ORDER BY is_featured DESC, release_date DESC'
  );

  // Regen slot jika sudah waktunya
  await regenSlotsIfNeeded(req.user);
  const [user] = await db.query('SELECT pack_slots FROM users WHERE id=?', [req.user.id]);

  res.json({ packs: rows, packSlots: user[0].pack_slots });
});

// ── Detail pack (termasuk daftar kartu) ────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  const [packs] = await db.query('SELECT * FROM packs WHERE id=? AND is_active=1', [req.params.id]);
  if (!packs.length) return res.status(404).json({ error: 'Pack tidak ditemukan.' });

  const [cards] = await db.query(
    'SELECT * FROM cards WHERE pack_id=? AND is_active=1 ORDER BY rarity, name',
    [req.params.id]
  );
  res.json({ pack: packs[0], cards });
});

// ── Buka pack ───────────────────────────────────────────────
router.post('/:id/open', authMiddleware, async (req, res) => {
  try {
    const { paymentMethod } = req.body; // null | 'gold' | 'gems'
    const result = await openPack(req.user.id, req.params.id, paymentMethod || null);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membuka pack.' });
  }
});

// ── Riwayat buka pack ──────────────────────────────────────
router.get('/history/mine', authMiddleware, async (req, res) => {
  const [rows] = await db.query(
    `SELECT po.*, p.name AS pack_name, p.image_url AS pack_image
     FROM pack_openings po
     JOIN packs p ON po.pack_id = p.id
     WHERE po.user_id = ?
     ORDER BY po.opened_at DESC
     LIMIT 20`,
    [req.user.id]
  );
  res.json({ history: rows });
});

module.exports = router;

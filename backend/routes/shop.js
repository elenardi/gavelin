const express = require('express');
const db      = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Daftar item shop ────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  const [items] = await db.query(
    'SELECT * FROM shop_items WHERE is_active=1 ORDER BY is_featured DESC, item_type, name'
  );
  res.json({ items });
});

// ── Beli item ────────────────────────────────────────────────
router.post('/buy/:itemId', authMiddleware, async (req, res) => {
  const { quantity = 1 } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [items] = await conn.query('SELECT * FROM shop_items WHERE id=? AND is_active=1', [req.params.itemId]);
    if (!items.length) return res.status(404).json({ error: 'Item tidak ditemukan.' });
    const item = items[0];

    // Cek stock
    if (item.stock !== -1 && item.stock < quantity) {
      await conn.rollback();
      return res.status(400).json({ error: 'Stok tidak cukup.' });
    }

    const [users] = await conn.query('SELECT gold, gems FROM users WHERE id=? FOR UPDATE', [req.user.id]);
    const user = users[0];
    const totalGold = item.cost_gold * quantity;
    const totalGems = item.cost_gems * quantity;

    if (user.gold < totalGold) {
      await conn.rollback();
      return res.status(400).json({ error: `Gold tidak cukup. Butuh ${totalGold}, punya ${user.gold}.` });
    }
    if (user.gems < totalGems) {
      await conn.rollback();
      return res.status(400).json({ error: `Gems tidak cukup. Butuh ${totalGems}, punya ${user.gems}.` });
    }

    // Kurangi currency
    await conn.query('UPDATE users SET gold=gold-?, gems=gems-? WHERE id=?', [totalGold, totalGems, req.user.id]);

    // Kurangi stok
    if (item.stock !== -1) {
      await conn.query('UPDATE shop_items SET stock=stock-? WHERE id=?', [quantity, item.id]);
    }

    // Apply efek item
    const effect = typeof item.effect_data === 'string' ? JSON.parse(item.effect_data) : item.effect_data;

    if (item.item_type === 'gems')         await conn.query('UPDATE users SET gems=gems+? WHERE id=?',      [effect.gems * quantity, req.user.id]);
    if (item.item_type === 'gold')         await conn.query('UPDATE users SET gold=gold+? WHERE id=?',      [effect.gold * quantity, req.user.id]);
    if (item.item_type === 'dust')         await conn.query('UPDATE users SET card_dust=card_dust+? WHERE id=?', [effect.dust * quantity, req.user.id]);
    if (item.item_type === 'avatar_frame') await conn.query('UPDATE users SET avatar_frame=? WHERE id=?',   [effect.frame_id, req.user.id]);
    if (item.item_type === 'title')        await conn.query('UPDATE users SET title=? WHERE id=?',          [effect.title, req.user.id]);
    if (item.item_type === 'card_back')    { /* Simpan di user preferences — bisa dikembangkan */ }

    // Log pembelian
    await conn.query(
      'INSERT INTO shop_purchases (user_id, item_id, quantity, paid_gold, paid_gems) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, item.id, quantity, totalGold, totalGems]
    );

    await conn.commit();
    res.json({ message: `"${item.name}" berhasil dibeli!`, effect });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Gagal melakukan pembelian.' });
  } finally {
    conn.release();
  }
});

// ── Riwayat pembelian ────────────────────────────────────────
router.get('/history', authMiddleware, async (req, res) => {
  const [rows] = await db.query(
    `SELECT sp.*, si.name AS item_name, si.image_url FROM shop_purchases sp
     JOIN shop_items si ON sp.item_id=si.id
     WHERE sp.user_id=? ORDER BY sp.purchased_at DESC LIMIT 30`,
    [req.user.id]
  );
  res.json({ purchases: rows });
});

module.exports = router;

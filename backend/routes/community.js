const express = require('express');
const db      = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Daftar teman ────────────────────────────────────────────
router.get('/friends', authMiddleware, async (req, res) => {
  const [rows] = await db.query(`
    SELECT u.id, u.username, u.avatar_url, u.avatar_frame, u.title, u.level,
           f.status, f.id AS friendship_id,
           CASE WHEN f.requester_id=? THEN 'sent' ELSE 'received' END AS direction
    FROM friends f
    JOIN users u ON (CASE WHEN f.requester_id=? THEN f.addressee_id ELSE f.requester_id END) = u.id
    WHERE (f.requester_id=? OR f.addressee_id=?) AND f.status IN ('accepted','pending')
    ORDER BY f.status DESC, u.username
  `, [req.user.id, req.user.id, req.user.id, req.user.id]);
  res.json({ friends: rows });
});

// ── Cari user ───────────────────────────────────────────────
router.get('/search', authMiddleware, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Masukkan minimal 2 karakter.' });

  const [rows] = await db.query(
    `SELECT u.id, u.username, u.avatar_url, u.title, u.level,
            f.status AS friend_status
     FROM users u
     LEFT JOIN friends f ON (
       (f.requester_id=? AND f.addressee_id=u.id) OR
       (f.addressee_id=? AND f.requester_id=u.id)
     )
     WHERE u.id != ? AND u.username LIKE ? AND u.is_active=1
     LIMIT 20`,
    [req.user.id, req.user.id, req.user.id, `%${q}%`]
  );
  res.json({ users: rows });
});

// ── Kirim permintaan pertemanan ─────────────────────────────
router.post('/friends/request', authMiddleware, async (req, res) => {
  const { addresseeId } = req.body;
  if (!addresseeId || addresseeId === req.user.id) {
    return res.status(400).json({ error: 'ID teman tidak valid.' });
  }

  const [exists] = await db.query(
    'SELECT id FROM friends WHERE (requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?)',
    [req.user.id, addresseeId, addresseeId, req.user.id]
  );
  if (exists.length) return res.status(409).json({ error: 'Permintaan pertemanan sudah ada.' });

  const [target] = await db.query('SELECT id, username FROM users WHERE id=? AND is_active=1', [addresseeId]);
  if (!target.length) return res.status(404).json({ error: 'User tidak ditemukan.' });

  await db.query('INSERT INTO friends (requester_id, addressee_id) VALUES (?, ?)', [req.user.id, addresseeId]);

  // Notifikasi
  await db.query(
    'INSERT INTO notifications (user_id, type, title, message, ref_id) VALUES (?, "friend_request", "Permintaan Pertemanan", ?, ?)',
    [addresseeId, `${req.user.username} ingin berteman denganmu!`, req.user.id]
  );

  res.status(201).json({ message: 'Permintaan pertemanan terkirim!' });
});

// ── Terima / Tolak permintaan ───────────────────────────────
router.patch('/friends/:id', authMiddleware, async (req, res) => {
  const { action } = req.body; // 'accept' | 'reject' | 'block'
  const [rows] = await db.query('SELECT * FROM friends WHERE id=? AND addressee_id=?', [req.params.id, req.user.id]);
  if (!rows.length) return res.status(404).json({ error: 'Permintaan tidak ditemukan.' });

  if (action === 'accept') {
    await db.query('UPDATE friends SET status="accepted" WHERE id=?', [req.params.id]);

    // Notifikasi ke requester
    await db.query(
      'INSERT INTO notifications (user_id, type, title, message) VALUES (?, "friend_request", "Pertemanan Diterima!", ?)',
      [rows[0].requester_id, `${req.user.username} menerima permintaan pertemanmu!`]
    );

    // Update mission: add_friend
    const now = new Date();
    const [missions] = await db.query(`
      SELECT um.id FROM user_missions um JOIN missions m ON um.mission_id=m.id
      WHERE um.user_id=? AND m.task_type='add_friend' AND um.is_completed=0 AND um.reset_at>?
    `, [req.user.id, now]);
    for (const um of missions) {
      await db.query('UPDATE user_missions SET progress=progress+1, is_completed=1 WHERE id=? AND progress+1>=1', [um.id]);
    }

    return res.json({ message: 'Pertemanan diterima!' });
  }

  if (action === 'reject') {
    await db.query('DELETE FROM friends WHERE id=?', [req.params.id]);
    return res.json({ message: 'Permintaan ditolak.' });
  }

  if (action === 'block') {
    await db.query('UPDATE friends SET status="blocked" WHERE id=?', [req.params.id]);
    return res.json({ message: 'User diblokir.' });
  }

  res.status(400).json({ error: 'Action tidak valid.' });
});

// ── Hapus teman ─────────────────────────────────────────────
router.delete('/friends/:id', authMiddleware, async (req, res) => {
  await db.query(
    'DELETE FROM friends WHERE id=? AND (requester_id=? OR addressee_id=?)',
    [req.params.id, req.user.id, req.user.id]
  );
  res.json({ message: 'Teman dihapus.' });
});

// ── Kirim kartu (gift) ke teman ─────────────────────────────
router.post('/gift', authMiddleware, async (req, res) => {
  const { receiverId, cardId, message } = req.body;

  // Cek pertemanan
  const [friendship] = await db.query(
    'SELECT id FROM friends WHERE status="accepted" AND ((requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?))',
    [req.user.id, receiverId, receiverId, req.user.id]
  );
  if (!friendship.length) return res.status(403).json({ error: 'Kamu harus berteman dulu untuk berbagi kartu.' });

  // Cek user punya kartu duplikat
  const [uc] = await db.query('SELECT * FROM user_cards WHERE user_id=? AND card_id=? AND quantity>1', [req.user.id, cardId]);
  if (!uc.length) return res.status(400).json({ error: 'Kamu tidak punya duplikat kartu ini.' });

  // Kurangi quantity
  await db.query('UPDATE user_cards SET quantity=quantity-1 WHERE user_id=? AND card_id=?', [req.user.id, cardId]);

  // Buat gift
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari
  await db.query(
    'INSERT INTO card_gifts (sender_id, receiver_id, card_id, message, expires_at) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, receiverId, cardId, message, expires]
  );

  // Notifikasi
  const [card] = await db.query('SELECT name FROM cards WHERE id=?', [cardId]);
  await db.query(
    'INSERT INTO notifications (user_id, type, title, message) VALUES (?, "gift_received", "Hadiah Kartu!", ?)',
    [receiverId, `${req.user.username} mengirimmu kartu "${card[0]?.name}"!`]
  );

  // Update mission: share_card
  const now = new Date();
  const [missions] = await db.query(`
    SELECT um.id FROM user_missions um JOIN missions m ON um.mission_id=m.id
    WHERE um.user_id=? AND m.task_type='share_card' AND um.is_completed=0 AND um.reset_at>?
  `, [req.user.id, now]);
  for (const um of missions) {
    await db.query('UPDATE user_missions SET progress=progress+1, is_completed=1 WHERE id=?', [um.id]);
  }

  res.status(201).json({ message: 'Kartu berhasil dikirim ke teman!' });
});

// ── Klaim gift yang diterima ────────────────────────────────
router.post('/gift/:id/claim', authMiddleware, async (req, res) => {
  const [gifts] = await db.query(
    'SELECT * FROM card_gifts WHERE id=? AND receiver_id=? AND status="pending" AND expires_at>NOW()',
    [req.params.id, req.user.id]
  );
  if (!gifts.length) return res.status(404).json({ error: 'Gift tidak ditemukan atau sudah expired.' });

  const gift = gifts[0];
  await db.query(
    'INSERT INTO user_cards (user_id, card_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity=quantity+1',
    [req.user.id, gift.card_id]
  );
  await db.query('UPDATE card_gifts SET status="claimed" WHERE id=?', [gift.id]);

  res.json({ message: 'Kartu berhasil diklaim!' });
});

// ── Daftar gift yang diterima ───────────────────────────────
router.get('/gifts', authMiddleware, async (req, res) => {
  const [rows] = await db.query(
    `SELECT cg.*, u.username AS sender_name, u.avatar_url AS sender_avatar,
            c.name AS card_name, c.image_url AS card_image, c.rarity
     FROM card_gifts cg
     JOIN users u ON cg.sender_id=u.id
     JOIN cards c ON cg.card_id=c.id
     WHERE cg.receiver_id=? AND cg.expires_at>NOW()
     ORDER BY cg.created_at DESC`,
    [req.user.id]
  );
  res.json({ gifts: rows });
});

module.exports = router;

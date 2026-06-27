const express  = require('express');
const bcrypt   = require('bcryptjs');
const passport = require('passport');
const db       = require('../config/database');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// ── Register dengan email & password ───────────────────────
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username 3–50 karakter.'),
  body('email').isEmail().withMessage('Email tidak valid.'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 karakter.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, email, password } = req.body;
  try {
    const [exists] = await db.query('SELECT id FROM users WHERE email=? OR username=?', [email, username]);
    if (exists.length) return res.status(409).json({ error: 'Email atau username sudah digunakan.' });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hash]
    );
    await db.query('INSERT INTO user_stats (user_id) VALUES (?)', [result.insertId]);

    const token = generateToken(result.insertId);
    const [user] = await db.query('SELECT id,username,email,avatar_url,gold,gems,pack_slots FROM users WHERE id=?', [result.insertId]);
    res.status(201).json({ token, user: user[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal registrasi.' });
  }
});

// ── Login dengan email & password ──────────────────────────
router.post('/login', [
  body('email').isEmail(),
  body('password').exists(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email=? AND is_active=1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Email atau password salah.' });

    const user = rows[0];
    if (!user.password_hash) return res.status(401).json({ error: 'Akun ini terdaftar via Google. Gunakan login Google.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Email atau password salah.' });

    const token = generateToken(user.id);
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Gagal login.' });
  }
});

// ── Google OAuth ────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/auth?error=google` }),
  (req, res) => {
    const token = generateToken(req.user.id);
    // Redirect ke frontend dengan token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// ── Get current user ────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const { password_hash, ...safeUser } = req.user;
  res.json({ user: req.user });
});

// ── Update profile ──────────────────────────────────────────
router.patch('/profile', authMiddleware, [
  body('username').optional().trim().isLength({ min: 3, max: 50 }),
], async (req, res) => {
  const { username, avatar_frame, title } = req.body;
  const updates = {};
  if (username) updates.username = username;
  if (avatar_frame) updates.avatar_frame = avatar_frame;
  if (title) updates.title = title;

  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Tidak ada yang diupdate.' });

  try {
    if (username) {
      const [exists] = await db.query('SELECT id FROM users WHERE username=? AND id!=?', [username, req.user.id]);
      if (exists.length) return res.status(409).json({ error: 'Username sudah digunakan.' });
    }
    const fields = Object.keys(updates).map(k => `${k}=?`).join(', ');
    await db.query(`UPDATE users SET ${fields} WHERE id=?`, [...Object.values(updates), req.user.id]);
    res.json({ message: 'Profil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal update profil.' });
  }
});

// ── Notifications ───────────────────────────────────────────
router.get('/notifications', authMiddleware, async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30',
    [req.user.id]
  );
  res.json({ notifications: rows });
});

router.patch('/notifications/read', authMiddleware, async (req, res) => {
  await db.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
  res.json({ message: 'Semua notifikasi ditandai sudah dibaca.' });
});

module.exports = router;

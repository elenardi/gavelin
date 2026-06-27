const jwt = require('jsonwebtoken');
const db  = require('../config/database');

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ditemukan.' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await db.query('SELECT id, username, email, avatar_url, avatar_frame, title, level, xp, gold, gems, card_dust, pack_slots, last_slot_reset FROM users WHERE id = ? AND is_active = 1', [decoded.id]);
    if (!rows.length) return res.status(401).json({ error: 'User tidak ditemukan.' });
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau sudah expired.' });
  }
};

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

module.exports = { authMiddleware, generateToken };

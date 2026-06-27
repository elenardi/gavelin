const express = require('express');
const db      = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const [rows] = await db.query(
    `SELECT * FROM news WHERE (expires_at IS NULL OR expires_at > NOW())
     ORDER BY is_pinned DESC, published_at DESC LIMIT 20`
  );
  res.json({ news: rows });
});

module.exports = router;

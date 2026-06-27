const express = require('express');
const db      = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * Assign missions yang belum ada untuk user hari ini / minggu ini
 */
async function ensureMissions(userId) {
  const now = new Date();
  const todayEnd  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const weekEnd   = new Date(todayEnd);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + (7 - weekEnd.getUTCDay()));

  const [dailyMissions]  = await db.query('SELECT * FROM missions WHERE mission_type="daily" AND is_active=1');
  const [weeklyMissions] = await db.query('SELECT * FROM missions WHERE mission_type="weekly" AND is_active=1');

  for (const m of dailyMissions) {
    await db.query(`
      INSERT IGNORE INTO user_missions (user_id, mission_id, reset_at) VALUES (?, ?, ?)
    `, [userId, m.id, todayEnd]);
  }
  for (const m of weeklyMissions) {
    await db.query(`
      INSERT IGNORE INTO user_missions (user_id, mission_id, reset_at) VALUES (?, ?, ?)
    `, [userId, m.id, weekEnd]);
  }
}

// ── Daftar mission user ─────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  await ensureMissions(req.user.id);

  const now = new Date();
  const [rows] = await db.query(`
    SELECT um.*, m.name, m.description, m.mission_type, m.task_type, m.target_count,
           m.reward_gold, m.reward_gems, m.reward_dust, m.reward_xp
    FROM user_missions um
    JOIN missions m ON um.mission_id=m.id
    WHERE um.user_id=? AND um.reset_at>?
    ORDER BY m.mission_type DESC, um.is_completed ASC, m.name
  `, [req.user.id, now]);

  res.json({ missions: rows });
});

// ── Klaim reward mission ─────────────────────────────────────
router.post('/:id/claim', authMiddleware, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(`
      SELECT um.*, m.reward_gold, m.reward_gems, m.reward_dust, m.reward_xp, m.name
      FROM user_missions um JOIN missions m ON um.mission_id=m.id
      WHERE um.id=? AND um.user_id=? AND um.is_completed=1 AND um.claimed=0
    `, [req.params.id, req.user.id]);

    if (!rows.length) return res.status(400).json({ error: 'Mission belum selesai atau sudah diklaim.' });
    const um = rows[0];

    await conn.query('UPDATE user_missions SET claimed=1 WHERE id=?', [um.id]);
    await conn.query(
      'UPDATE users SET gold=gold+?, gems=gems+?, card_dust=card_dust+?, xp=xp+? WHERE id=?',
      [um.reward_gold, um.reward_gems, um.reward_dust, um.reward_xp, req.user.id]
    );

    // Level up check (setiap 1000 XP)
    const [userRow] = await conn.query('SELECT xp, level FROM users WHERE id=?', [req.user.id]);
    const newLevel = Math.floor(userRow[0].xp / 1000) + 1;
    if (newLevel > userRow[0].level) {
      await conn.query('UPDATE users SET level=? WHERE id=?', [newLevel, req.user.id]);
    }

    await conn.commit();
    res.json({
      message: `Mission "${um.name}" diklaim!`,
      rewards: { gold: um.reward_gold, gems: um.reward_gems, dust: um.reward_dust, xp: um.reward_xp },
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Gagal klaim reward.' });
  } finally {
    conn.release();
  }
});

// ── Update mission progress (login) ─────────────────────────
router.post('/login-checkin', authMiddleware, async (req, res) => {
  await ensureMissions(req.user.id);
  const now = new Date();

  const [missions] = await db.query(`
    SELECT um.id FROM user_missions um JOIN missions m ON um.mission_id=m.id
    WHERE um.user_id=? AND m.task_type='login' AND um.is_completed=0 AND um.reset_at>?
  `, [req.user.id, now]);

  for (const um of missions) {
    await db.query('UPDATE user_missions SET progress=1, is_completed=1 WHERE id=?', [um.id]);
  }

  res.json({ message: 'Login check-in berhasil!' });
});

module.exports = router;

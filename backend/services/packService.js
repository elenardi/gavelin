const db = require('../config/database');

/**
 * Reset pack_slots user jika sudah melewati tengah malam UTC
 */
async function resetSlotsIfNeeded(user) {
  const now = new Date();
  const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const lastReset = user.last_slot_reset ? new Date(user.last_slot_reset) : null;

  if (!lastReset || lastReset < todayMidnight) {
    await db.query(
      'UPDATE users SET pack_slots = ?, last_slot_reset = ? WHERE id = ?',
      [parseInt(process.env.DAILY_PACK_SLOTS) || 2, now, user.id]
    );
    return parseInt(process.env.DAILY_PACK_SLOTS) || 2;
  }
  return user.pack_slots;
}

/**
 * Pilih 5 kartu random dari pack berdasarkan rarity weights
 */
async function drawCards(packId, rarityWeights) {
  const cards = [];
  const rarities = Object.keys(rarityWeights);
  const weights  = Object.values(rarityWeights);
  const total    = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < 5; i++) {
    // Roulette wheel selection
    let rand = Math.random() * total;
    let chosenRarity = rarities[rarities.length - 1];
    for (let j = 0; j < rarities.length; j++) {
      rand -= weights[j];
      if (rand <= 0) { chosenRarity = rarities[j]; break; }
    }

    // Ambil kartu random dari pack dengan rarity yang dipilih
    const [rows] = await db.query(
      'SELECT * FROM cards WHERE pack_id = ? AND rarity = ? AND is_active = 1 ORDER BY RAND() LIMIT 1',
      [packId, chosenRarity]
    );

    // Fallback: jika tidak ada kartu di rarity itu, ambil common
    if (rows.length === 0) {
      const [fallback] = await db.query(
        'SELECT * FROM cards WHERE pack_id = ? AND rarity = "common" AND is_active = 1 ORDER BY RAND() LIMIT 1',
        [packId]
      );
      if (fallback.length) cards.push(fallback[0]);
    } else {
      cards.push(rows[0]);
    }
  }

  return cards;
}

/**
 * Buka pack: kurangi slot, tarik 5 kartu, tambah ke koleksi user
 */
async function openPack(userId, packId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Ambil user (dengan lock)
    const [users] = await conn.query('SELECT * FROM users WHERE id = ? FOR UPDATE', [userId]);
    const user = users[0];

    // Check & reset slots
    const availableSlots = await resetSlotsIfNeeded(user);

    // Re-fetch setelah reset
    const [freshUsers] = await conn.query('SELECT pack_slots FROM users WHERE id = ?', [userId]);
    const currentSlots = freshUsers[0].pack_slots;

    if (currentSlots <= 0) {
      await conn.rollback();
      return { error: 'Slot buka pack habis hari ini. Kembali besok!' };
    }

    // Ambil pack
    const [packs] = await conn.query('SELECT * FROM packs WHERE id = ? AND is_active = 1', [packId]);
    if (!packs.length) {
      await conn.rollback();
      return { error: 'Pack tidak ditemukan.' };
    }
    const pack = packs[0];

    // Tarik 5 kartu
    const weights = typeof pack.rarity_weights === 'string'
      ? JSON.parse(pack.rarity_weights) : pack.rarity_weights;
    const drawnCards = await drawCards(packId, weights);

    if (drawnCards.length < 5) {
      await conn.rollback();
      return { error: 'Pack belum memiliki cukup kartu. Hubungi admin.' };
    }

    // Kurangi slot
    await conn.query('UPDATE users SET pack_slots = pack_slots - 1 WHERE id = ?', [userId]);

    // Tambah kartu ke koleksi user
    for (const card of drawnCards) {
      await conn.query(`
        INSERT INTO user_cards (user_id, card_id, quantity)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE quantity = quantity + 1
      `, [userId, card.id]);
    }

    // Simpan log
    const cardIds = drawnCards.map(c => c.id);
    await conn.query(
      'INSERT INTO pack_openings (user_id, pack_id, cards_received) VALUES (?, ?, ?)',
      [userId, packId, JSON.stringify(cardIds)]
    );

    // Update mission progress: open_pack
    await updateMissionProgress(conn, userId, 'open_pack', 1);

    // Update stats
    await conn.query('UPDATE user_stats SET packs_opened = packs_opened + 1 WHERE user_id = ?', [userId]);

    await conn.commit();

    return {
      success: true,
      cards: drawnCards,
      remainingSlots: currentSlots - 1,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Helper: update progress mission user
 */
async function updateMissionProgress(conn, userId, taskType, amount = 1) {
  const now = new Date();
  const [missions] = await conn.query(`
    SELECT um.id, um.progress, m.target_count, m.reward_gold, m.reward_gems, m.reward_dust, m.reward_xp
    FROM user_missions um
    JOIN missions m ON um.mission_id = m.id
    WHERE um.user_id = ? AND m.task_type = ? AND um.is_completed = 0 AND um.reset_at > ?
  `, [userId, taskType, now]);

  for (const um of missions) {
    const newProgress = Math.min(um.progress + amount, um.target_count);
    const completed = newProgress >= um.target_count;
    await conn.query(
      'UPDATE user_missions SET progress = ?, is_completed = ? WHERE id = ?',
      [newProgress, completed, um.id]
    );
  }
}

module.exports = { openPack, resetSlotsIfNeeded, updateMissionProgress };

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./database');
const bcrypt = require('bcryptjs');

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email     = profile.emails[0].value;
    const googleId  = profile.id;
    const avatarUrl = profile.photos[0]?.value || null;
    const name      = profile.displayName.replace(/\s+/g, '_').toLowerCase().slice(0, 50);

    // Cek apakah user sudah ada
    const [rows] = await db.query('SELECT * FROM users WHERE google_id = ? OR email = ?', [googleId, email]);

    if (rows.length > 0) {
      const user = rows[0];
      // Update google_id jika belum terhubung
      if (!user.google_id) {
        await db.query('UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?', [googleId, avatarUrl, user.id]);
      }
      return done(null, user);
    }

    // Buat user baru
    let username = name;
    const [existNames] = await db.query('SELECT username FROM users WHERE username LIKE ?', [`${name}%`]);
    if (existNames.length > 0) username = `${name}_${Date.now().toString().slice(-4)}`;

    const [result] = await db.query(
      'INSERT INTO users (username, email, google_id, avatar_url) VALUES (?, ?, ?, ?)',
      [username, email, googleId, avatarUrl]
    );

    // Init stats
    await db.query('INSERT INTO user_stats (user_id) VALUES (?)', [result.insertId]);

    const [newUser] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    return done(null, newUser[0]);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  done(null, rows[0]);
});

module.exports = passport;

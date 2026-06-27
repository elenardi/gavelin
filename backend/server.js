require('dotenv').config();
const express   = require('express');
const http      = require('http');
const cors      = require('cors');
const morgan    = require('morgan');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
require('./config/passport');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
});

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true });
app.use('/api', limiter);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/packs',      require('./routes/packs'));
app.use('/api/collection', require('./routes/collection'));
app.use('/api/community',  require('./routes/community'));
app.use('/api/battle',     require('./routes/battle'));
app.use('/api/shop',       require('./routes/shop'));
app.use('/api/missions',   require('./routes/mission'));
app.use('/api/news',       require('./routes/news'));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', game: 'Gavelin: Card Chronicles' }));

// ── Socket.IO Battle ──────────────────────────────────────────
require('./socket/battleSocket')(io);

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🎲 Gavelin: Card Chronicles Backend`);
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO battle server ready\n`);
});

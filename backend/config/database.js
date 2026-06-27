const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'gavelin',
  waitForConnections: true,
  connectionLimit:    20,
  queueLimit:         0,
  timezone:           '+00:00',
  charset:            'utf8mb4',
});

pool.getConnection()
  .then(conn => { console.log('[DB] MySQL connected.'); conn.release(); })
  .catch(err => { console.error('[DB] Connection failed:', err.message); });

module.exports = pool;

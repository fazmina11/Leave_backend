const mysql = require('mysql2/promise');

// ❌ REMOVE THIS (important)
// require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
});

pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL Connected');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection error:', err.message);
    process.exit(1);
  });

module.exports = pool;
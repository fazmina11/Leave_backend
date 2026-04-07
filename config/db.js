const mysql = require('mysql2');

const url = new URL(process.env.MYSQL_URL);

const db = mysql.createPool({
  host:     url.hostname,
  user:     url.username,
  password: url.password,
  database: url.pathname.replace('/', ''),
  port:     Number(url.port) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 30000,
  ssl: { rejectUnauthorized: false }
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL connection error:', err.message);
    return;
  }
  console.log('✅ MySQL connected successfully');
  connection.release();
});

module.exports = db;

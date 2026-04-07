const mysql = require('mysql2/promise');

const pool = mysql.createPool(process.env.MYSQL_URL);

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
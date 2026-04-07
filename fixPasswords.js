require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

const fix = async () => {
  const hash = await bcrypt.hash('password123', 10);
  console.log('Hash:', hash);

  await pool.query('UPDATE students SET password = ?', [hash]);
  await pool.query('UPDATE faculty SET password = ?', [hash]);

  console.log('All passwords updated to password123');
  process.exit(0);
};

fix().catch((err) => { console.error(err); process.exit(1); });
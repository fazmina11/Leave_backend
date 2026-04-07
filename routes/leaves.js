const router = require('express').Router();
const pool = require('../config/db');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const { applyLeave, getMyLeaves, getSingleLeave, deleteLeave } = require('../controllers/leaveController');

const LEAVE_TYPES = [
  { id: 1, name: 'Medical',  key: 'Medical',  label: 'Medical',  description: 'Health or medical reasons' },
  { id: 2, name: 'Personal', key: 'Personal', label: 'Personal', description: 'Personal or family reasons' },
  { id: 3, name: 'OD',       key: 'OD',       label: 'On Duty',  description: 'Official duty or event' },
];

const LEAVE_TOTALS = { Medical: 10, Personal: 5, OD: 5 };

// GET /api/leaves/types
router.get('/types', protect, async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id   INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        key_name    VARCHAR(50) NOT NULL,
        label       VARCHAR(50) NOT NULL,
        description VARCHAR(255)
      )
    `);

    const [rows] = await pool.query('SELECT * FROM leave_types ORDER BY id ASC');

    if (!rows.length) {
      await pool.query(
        'INSERT INTO leave_types (name, key_name, label, description) VALUES ?',
        [LEAVE_TYPES.map((t) => [t.name, t.key, t.label, t.description])]
      );
      return res.json({ leaveTypes: LEAVE_TYPES });
    }

    res.json({ leaveTypes: rows });
  } catch {
    res.json({ leaveTypes: LEAVE_TYPES });
  }
});

// GET /api/leaves/balance
router.get('/balance', protect, allowRoles('student'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT leave_type, COUNT(*) AS used
       FROM leave_requests
       WHERE student_id = ? AND final_status != 'rejected'
       GROUP BY leave_type`,
      [req.user.id]
    );

    const leaveBalance = {};
    Object.entries(LEAVE_TOTALS).forEach(([type, total]) => {
      const match = rows.find((r) => r.leave_type === type);
      leaveBalance[type] = { total, used: match ? Number(match.used) : 0 };
    });

    res.json({ leaveBalance });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch leave balance', error: err.message });
  }
});

router.post('/apply', protect, allowRoles('student'), applyLeave);
router.get('/my', protect, allowRoles('student'), getMyLeaves);
router.get('/:id', protect, getSingleLeave);
router.delete('/:id', protect, allowRoles('student'), deleteLeave);

module.exports = router;

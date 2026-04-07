const router = require('express').Router();
const pool = require('../config/db');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');

// GET /api/leave-types
router.get('/types', protect, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_types ORDER BY id ASC');

    // If table is empty or doesn't exist yet, return the three hardcoded types
    if (!rows.length) {
      return res.json({
        leaveTypes: [
          { id: 1, name: 'OD',       key: 'OD',       label: 'On Duty',   description: 'Official duty or event' },
          { id: 2, name: 'Medical',  key: 'Medical',  label: 'Medical',   description: 'Health or medical reasons' },
          { id: 3, name: 'Personal', key: 'Personal', label: 'Personal',  description: 'Personal or family reasons' },
        ],
      });
    }

    res.json({ leaveTypes: rows });
  } catch (err) {
    // Table may not exist — fall back to static list
    res.json({
      leaveTypes: [
        { id: 1, name: 'OD',       key: 'OD',       label: 'On Duty',   description: 'Official duty or event' },
        { id: 2, name: 'Medical',  key: 'Medical',  label: 'Medical',   description: 'Health or medical reasons' },
        { id: 3, name: 'Personal', key: 'Personal', label: 'Personal',  description: 'Personal or family reasons' },
      ],
    });
  }
});

// GET /api/leave-balance/:studentId
router.get('/balance/:studentId', protect, allowRoles('student', 'advisor', 'hod'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId, 10);

    // Students can only query their own balance
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [rows] = await pool.query(
      `SELECT
         leave_type,
         COUNT(*) AS used
       FROM leave_requests
       WHERE student_id = ?
         AND final_status != 'rejected'
       GROUP BY leave_type`,
      [studentId]
    );

    const defaults = { OD: 5, Medical: 10, Personal: 5 };
    const leaveBalance = {};

    Object.entries(defaults).forEach(([type, total]) => {
      const match = rows.find((r) => r.leave_type === type);
      leaveBalance[type] = {
        total,
        used: match ? Number(match.used) : 0,
      };
    });

    res.json({ leaveBalance });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch leave balance', error: err.message });
  }
});

module.exports = router;

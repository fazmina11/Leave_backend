const pool = require('../config/db');

const getMyAttendance = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         s.id AS student_id,
         COALESCE(a.total_classes, 0) AS total_classes,
         COALESCE(a.attended_classes, 0) AS attended_classes,
         COALESCE(a.total_classes, 0) - COALESCE(a.attended_classes, 0) AS missed_classes,
         CASE
           WHEN COALESCE(a.total_classes, 0) > 0
             THEN ROUND((COALESCE(a.attended_classes, 0) / a.total_classes) * 100)
           ELSE 0
         END AS percentage
       FROM students s
       LEFT JOIN attendance a ON a.student_id = s.id
       WHERE s.id = ?`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const {
      total_classes,
      attended_classes,
      missed_classes,
      percentage,
    } = rows[0];

    res.json({
      attendance: {
        total_classes,
        attended_classes,
        missed_classes,
        percentage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch attendance', error: error.message });
  }
};

const updateAttendance = async (req, res) => {
  try {
    const { student_id, total_classes, attended_classes } = req.body;

    if (
      typeof student_id !== 'number' ||
      typeof total_classes !== 'number' ||
      typeof attended_classes !== 'number'
    ) {
      return res.status(400).json({ message: 'student_id, total_classes, and attended_classes must be numbers' });
    }

    await pool.query(
      `INSERT INTO attendance (student_id, total_classes, attended_classes)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE total_classes = VALUES(total_classes), attended_classes = VALUES(attended_classes)`,
      [student_id, total_classes, attended_classes]
    );

    res.json({ message: 'Attendance updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update attendance', error: error.message });
  }
};

module.exports = { getMyAttendance, updateAttendance };

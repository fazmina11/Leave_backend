const pool = require('../config/db');

const applyLeave = async (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body;

  if (!leave_type || !start_date || !end_date || !reason) {
    return res.status(400).json({ message: 'leave_type, start_date, end_date, and reason are required' });
  }
  if (!['OD', 'Medical', 'Personal'].includes(leave_type)) {
    return res.status(400).json({ message: 'leave_type must be OD, Medical, or Personal' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(start_date) < today) {
    return res.status(400).json({ message: 'start_date must not be in the past' });
  }
  if (new Date(end_date) < new Date(start_date)) {
    return res.status(400).json({ message: 'end_date must be >= start_date' });
  }

  const student_id = req.user.id;

  // Check current attendance
  const [[attendanceRow]] = await pool.query(
    'SELECT total_classes, attended_classes FROM attendance WHERE student_id = ?',
    [student_id]
  );

  const total = attendanceRow?.total_classes || 0;
  const attended = attendanceRow?.attended_classes || 0;
  const currentPct = total > 0 ? (attended / total) * 100 : 0;

  if (currentPct < 75 && total > 0) {
    return res.status(400).json({
      message: 'You cannot apply for leave. Your attendance is below 75%.',
    });
  }

  const days = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1;

  const [result] = await pool.query(
    'INSERT INTO leave_requests (student_id, leave_type, start_date, end_date, days, reason) VALUES (?, ?, ?, ?, ?, ?)',
    [student_id, leave_type, start_date, end_date, days, reason]
  );

  res.status(201).json({ message: 'Leave request submitted successfully', leaveId: result.insertId });
};

const getMyLeaves = async (req, res) => {
  const [leaves] = await pool.query(
    'SELECT * FROM leave_requests WHERE student_id = ? ORDER BY applied_at DESC',
    [req.user.id]
  );
  res.json({ leaves });
};

const getSingleLeave = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT lr.*, s.name AS student_name
     FROM leave_requests lr
     JOIN students s ON s.id = lr.student_id
     WHERE lr.id = ?`,
    [req.params.id]
  );

  if (!rows.length) return res.status(404).json({ message: 'Leave request not found' });

  const leave = rows[0];
  if (req.user.role === 'student' && leave.student_id !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ leave });
};

const deleteLeave = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM leave_requests WHERE id = ? AND student_id = ?',
    [req.params.id, req.user.id]
  );

  if (!rows.length) return res.status(404).json({ message: 'Leave request not found' });
  if (rows[0].advisor_status !== 'pending') {
    return res.status(400).json({ message: 'Cannot delete a leave that is already reviewed' });
  }

  await pool.query('DELETE FROM leave_requests WHERE id = ?', [req.params.id]);
  res.json({ message: 'Leave request deleted' });
};

module.exports = { applyLeave, getMyLeaves, getSingleLeave, deleteLeave };

const pool = require('../config/db');

const getMyStudents = async (req, res) => {
  const [students] = await pool.query(
    'SELECT * FROM students WHERE advisor_id = ?',
    [req.user.id]
  );

  const studentsWithAttendance = await Promise.all(
    students.map(async (s) => {
      const [rows] = await pool.query(
        'SELECT * FROM attendance WHERE student_id = ?',
        [s.id]
      );
      return { ...s, attendance: rows[0] || null };
    })
  );

  res.json({ students: studentsWithAttendance });
};

const getPendingLeaves = async (req, res) => {
  const [leaves] = await pool.query(
    `SELECT lr.*, s.name AS student_name, s.department, s.year
     FROM leave_requests lr
     JOIN students s ON s.id = lr.student_id
     WHERE s.advisor_id = ? AND lr.advisor_status = 'pending'
     ORDER BY lr.applied_at DESC`,
    [req.user.id]
  );
  res.json({ leaves });
};

const getAllLeaves = async (req, res) => {
  const [leaves] = await pool.query(
    `SELECT lr.*, s.name AS student_name, s.department, s.year
     FROM leave_requests lr
     JOIN students s ON s.id = lr.student_id
     WHERE s.advisor_id = ?
     ORDER BY lr.applied_at DESC`,
    [req.user.id]
  );
  res.json({ leaves });
};

const approveLeave = async (req, res) => {
  const { remarks } = req.body;
  const [rows] = await pool.query(
    `SELECT lr.* FROM leave_requests lr
     JOIN students s ON s.id = lr.student_id
     WHERE lr.id = ? AND s.advisor_id = ?`,
    [req.params.id, req.user.id]
  );

  if (!rows.length) return res.status(403).json({ message: 'Not found or unauthorized' });
  if (rows[0].advisor_status !== 'pending') return res.status(400).json({ message: 'Already reviewed' });

  await pool.query(
    'UPDATE leave_requests SET advisor_status = ?, advisor_remarks = ? WHERE id = ?',
    ['approved', remarks || null, req.params.id]
  );

  res.json({ message: 'Leave approved by advisor' });
};

const rejectLeave = async (req, res) => {
  const { remarks } = req.body;
  if (!remarks) return res.status(400).json({ message: 'remarks is required for rejection' });

  const [rows] = await pool.query(
    `SELECT lr.* FROM leave_requests lr
     JOIN students s ON s.id = lr.student_id
     WHERE lr.id = ? AND s.advisor_id = ?`,
    [req.params.id, req.user.id]
  );

  if (!rows.length) return res.status(403).json({ message: 'Not found or unauthorized' });
  if (rows[0].advisor_status !== 'pending') return res.status(400).json({ message: 'Already reviewed' });

  await pool.query(
    'UPDATE leave_requests SET advisor_status = ?, advisor_remarks = ?, final_status = ? WHERE id = ?',
    ['rejected', remarks, 'rejected', req.params.id]
  );

  res.json({ message: 'Leave rejected by advisor' });
};

module.exports = { getMyStudents, getPendingLeaves, getAllLeaves, approveLeave, rejectLeave };

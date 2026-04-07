const pool = require('../config/db');

const leaveJoinQuery = `
  SELECT lr.*,
    s.name AS student_name, s.department, s.year,
    f.name AS advisor_name
  FROM leave_requests lr
  JOIN students s ON s.id = lr.student_id
  LEFT JOIN faculty f ON f.id = s.advisor_id
`;

const getAllLeaves = async (req, res) => {
  const [leaves] = await pool.query(leaveJoinQuery + ' ORDER BY lr.applied_at DESC');
  res.json({ leaves });
};

const getPendingHOD = async (req, res) => {
  const [leaves] = await pool.query(
    leaveJoinQuery + ` WHERE lr.advisor_status = 'approved' AND lr.hod_status = 'pending' ORDER BY lr.applied_at DESC`
  );
  res.json({ leaves });
};

const approveLeave = async (req, res) => {
  const { remarks } = req.body;
  const [[leave]] = await pool.query('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);

  if (!leave) return res.status(404).json({ message: 'Leave not found' });
  if (leave.advisor_status !== 'approved') return res.status(400).json({ message: 'Advisor must approve first' });
  if (leave.hod_status !== 'pending') return res.status(400).json({ message: 'Already reviewed by HOD' });

  await pool.query(
    'UPDATE leave_requests SET hod_status = ?, hod_remarks = ?, final_status = ? WHERE id = ?',
    ['approved', remarks || null, 'approved', req.params.id]
  );

  res.json({ message: 'Leave approved by HOD - Final approval granted' });
};

const rejectLeave = async (req, res) => {
  const { remarks } = req.body;
  const [[leave]] = await pool.query('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);

  if (!leave) return res.status(404).json({ message: 'Leave not found' });
  if (leave.advisor_status !== 'approved') return res.status(400).json({ message: 'Advisor must approve first' });
  if (leave.hod_status !== 'pending') return res.status(400).json({ message: 'Already reviewed by HOD' });

  await pool.query(
    'UPDATE leave_requests SET hod_status = ?, hod_remarks = ?, final_status = ? WHERE id = ?',
    ['rejected', remarks || null, 'rejected', req.params.id]
  );

  res.json({ message: 'Leave rejected by HOD' });
};

const getAnalytics = async (req, res) => {
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM leave_requests');

  const [typeRows] = await pool.query(
    'SELECT leave_type, COUNT(*) AS count FROM leave_requests GROUP BY leave_type'
  );
  const byType = { OD: 0, Medical: 0, Personal: 0 };
  typeRows.forEach((r) => { byType[r.leave_type] = r.count; });

  const [statusRows] = await pool.query(
    'SELECT final_status, COUNT(*) AS count FROM leave_requests GROUP BY final_status'
  );
  const byStatus = { pending: 0, approved: 0, rejected: 0 };
  statusRows.forEach((r) => { byStatus[r.final_status] = r.count; });

  const [topStudents] = await pool.query(
    `SELECT lr.student_id, COUNT(*) AS total, s.name, s.department
     FROM leave_requests lr
     JOIN students s ON s.id = lr.student_id
     GROUP BY lr.student_id
     ORDER BY total DESC
     LIMIT 5`
  );

  res.json({ analytics: { total, byType, byStatus, topStudents } });
};

const getAllStudents = async (req, res) => {
  const [students] = await pool.query(
    `SELECT s.*, a.total_classes, a.attended_classes,
       CASE WHEN a.total_classes > 0
         THEN ROUND((a.attended_classes / a.total_classes) * 100)
         ELSE 0
       END AS percentage
     FROM students s
     LEFT JOIN attendance a ON a.student_id = s.id`
  );
  res.json({ students });
};

module.exports = { getAllLeaves, getPendingHOD, approveLeave, rejectLeave, getAnalytics, getAllStudents };

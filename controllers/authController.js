require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

const register = async (req, res) => {
  const { name, email, password, role, department, year, employeeId, advisorId } = req.body;

  if (!name || !email || !password || !role || !department) {
    return res.status(400).json({ message: 'name, email, password, role, and department are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  if (!['student', 'advisor', 'hod'].includes(role)) {
    return res.status(400).json({ message: 'Role must be student, advisor, or hod' });
  }
  if (role === 'student' && (!year || year < 1 || year > 4)) {
    return res.status(400).json({ message: 'Year is required for students (1-4)' });
  }
  if ((role === 'advisor' || role === 'hod') && !employeeId) {
    return res.status(400).json({ message: 'employeeId is required for advisor and hod' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  if (role === 'student') {
    const [existing] = await pool.query('SELECT id FROM students WHERE email = ?', [email]);
    if (existing.length) return res.status(400).json({ message: 'Email already registered' });

    const [result] = await pool.query(
      'INSERT INTO students (name, email, password, department, year, advisor_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, department, year, advisorId || null]
    );

    const [rows] = await pool.query('SELECT id, name, email, department, year FROM students WHERE id = ?', [result.insertId]);
    const user = rows[0];

    return res.status(201).json({
      message: 'Registration successful',
      token: generateToken(user.id, 'student'),
      user: { ...user, role: 'student' },
    });
  }

  const [existing] = await pool.query('SELECT id FROM faculty WHERE email = ?', [email]);
  if (existing.length) return res.status(400).json({ message: 'Email already registered' });

  const [result] = await pool.query(
    'INSERT INTO faculty (name, email, password, department, role, employee_id) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, hashedPassword, department, role, employeeId]
  );

  const [rows] = await pool.query('SELECT id, name, email, department, role, employee_id FROM faculty WHERE id = ?', [result.insertId]);
  const user = rows[0];

  return res.status(201).json({
    message: 'Registration successful',
    token: generateToken(user.id, user.role),
    user,
  });
};

const login = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'email, password, and role are required' });
  }

  if (role === 'student') {
    const [rows] = await pool.query('SELECT * FROM students WHERE email = ?', [email]);
    const user = rows[0];

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    return res.json({
      message: 'Login successful',
      token: generateToken(user.id, 'student'),
      user: { id: user.id, name: user.name, email: user.email, department: user.department, year: user.year, advisor_id: user.advisor_id, role: 'student' },
    });
  }

  const [rows] = await pool.query('SELECT * FROM faculty WHERE email = ? AND role = ?', [email, role]);
  const user = rows[0];

  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });

  return res.json({
    message: 'Login successful',
    token: generateToken(user.id, user.role),
    user: { id: user.id, name: user.name, email: user.email, department: user.department, role: user.role, employee_id: user.employee_id },
  });
};

const getMe = async (req, res) => {
  const { id, role } = req.user;

  if (role === 'student') {
    const [rows] = await pool.query('SELECT id, name, email, department, year, advisor_id FROM students WHERE id = ?', [id]);
    const user = rows[0];

    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ ...user, role: 'student' });
  }

  const [rows] = await pool.query('SELECT id, name, email, department, role, employee_id FROM faculty WHERE id = ?', [id]);
  const user = rows[0];

  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json(user);
};

const getAdvisors = async (req, res) => {
  try {
    const [advisors] = await pool.query(
      'SELECT id, name, department FROM faculty WHERE role = "advisor" ORDER BY name ASC'
    );
    return res.status(200).json({ advisors });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch advisors' });
  }
};

module.exports = { register, login, getMe, getAdvisors };
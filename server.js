require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://leave-management-system-teal.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/advisor', require('./routes/advisor'));
app.use('/api/hod', require('./routes/hod'));
app.use('/api/attendance', require('./routes/attendance'));

app.get('/', (req, res) => {
  res.json({ message: 'CampusLeave API Running', status: 'ok' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

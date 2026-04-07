const router = require('express').Router();
const { register, login, getMe, getAdvisors } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

router.get('/advisors', getAdvisors);

module.exports = router;

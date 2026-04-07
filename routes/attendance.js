const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const { getMyAttendance, updateAttendance } = require('../controllers/attendanceController');

router.get('/', protect, allowRoles('student'), getMyAttendance);
router.put('/update', protect, allowRoles('advisor', 'hod'), updateAttendance);

module.exports = router;

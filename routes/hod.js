const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const { getAllLeaves, getPendingHOD, approveLeave, rejectLeave, getAnalytics, getAllStudents } = require('../controllers/hodController');

router.get('/leaves/pending', protect, allowRoles('hod'), getPendingHOD);
router.get('/leaves', protect, allowRoles('hod'), getAllLeaves);
router.put('/leaves/:id/approve', protect, allowRoles('hod'), approveLeave);
router.put('/leaves/:id/reject', protect, allowRoles('hod'), rejectLeave);
router.get('/analytics', protect, allowRoles('hod'), getAnalytics);
router.get('/students', protect, allowRoles('hod'), getAllStudents);

module.exports = router;

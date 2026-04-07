const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const { getMyStudents, getPendingLeaves, getAllLeaves, approveLeave, rejectLeave } = require('../controllers/advisorController');

router.get('/students', protect, allowRoles('advisor'), getMyStudents);
router.get('/leaves/all', protect, allowRoles('advisor'), getAllLeaves);
router.get('/leaves', protect, allowRoles('advisor'), getPendingLeaves);
router.put('/leaves/:id/approve', protect, allowRoles('advisor'), approveLeave);
router.put('/leaves/:id/reject', protect, allowRoles('advisor'), rejectLeave);

module.exports = router;

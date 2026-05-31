const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', employeeController.getAll);
router.get('/:id', employeeController.getById);
router.get('/:id/attendance', employeeController.getAttendance);
router.post('/', authorize('ADMIN', 'STORE_MANAGER'), employeeController.create);
router.put('/:id', authorize('ADMIN', 'STORE_MANAGER'), employeeController.update);
router.post('/:id/clock-in', employeeController.clockIn);
router.post('/:id/clock-out', employeeController.clockOut);
router.get('/attendance/summary', authorize('ADMIN', 'STORE_MANAGER'), employeeController.attendanceSummary);

module.exports = router;

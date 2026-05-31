const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', authorize('ADMIN'), userController.getAll);
router.get('/:id', authorize('ADMIN'), userController.getById);
router.post('/', authorize('ADMIN'), userController.create);
router.put('/:id', authorize('ADMIN'), userController.update);
router.put('/:id/deactivate', authorize('ADMIN'), userController.deactivate);

module.exports = router;

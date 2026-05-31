const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', categoryController.getAll);

module.exports = router;

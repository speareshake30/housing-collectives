const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.get('/me', authenticate, userController.me);
router.patch('/me', authenticate, userController.update);
router.post('/me/avatar', authenticate, userController.uploadAvatar);
router.get('/:username', userController.getByUsername);

module.exports = router;

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.me);

// Password reset routes (placeholders for now)
router.post('/forgot-password', (req, res) => {
  res.json({ message: 'Password reset email sent' });
});

router.post('/reset-password', (req, res) => {
  res.json({ message: 'Password reset successful' });
});

module.exports = router;

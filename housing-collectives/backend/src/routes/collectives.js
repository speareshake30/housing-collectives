const express = require('express');
const router = express.Router();
const collectiveController = require('../controllers/collectiveController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/', optionalAuth, collectiveController.list);
router.get('/:slug', optionalAuth, collectiveController.get);
router.get('/:slug/members', collectiveController.getMembers);

// Protected routes
router.post('/', authenticate, collectiveController.create);
router.patch('/:slug', authenticate, collectiveController.update);
router.post('/:slug/join', authenticate, collectiveController.join);
router.post('/:slug/leave', authenticate, collectiveController.leave);
router.post('/:slug/members/:user_id/role', authenticate, collectiveController.updateRole);

module.exports = router;

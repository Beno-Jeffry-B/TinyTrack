const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getAnalytics } = require('../controllers/analyticsController');

// GET /api/url/:id/analytics — protected
router.get('/:id/analytics', authMiddleware, getAnalytics);

module.exports = router;

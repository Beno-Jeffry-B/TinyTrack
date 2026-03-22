const express = require('express');
const router = express.Router();
const { healthCheck } = require('../controllers/healthController');

// GET /api/health
router.get('/health', healthCheck);

module.exports = router;

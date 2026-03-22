const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createUrl, listUrls, deleteUrl } = require('../controllers/urlController');

// All /api/url routes are protected
router.post('/', authMiddleware, createUrl);
router.get('/', authMiddleware, listUrls);
router.delete('/:id', authMiddleware, deleteUrl);

module.exports = router;

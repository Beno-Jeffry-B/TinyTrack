const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const passport = require('../config/passport');
const { signup, login } = require('../controllers/authController');

// ── Credentials auth ─────────────────────────────────────
router.post('/signup', signup);
router.post('/login', login);

// ── Session verification ─────────────────────────────────
const authMiddleware = require('../middleware/authMiddleware');
const { getCurrentUser } = require('../controllers/authController');
router.get('/me', authMiddleware, getCurrentUser);

// ── Google OAuth ─────────────────────────────────────────
// Step 1: Redirect user to Google
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Step 2: Google redirects here with profile
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failed' }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Redirect to frontend with token in query param
    // Frontend reads ?token= on load and stores it
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

// Google auth failure route
router.get('/google/failed', (_req, res) => {
  res.status(401).json({ error: 'Google authentication failed' });
});

module.exports = router;

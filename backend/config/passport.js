const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { pool } = require('./db');
const jwt = require('jsonwebtoken');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      const googleId = profile.id;
      const email = profile.emails?.[0]?.value?.toLowerCase();

      try {
        // Query DB by email (unique identity)
        const result = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );

        if (result.rows.length > 0) {
          const user = result.rows[0];
          console.log(`[Google Auth] Found existing user via email: ${email}`);

          // Link google_id if missing. DO NOT update email.
          if (!user.google_id) {
            console.log(`[Google Auth] Linking google_id ${googleId} to user ${email}`);
            const updated = await pool.query(
              'UPDATE users SET google_id = $1 WHERE email = $2 RETURNING *',
              [googleId, email]
            );
            return done(null, updated.rows[0]);
          }

          return done(null, user);
        }

        // User does NOT exist → Create new user
        console.log(`[Google Auth] Creating new user with email: ${email}`);

        const inserted = await pool.query(
          `INSERT INTO users (email, google_id)
           VALUES ($1, $2)
           RETURNING *`,
          [email, googleId]
        );
        
        return done(null, inserted.rows[0]);
      } catch (err) {
        console.error('[Google Auth] Error:', err.message);
        return done(err, null);
      }
    }
  )
);

// Not using sessions — JWT only
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;

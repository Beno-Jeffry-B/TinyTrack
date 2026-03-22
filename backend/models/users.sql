-- Run this in psql or your PostgreSQL client to create the users table

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- needed for gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        UNIQUE NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT,                        -- null if signed up via Google
  google_id     TEXT        UNIQUE,          -- null if signed up with credentials
  created_at    TIMESTAMP   NOT NULL DEFAULT NOW()
);

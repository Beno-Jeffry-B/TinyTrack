-- URLs table
CREATE TABLE IF NOT EXISTS urls (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_url TEXT        NOT NULL,
  short_code   TEXT        UNIQUE NOT NULL,
  clicks       INTEGER     NOT NULL DEFAULT 0,
  expires_at   TIMESTAMP,                       -- null = never expires
  is_deleted   BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Clicks table
CREATE TABLE IF NOT EXISTS clicks (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  url_id     UUID      NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  ip         TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for fast short_code lookups
CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);

-- Leaderboard table: weekly XP tracking per user
CREATE TABLE IF NOT EXISTS weekly_xp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_id TEXT NOT NULL,  -- e.g. "2026-W14"
  xp INTEGER NOT NULL DEFAULT 0,
  league INTEGER NOT NULL DEFAULT 0,  -- 0=bronze, 1=silver, 2=gold, 3=diamond, 4=ruby
  name TEXT,
  avatar TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_id)
);

-- Index for fast weekly queries
CREATE INDEX IF NOT EXISTS idx_weekly_xp_week ON weekly_xp(week_id, xp DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_xp_user_week ON weekly_xp(user_id, week_id);

-- RLS: users can read all weekly_xp, but only update their own
ALTER TABLE weekly_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read leaderboard" ON weekly_xp
  FOR SELECT USING (true);

CREATE POLICY "Users can upsert own weekly XP" ON weekly_xp
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly XP" ON weekly_xp
  FOR UPDATE USING (auth.uid() = user_id);

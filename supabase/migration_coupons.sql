-- Coupon codes that grant bonus free exercises

CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  extra_exercises INTEGER NOT NULL,
  max_uses INTEGER, -- null = unlimited
  uses_count INTEGER DEFAULT 0 NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Track which users redeemed which coupons (one per user per coupon)
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coupon_id UUID REFERENCES coupons(id) NOT NULL,
  extra_exercises INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, coupon_id)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id ON coupon_redemptions(user_id);

-- RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can read active coupons (needed to validate code client-side is not required, but backend uses service role)
-- No direct user read needed; backend validates via service_role

-- Users can read their own redemptions
CREATE POLICY "Users can read own redemptions"
  ON coupon_redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- service_role can do everything
CREATE POLICY "Service role manages coupons"
  ON coupons FOR ALL
  USING (true);

CREATE POLICY "Service role manages redemptions"
  ON coupon_redemptions FOR ALL
  USING (true);

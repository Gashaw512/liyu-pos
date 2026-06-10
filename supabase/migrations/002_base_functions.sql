-- =========================================================
-- 002_base_functions.sql
-- Shared helper functions used throughout Liyu POS
-- No tables
-- No triggers
-- No RLS policies
-- =========================================================

-- Auto-update updated_at timestamp function

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

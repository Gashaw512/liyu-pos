-- ============================================================
-- 014_seed_data.sql
-- Domain: Production Seed Baselines & Default System Settings
-- Dependencies: 005_schema_catalog.sql
-- ============================================================

-- ─── 1. SEED DEFAULT POPULAR ETHIOPIAN HOSPITALITY CATEGORIES ───────────
INSERT INTO public.category_templates (business_type, name_en, name_am, sort_order)
VALUES 
  ('bar_restaurant', 'Hot Drinks', 'ትኩስ መጠጦች', 1),
  ('bar_restaurant', 'Soft Drinks', 'ለስላሳ መጠጦች', 2),
  ('bar_restaurant', 'Traditional Foods', 'ባህላዊ ምግቦች', 3),
  ('bar_restaurant', 'Alcoholic Beverages', 'የአልኮል መጠጦች', 4),
  ('bar_restaurant', 'Fast Foods', 'ፈጣን ምግቦች', 5),
  ('cafe_restaurant', 'Pastry & Cakes', 'ኬኮች እና  pastries', 1),
  ('cafe_restaurant', 'Macchiato & Coffee', 'ማኪያቶ እና ቡና', 2),
  ('retail_kiosk', 'Packaged Snacks', 'የታሸጉ ምግቦች', 1),
  ('retail_kiosk', 'Cigarettes & Utilities', 'ሲጋራ እና መገልገያዎች', 2)
ON CONFLICT DO NOTHING;
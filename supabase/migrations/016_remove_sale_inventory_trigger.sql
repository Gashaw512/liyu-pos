-- 016_remove_sale_inventory_trigger.sql

DROP TRIGGER IF EXISTS trg_sale_item_inventory
ON public.sale_items;
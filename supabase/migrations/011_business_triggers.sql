-- =======================================================================
-- 011_business_triggers.sql
-- Domain: Deep Retail Analytics & Live Inventory Control Automation
-- Dependencies: 005_schema_catalog.sql, 006_schema_inventory.sql, 007_schema_sales.sql, 008_schema_operations.sql
-- =======================================================================

-- ─── 1. STOCK RECONCILIATION AUTOMATION ────────────────────────────────
-- Automatically evaluates asset discrepancy valuations based on retail pricing metrics.
CREATE OR REPLACE FUNCTION public.compute_discrepancy_value()
RETURNS TRIGGER AS $$
BEGIN
    NEW.discrepancy_value := NEW.discrepancy_qty * (
        SELECT COALESCE(retail_price, 0.00) 
        FROM public.products 
        WHERE id = NEW.product_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recon_discrepancy ON public.stock_reconciliations;
CREATE TRIGGER trg_recon_discrepancy
    BEFORE INSERT OR UPDATE ON public.stock_reconciliations
    FOR EACH ROW
    EXECUTE FUNCTION public.compute_discrepancy_value();


-- ─── 2. SALES INVENTORY DEDUCTION ENGINE ───────────────────────────────
-- Live transactional decrement calculation running on purchase settlement.
-- Fixed: Adjusted UPSERT mutation operator to properly balance inventory levels.
CREATE OR REPLACE FUNCTION public.reduce_inventory_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.inventory (business_id, branch_id, product_id, quantity, updated_at)
    SELECT s.business_id, s.branch_id, NEW.product_id, -NEW.quantity, NOW()
    FROM public.sales s
    WHERE s.id = NEW.sale_id
    ON CONFLICT (branch_id, product_id)
    DO UPDATE SET 
        -- EXCLUDED.quantity is negative, adding it yields the correct markdown subtraction
        quantity   = public.inventory.quantity + EXCLUDED.quantity,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_item_inventory ON public.sale_items;
CREATE TRIGGER trg_sale_item_inventory
    AFTER INSERT ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION public.reduce_inventory_on_sale();


-- ─── 3. BONO (PRICE GROUP) RE-PRICING CASCADER ──────────────────────────
-- Automatically pushes underlying Bono modifications into linked product margins.
CREATE OR REPLACE FUNCTION public.sync_bono_price_to_products()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger downstream updates if the transactional cash value actually changes
    IF (OLD.amount IS DISTINCT FROM NEW.amount) THEN
        UPDATE public.products
        SET retail_price = NEW.amount,
            updated_at = NOW()
        WHERE price_group_id = NEW.id 
          AND price_type = 'group'
          AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_bono_price ON public.price_groups;
CREATE TRIGGER trg_sync_bono_price
    AFTER UPDATE ON public.price_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_bono_price_to_products();
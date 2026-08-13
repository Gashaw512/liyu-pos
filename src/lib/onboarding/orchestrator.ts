import { SupabaseClient } from '@supabase/supabase-js'
import { BusinessType, TemplateProduct, getSectorTemplatePackage } from './templates'

export interface SetupPayload {
    businessType: BusinessType;
    openTime: string;
    closeTime: string;
    categories: string[];
    products: TemplateProduct[];
}

export interface OnboardingContext {
    supabase: SupabaseClient;
    payload: SetupPayload;
    businessId: string;
    branchId?: string;
    fullCategoryCatalog?: Array<{ id: string; name: string; name_am: string }>;
    createdProducts?: Array<{ id: string }>;
    logs: string[];
}

export type OnboardingStepHook = (ctx: OnboardingContext) => Promise<void>;

const ONBOARDING_CONFIG = {
    defaultBranchName: 'ዋናው ቅርንጫፍ (Main Branch)',
    defaultUnitType: 'piece',
    defaultLowStockAlert: 5,
    trackInventoryDefault: true,
    enablePostProvisioningHooks: true,
};

// Pipeline Step 1: Update operational hours
const updateBusinessConfigurationStep: OnboardingStepHook = async (ctx) => {
    const { error } = await ctx.supabase
        .from('businesses')
        .update({
            type: ctx.payload.businessType,
            address: `Hours: ${ctx.payload.openTime} - ${ctx.payload.closeTime}`
        })
        .eq('id', ctx.businessId);

    if (error) throw new Error(`Business profile update failed: ${error.message}`);
    ctx.logs.push('Business configuration updated successfully.');
};

// Pipeline Step 2: Establish main branch context
const resolveBranchStep: OnboardingStepHook = async (ctx) => {
    let { data: branchRow } = await ctx.supabase
        .from('branches')
        .select('id')
        .eq('business_id', ctx.businessId)
        .eq('is_main', true)
        .maybeSingle();

    if (!branchRow) {
        const { data: newBranch, error } = await ctx.supabase
            .from('branches')
            .insert({
                business_id: ctx.businessId,
                name: ONBOARDING_CONFIG.defaultBranchName,
                is_main: true,
                is_active: true
            })
            .select('id')
            .single();

        if (error || !newBranch) throw new Error(`Operational branch creation failed: ${error?.message}`);
        branchRow = newBranch;
    }

    ctx.branchId = branchRow.id;
    ctx.logs.push(`Branch context resolved to UUID: ${ctx.branchId}`);
};

// Pipeline Step 3: Seed translation categories safely
const provisionCategoriesStep: OnboardingStepHook = async (ctx) => {
    const { data: existingCategories, error: fetchErr } = await ctx.supabase
        .from('categories')
        .select('id, name, name_am')
        .eq('business_id', ctx.businessId);

    if (fetchErr) throw new Error(`Existing category scan failed: ${fetchErr.message}`);

    const existingCatNames = new Set((existingCategories || []).map(c => c.name.toLowerCase()));
    const seedPackage = getSectorTemplatePackage(ctx.payload.businessType);

    const categoriesPayload = ctx.payload.categories
        .map(catLabel => seedPackage.categories.find(c => c.name === catLabel || c.name_am === catLabel))
        .filter((cat): cat is NonNullable<typeof cat> => !!cat && !existingCatNames.has(cat.name.toLowerCase()))
        .map((cat) => ({
            business_id: ctx.businessId,
            name: cat.name,
            name_am: cat.name_am,
            icon: cat.icon || '📦',
            color: cat.color || '#64748b',
            is_active: true
        }));

    if (categoriesPayload.length > 0) {
        const { error: insertErr } = await ctx.supabase.from('categories').insert(categoriesPayload);
        if (insertErr) throw new Error(`Batch category generation aborted: ${insertErr.message}`);
    }

    const { data: fullCatalog, error: catFetchErr } = await ctx.supabase
        .from('categories')
        .select('id, name, name_am')
        .eq('business_id', ctx.businessId);

    if (catFetchErr || !fullCatalog) throw new Error(`Reconciling categories footprint failed: ${catFetchErr?.message}`);

    ctx.fullCategoryCatalog = fullCatalog;
    ctx.logs.push(`Category sync completed. Total categories: ${fullCatalog.length}`);
};

// Pipeline Step 4: Seed starter product lists
const provisionProductsStep: OnboardingStepHook = async (ctx) => {
  if (!ctx.branchId || !ctx.fullCategoryCatalog) throw new Error('Missing dependent workflow artifacts.');

  // ✅ Fixed: Context explicitly assigned to ctx.supabase to eliminate reference crashes
  const { data: existingProducts, error: fetchErr } = await ctx.supabase
    .from('products')
    .select('name')
    .eq('business_id', ctx.businessId);

  if (fetchErr) throw new Error(`Existing item matching failed: ${fetchErr.message}`);

  const existingProdNames = new Set((existingProducts || []).map(p => (p.name || '').toLowerCase().trim()));

  const productsPayload = (ctx.payload.products || [])
    .filter((prod) => {
      const rawName = prod.name || (prod as any).nameEn;
      if (!rawName) return false; 
      
      return !existingProdNames.has(rawName.toLowerCase().trim());
    })
    .map((prod) => {
      const fallbackName = prod.name || (prod as any).nameEn || '';
      const fallbackNameAm = prod.name_am || (prod as any).nameAm || fallbackName;
      const fallbackCatName = prod.category_name || (prod as any).categoryEn || (prod as any).categoryAm || '';

      const matchedCat = ctx.fullCategoryCatalog!.find(
        (c) => (c.name || '').toLowerCase() === fallbackCatName.toLowerCase() || 
               (c.name_am || '').toLowerCase() === fallbackCatName.toLowerCase()
      );

      return {
        business_id: ctx.businessId,
        category_id: matchedCat ? matchedCat.id : null,
        name: fallbackName,
        name_am: fallbackNameAm,
        cost_price: Number(prod.cost_price || (prod as any).cost || 0),
        retail_price: Number(prod.retail_price || (prod as any).sell || 0),
        unit_type: prod.unit_type || ONBOARDING_CONFIG.defaultUnitType,
        is_active: true,
        track_inventory: prod.track_inventory ?? ONBOARDING_CONFIG.trackInventoryDefault,
        low_stock_alert: prod.low_stock_alert || ONBOARDING_CONFIG.defaultLowStockAlert 
      };
    });

  ctx.createdProducts = [];
  if (productsPayload.length > 0) {
    const { data: insertedProds, error } = await ctx.supabase
      .from('products')
      .insert(productsPayload)
      .select('id');

    if (error || !insertedProds) throw new Error(`Batch items instantiation aborted: ${error?.message}`);
    ctx.createdProducts = insertedProds;
  }
  
  ctx.logs.push(`Products sync complete. Newly added count: ${ctx.createdProducts.length}`);
};

// Pipeline Step 5: Assign inventory ledger rows
const initializeInventoryStep: OnboardingStepHook = async (ctx) => {
    if (!ctx.createdProducts || ctx.createdProducts.length === 0) {
        ctx.logs.push('No new products provisioned. Inventory skipped.');
        return;
    }

    const inventoryPayload = ctx.createdProducts.map((product) => ({
        business_id: ctx.businessId,
        branch_id: ctx.branchId!,
        product_id: product.id,
        quantity: 0
    }));

    const { error } = await ctx.supabase.from('inventory').insert(inventoryPayload);
    if (error) throw new Error(`Auto-initializing inventory matrix failed: ${error.message}`);

    ctx.logs.push('Inventory sync matrices assigned.');
};

const postProvisioningExtensionStep: OnboardingStepHook = async (ctx) => {
    if (!ONBOARDING_CONFIG.enablePostProvisioningHooks) return;
    ctx.logs.push('Post-provisioning extension step telemetry ran cleanly.');
};

// Executive Executive Runner Core
export async function setupBusiness(supabase: SupabaseClient, payload: SetupPayload) {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) throw new Error('Unauthorized user instance configuration.');

    let businessId = user.user_metadata?.business_id || user.app_metadata?.business_id;

    if (!businessId) {
        const { data: profileRow } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', user.id)
            .maybeSingle();

        if (profileRow?.business_id) {
            businessId = profileRow.business_id;
        }
    }

    if (!businessId) {
        throw new Error('Workspace Deadlock: Missing a valid business UUID for this profile.');
    }

    const context: OnboardingContext = {
        supabase,
        payload,
        businessId,
        logs: []
    };

    const pipeline: OnboardingStepHook[] = [
        updateBusinessConfigurationStep,
        resolveBranchStep,
        provisionCategoriesStep,
        provisionProductsStep,
        initializeInventoryStep,
        postProvisioningExtensionStep
    ];

    for (const step of pipeline) {
        await step(context);
    }

    return {
        success: true,
        businessId: context.businessId,
        branchId: context.branchId!,
        executionLogs: context.logs
    };
}

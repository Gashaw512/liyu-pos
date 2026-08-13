import { SupabaseClient } from '@supabase/supabase-js'
// ⚠️ unified modern templates module
import { BusinessType, TemplateProduct, getSectorTemplatePackage } from './templates'

// =========================================================
// ENTERPRISE TYPES & CONFIGURATION INTERFACES
// =========================================================
export interface SetupPayload {
  businessType: BusinessType;
  openTime: string;
  closeTime: string;
  categories: string[]; // Explicit categories chosen by merchant or defaulted
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

// =========================================================
// PLUGGABLE PIPELINE STEPS
// =========================================================

/**
 * Step 1: Modifies core business profiles operational parameters
 */
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

/**
 * Step 2: Validates or Provisions baseline operational branch structures
 */
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

/**
 * Step 3: Scans and processes default template categories cleanly
 */
const provisionCategoriesStep: OnboardingStepHook = async (ctx) => {
  const { data: existingCategories, error: fetchErr } = await ctx.supabase
    .from('categories')
    .select('id, name, name_am')
    .eq('business_id', ctx.businessId);

  if (fetchErr) throw new Error(`Existing category scan failed: ${fetchErr.message}`);

  const existingCatNames = new Set((existingCategories || []).map(c => c.name.toLowerCase()));
  const seedPackage = getSectorTemplatePackage(ctx.payload.businessType);

  // Match selected string back onto the template package array to find rich translations
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
  ctx.logs.push(`Category sync completed. Total working categories: ${fullCatalog.length}`);
};

/**
 * Step 4: Handles template products item provisions
 */
const provisionProductsStep: OnboardingStepHook = async (ctx) => {
  if (!ctx.branchId || !ctx.fullCategoryCatalog) throw new Error('Missing dependent workflow artifacts.');

  const { data: existingProducts, error: fetchErr } = await ctx.supabase
    .from('products')
    .select('name')
    .eq('business_id', ctx.businessId);

  if (fetchErr) throw new Error(`Existing item matching execution failed: ${fetchErr.message}`);

  const existingProdNames = new Set((existingProducts || []).map(p => p.name.toLowerCase()));

  const productsPayload = ctx.payload.products
    .filter(prod => !existingProdNames.has(prod.name.toLowerCase()))
    .map((prod) => {
      // Robust multi-lingual string match check
      const matchedCat = ctx.fullCategoryCatalog!.find(
        (c) => c.name.toLowerCase() === prod.category_name?.toLowerCase() || 
               c.name_am.toLowerCase() === prod.category_name?.toLowerCase()
      );

      return {
        business_id: ctx.businessId,
        category_id: matchedCat ? matchedCat.id : null,
        name: prod.name,
        name_am: prod.name_am,
        cost_price: Number(prod.cost_price || 0),
        retail_price: Number(prod.retail_price || 0),
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

    if (error || !insertedProds) throw new Error(`Batch processing items instantiation aborted: ${error?.message}`);
    ctx.createdProducts = insertedProds;
  }
  
  ctx.logs.push(`Products sync complete. Newly added records count: ${ctx.createdProducts.length}`);
};

/**
 * Step 5: Maps inventory tracking matrices
 */
const initializeInventoryStep: OnboardingStepHook = async (ctx) => {
  if (!ctx.createdProducts || ctx.createdProducts.length === 0) {
    ctx.logs.push('No new products provisioned. Inventory generation skipped.');
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

/**
 * Step 6: Post-provisioning telemetry hooks
 */
const postProvisioningExtensionStep: OnboardingStepHook = async (ctx) => {
  if (!ONBOARDING_CONFIG.enablePostProvisioningHooks) return;
  try {
    ctx.logs.push('Post-provisioning extension step telemetry ran cleanly.');
  } catch (err) {
    console.error('Non-blocking extension task failure: ', err);
  }
};

// =========================================================
// EXECUTIVE CORE WORKFLOW ORCHESTRATOR
// =========================================================
export async function setupBusiness(supabase: SupabaseClient, payload: SetupPayload) {
  // 1. Core workspace user validation check
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Unauthorized user instance configuration aborted.');

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
    throw new Error('Workspace Resolution Deadlock: Missing a valid business UUID for this account profile.');
  }

  // 2. Initialize the shared operational execution context mapping pipeline array
  const context: OnboardingContext = {
    supabase,
    payload,
    businessId,
    logs: []
  };

  // Pipeline workflow execution registry string array
  const pipeline: OnboardingStepHook[] = [
    updateBusinessConfigurationStep,
    resolveBranchStep,
    provisionCategoriesStep,
    provisionProductsStep,
    initializeInventoryStep,
    postProvisioningExtensionStep // Bounded safely at terminal end
  ];

  // 3. Process every registered step handler loop sequentially
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

import { SupabaseClient } from '@supabase/supabase-js'
import { BusinessType, TemplateProduct } from './categoryTemplates'

// =========================================================
// ENTERPRISE TYPES & CONFIGURATION INTERFACES
// =========================================================
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
  fullCategoryCatalog?: Array<{ id: string; name: string }>;
  createdProducts?: Array<{ id: string }>;
  logs: string[];
}

// Highly extensible middleware-style pipeline step layout
export type OnboardingStepHook = (ctx: OnboardingContext) => Promise<void>;

/**
 * Enterprise Orchestration Options
 * Use these settings to switch core behaviors on the fly without changing runtime code blocks
 */
const ONBOARDING_CONFIG = {
  defaultBranchName: 'ዋናው ቅርንጫፍ (Main Branch)',
  defaultUnitType: 'piece',
  defaultLowStockAlert: 5,
  trackInventoryDefault: true,
  enablePostProvisioningHooks: true, 
};

// =========================================================
// PLUGGABLE PIPELINE STEPS (ADD AND CONFIGURE LATER)
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
 * Step 3: Scans and processes default template categories safely
 */
const provisionCategoriesStep: OnboardingStepHook = async (ctx) => {
  const { data: existingCategories, error: fetchErr } = await ctx.supabase
    .from('categories')
    .select('id, name')
    .eq('business_id', ctx.businessId);

  if (fetchErr) throw new Error(`Existing category scan failed: ${fetchErr.message}`);

  const existingCatNames = new Set((existingCategories || []).map(c => c.name.toLowerCase()));

  const categoriesPayload = ctx.payload.categories
    .filter(catName => !existingCatNames.has(catName.toLowerCase()))
    .map((catName) => ({
      business_id: ctx.businessId,
      name: catName,
      name_am: catName,
      is_active: true
    }));

  if (categoriesPayload.length > 0) {
    const { error: insertErr } = await ctx.supabase.from('categories').insert(categoriesPayload);
    if (insertErr) throw new Error(`Batch category generation aborted: ${insertErr.message}`);
  }

  const { data: fullCatalog, error: catFetchErr } = await ctx.supabase
    .from('categories')
    .select('id, name')
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
    .filter(prod => !existingProdNames.has(prod.nameEn.toLowerCase()))
    .map((prod) => {
      const matchedCat = ctx.fullCategoryCatalog!.find(
        (c) => c.name.toLowerCase() === prod.categoryAm?.toLowerCase() || 
               c.name.toLowerCase() === prod.categoryEn?.toLowerCase()
      );

      return {
        business_id: ctx.businessId,
        branch_id: ctx.branchId!,
        category_id: matchedCat ? matchedCat.id : null,
        name: prod.nameEn,
        name_am: prod.nameAm,
        cost_price: Number(prod.cost || 0),
        retail_price: Number(prod.sell || 0),
        unit_type: ONBOARDING_CONFIG.defaultUnitType,
        is_active: true,
        track_inventory: ONBOARDING_CONFIG.trackInventoryDefault,
        low_stock_alert: ONBOARDING_CONFIG.defaultLowStockAlert 
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
 * 🟢 BACKEND HOOKS FOR COLD EXTENSION (Add feature extensions here easily)
 * Put notification dispatches, cloud analytics pipelines, or stripe updates here
 */
const postProvisioningExtensionStep: OnboardingStepHook = async (ctx) => {
  if (!ONBOARDING_CONFIG.enablePostProvisioningHooks) return;
  
  try {
    // Example: await ctx.supabase.from('audit_logs').insert({ event: 'tenant_onboarded', business_id: ctx.businessId })
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

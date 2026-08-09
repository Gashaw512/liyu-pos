import { SupabaseClient } from '@supabase/supabase-js'
import { BusinessType, TemplateProduct } from './categoryTemplates'

interface SetupPayload {
  businessType: BusinessType;
  openTime: string;
  closeTime: string;
  categories: string[];
  products: TemplateProduct[];
}

export async function setupBusiness(supabase: SupabaseClient, payload: SetupPayload) {
  // 1. Core session extraction
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) throw new Error('Unauthorized user instance configuration aborted.')

  let businessId = user.user_metadata?.business_id || user.app_metadata?.business_id

  // If metadata isn't set, pull from profiles table
  if (!businessId) {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileRow?.business_id) {
      businessId = profileRow.business_id
    }
  }

  if (!businessId) {
    throw new Error('Workspace Resolution Deadlock: Missing a valid business UUID for this account profile.')
  }

  // 2. Update Business Profile operational hours safely 
  const { error: updateBizErr } = await supabase
    .from('businesses')
    .update({
      type: payload.businessType,
      address: `Hours: ${payload.openTime} - ${payload.closeTime}`
    })
    .eq('id', businessId)

  if (updateBizErr) throw new Error(`Business schema mutation failed: ${updateBizErr.message}`)

  // 3. Resolve or Automatically Provision the Default Main Branch
  let { data: branchRow } = await supabase
    .from('branches')
    .select('id')
    .eq('business_id', businessId)
    .eq('is_main', true)
    .maybeSingle()

  if (!branchRow) {
    const { data: newBranch, error: createBranchErr } = await supabase
      .from('branches')
      .insert({
        business_id: businessId,
        name: 'ዋናው ቅርንጫፍ (Main Branch)',
        is_main: true,
        is_active: true
      })
      .select('id')
      .single()

    if (createBranchErr || !newBranch) {
      throw new Error(`Failed creating mandatory baseline operational branch: ${createBranchErr?.message}`)
    }
    branchRow = newBranch
  }
  const branchId = branchRow.id

  // 4. Batch Populate Categories
  const categoriesPayload = payload.categories.map((catName) => ({
    business_id: businessId,
    name: catName,
    name_am: catName,
    is_active: true
  }))

  const { data: createdCategories, error: catInsertErr } = await supabase
    .from('categories')
    .insert(categoriesPayload)
    .select('id, name')

  if (catInsertErr || !createdCategories) {
    throw new Error(`Batch processing categories instantiation aborted: ${catInsertErr?.message}`)
  }

  // 5. Map Products Matching Exact Schema Column Variables
  const productsPayload = payload.products.map((prod) => {
    const matchingCategoryRow = createdCategories.find((c) => c.name === prod.categoryAm || c.name === prod.categoryEn)

    return {
      business_id: businessId,
      branch_id: branchId,
      category_id: matchingCategoryRow ? matchingCategoryRow.id : null,
      name: prod.nameEn,
      name_am: prod.nameAm,
      cost_price: Number(prod.cost || 0),   // Matches database column configuration
      retail_price: Number(prod.sell || 0), // Matches database column configuration
      unit_type: 'piece',
      is_active: true,
      track_inventory: true,
      low_stock_alert: 5 
    }
  })

  const { data: createdProducts, error: prodInsertErr } = await supabase
    .from('products')
    .insert(productsPayload)
    .select('id')

  if (prodInsertErr || !createdProducts) {
    throw new Error(`Batch processing items instantiation aborted: ${prodInsertErr?.message}`)
  }

  // 6. Generate Matching Inventory Rows to prevent empty UI lookups
  const inventoryPayload = createdProducts.map((product) => ({
    business_id: businessId,
    branch_id: branchId,
    product_id: product.id,
    quantity: 0
  }))

  const { error: invInsertErr } = await supabase
    .from('inventory')
    .insert(inventoryPayload)

  if (invInsertErr) {
    throw new Error(`Auto-initializing inventory matrix failed: ${invInsertErr.message}`)
  }

  return { success: true, businessId, branchId }
}
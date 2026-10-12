// src/app/api/products/templates/route.ts

import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '../../../../lib/supabase/server'
import { signPriceProof } from '@/lib/security/price-proof'

export const dynamic = 'force-dynamic'

/**
 * This endpoint provides the authenticated user's offline reference catalog.
 *
 * Returned data:
 * - products: business products available to the user's branch
 * - categories: active categories for the business
 * - inventory: stock for the user's active branch only
 *
 * Important:
 * - Business isolation is enforced from the authenticated profile.
 * - The client cannot choose another business.
 * - Inventory is always branch-scoped.
 * - Deleted/inactive catalog records are excluded.
 * - Response shape remains compatible with syncEngine.ts.
 */

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  ) {
    const message = (error as { message?: unknown }).message

    if (typeof message === 'string') {
      return message
    }
  }

  return 'Unknown server error'
}

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get('authorization')
    const bearerToken = authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1]
    const supabase = bearerToken
      ? createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${bearerToken}` } } },
      )
      : await createClient()

    // ============================================================
    // 1. AUTHENTICATION
    // ============================================================

    const {
      data: { user },
      error: authError,
    } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser()

    if (authError) {
      console.error(
        '[CATALOG SYNC] Authentication check failed:',
        authError.message,
      )

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      )
    }

    // ============================================================
    // 2. RESOLVE AUTHENTICATED BUSINESS CONTEXT
    // ============================================================
    //
    // Never trust business_id supplied by the browser.
    // The business comes from the authenticated profile.
    //

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        `
          business_id,
          branch_id,
          is_active,
          deleted_at
        `,
      )
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error(
        '[CATALOG SYNC] Failed to resolve profile:',
        profileError.message,
      )

      return NextResponse.json(
        { error: 'Unable to resolve account context' },
        { status: 500 },
      )
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 403 },
      )
    }

    if (profile.deleted_at) {
      return NextResponse.json(
        { error: 'Account is no longer active' },
        { status: 403 },
      )
    }

    if (profile.is_active === false) {
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 },
      )
    }

    if (!profile.business_id) {
      return NextResponse.json(
        { error: 'Business is not configured' },
        { status: 403 },
      )
    }

    const businessId = profile.business_id

    // ============================================================
    // 3. RESOLVE BRANCH
    // ============================================================
    //
    // Prefer the authenticated user's branch.
    // If the profile has no branch, fall back to the business'
    // main branch.
    //
    // We ALWAYS verify that the branch belongs to this business.
    //

    let branchId = profile.branch_id

    if (branchId) {
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('id')
        .eq('id', branchId)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (branchError) {
        console.error(
          '[CATALOG SYNC] Failed to validate branch:',
          branchError.message,
        )

        return NextResponse.json(
          { error: 'Unable to resolve branch context' },
          { status: 500 },
        )
      }

      if (!branch) {
        branchId = null
      }
    }

    // No valid profile branch -> use the business main branch.
    if (!branchId) {
      const { data: mainBranch, error: mainBranchError } =
        await supabase
          .from('branches')
          .select('id')
          .eq('business_id', businessId)
          .eq('is_main', true)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

      if (mainBranchError) {
        console.error(
          '[CATALOG SYNC] Failed to resolve main branch:',
          mainBranchError.message,
        )

        return NextResponse.json(
          { error: 'Unable to resolve branch context' },
          { status: 500 },
        )
      }

      branchId = mainBranch?.id ?? null
    }

    if (!branchId) {
      return NextResponse.json(
        { error: 'No active branch is configured for this business' },
        { status: 403 },
      )
    }

    // ============================================================
    // 4. LOAD TENANT-SCOPED CATALOG
    // ============================================================
    //
    // Products:
    // - Must belong to this business.
    // - Must be active and not deleted.
    // - Business-wide products (branch_id IS NULL) are available.
    // - Branch-specific products are included only for this branch.
    //
    // Categories:
    // - Business scoped.
    // - Active and not deleted.
    //
    // Inventory:
    // - Business scoped.
    // - Current branch only.
    //

    const [
      productsRes,
      categoriesRes,
      inventoryRes,
      businessRes,
    ] = await Promise.all([
      supabase
        .from('products')
        .select(
          `
            id,
            business_id,
            branch_id,
            category_id,
            name,
            name_am,
            barcode,
            sku,
            unit_type,
            units_per_crate,
            cost_price,
            retail_price,
            tax_inclusive,
            image_url,
            is_active,
            is_sold_by_weight,
            track_inventory,
            low_stock_alert,
            created_at,
            updated_at,
            deleted_at
          `,
        )
        .eq('business_id', businessId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .or(
          `branch_id.is.null,branch_id.eq.${branchId}`,
        )
        .order('name', { ascending: true }),

      supabase
        .from('categories')
        .select(
          `
            id,
            business_id,
            name,
            name_am,
            group_type,
            icon,
            color,
            sort_order,
            is_active,
            created_at,
            deleted_at
          `,
        )
        .eq('business_id', businessId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),

      supabase
        .from('inventory')
        .select(
          `
            id,
            business_id,
            branch_id,
            product_id,
            quantity,
            updated_at
          `,
        )
        .eq('business_id', businessId)
        .eq('branch_id', branchId)
        .order('product_id', { ascending: true }),
      supabase
        .from('businesses')
        .select('tax_rate')
        .eq('id', businessId)
        .maybeSingle(),
    ])

    // ============================================================
    // 5. HANDLE DATABASE ERRORS
    // ============================================================

    if (productsRes.error) {
      console.error(
        '[CATALOG SYNC] Products query failed:',
        productsRes.error.message,
      )

      return NextResponse.json(
        { error: 'Failed to load products' },
        { status: 500 },
      )
    }

    if (categoriesRes.error) {
      console.error(
        '[CATALOG SYNC] Categories query failed:',
        categoriesRes.error.message,
      )

      return NextResponse.json(
        { error: 'Failed to load categories' },
        { status: 500 },
      )
    }

    if (inventoryRes.error) {
      console.error(
        '[CATALOG SYNC] Inventory query failed:',
        inventoryRes.error.message,
      )

      return NextResponse.json(
        { error: 'Failed to load inventory' },
        { status: 500 },
      )
    }
    if (businessRes.error || !businessRes.data) {
      return NextResponse.json(
        { error: 'Failed to load business tax settings' },
        { status: 500 },
      )
    }

    // ============================================================
    // 6. BUILD RESPONSE
    // ============================================================

    const businessTaxRate = Number(businessRes.data.tax_rate ?? 0)
    const products = (productsRes.data ?? []).map((product) => ({
      ...product,
      // The signature travels with the offline catalog entry and proves this
      // exact price was issued by the server for this tenant and branch.
      price_proof: signPriceProof({
        version: 1,
        businessId,
        branchId,
        productId: product.id,
      priceCents: Math.round(Number(product.retail_price) * 100),
      taxRateBps: Math.round(businessTaxRate * 100),
      taxInclusive: product.tax_inclusive !== false,
      kind: 'catalog',
      }),
      business_tax_rate: businessTaxRate,
    }))
    const categories = categoriesRes.data ?? []
    const inventory = inventoryRes.data ?? []

    console.log(
      '[CATALOG SYNC] Catalog prepared:',
      {
        userId: user.id,
        businessId,
        branchId,
        products: products.length,
        categories: categories.length,
        inventory: inventory.length,
      },
    )

    // ============================================================
    // 7. RETURN SYNC SNAPSHOT
    // ============================================================
    //
    // Keep this exact structure because syncEngine.ts expects it.
    //

    return NextResponse.json(
      {
        products,
        categories,
        inventory,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store',
        },
      },
    )
  } catch (error: unknown) {
    const message = getErrorMessage(error)

    console.error(
      '[CATALOG SYNC] Unexpected catalog failure:',
      message,
    )

    return NextResponse.json(
      {
        error: 'Failed to build catalog configurations',
      },
      {
        status: 500,
      },
    )
  }
}

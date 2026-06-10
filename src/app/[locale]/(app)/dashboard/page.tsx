import { createClient } from "../../../../lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClientContent from "./DashboardClientContent";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function DashboardOverviewPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createClient();

  // 1. Verify user authentication context
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login` as any);
  }

  // Fallback to your offline mock token fallback "biz_active" if metadata isn't written yet
  const businessId = user.user_metadata?.business_id || user.app_metadata?.business_id || "biz_active";
  const businessName = user.user_metadata?.business_name || "Liyu POS Backend";

  // 2. Fetch baseline metadata metrics concurrently from cloud database
  const [
    productsResponse, 
    categoriesResponse, 
    profileResponse,
    salesResponse
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId),
    
    supabase
      .from("categories")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId),
    
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single(),

    supabase
      .from("sales_by_category_summary") 
      .select("category_name, items_sold, gross_revenue")
      .eq("business_id", businessId)
  ]);

  // Log fetch metrics safely 
  if (salesResponse.error) console.info("Note: No live sales records found on server view yet.");

  const productCount = productsResponse.count || 0;
  const categoryCount = categoriesResponse.count || 0;
  const userRole = profileResponse.data?.role || user.user_metadata?.role || "owner";

  // Format category sales summary arrays (Will safely empty array [] if offline rows haven't synced yet)
  const categoryBreakdown = (salesResponse.data || []).map(row => ({
    name: row.category_name || "Uncategorized",
    itemsSold: Number(row.items_sold || 0),
    revenue: Number(row.gross_revenue || 0)
  }));

  // 3. Render client layout dashboard securely populated with cloud infrastructure states
  return (
    <DashboardClientContent 
      locale={locale} 
      role={userRole} 
      businessName={businessName}
      initialProductCount={productCount}
      initialCategoryCount={categoryCount}
      categoryBreakdown={categoryBreakdown}
      lowStockAlerts={[]} // Kept safe until your cloud syncing mechanism populates products
      
    />
  );
}
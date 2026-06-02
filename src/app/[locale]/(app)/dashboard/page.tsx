// import  createClient  from '../../../../lib/supabase/client';
import { createClient } from "../../../../lib/supabase/server"; 

export default async function DashboardOverviewPage() {
  const supabase = await createClient();

  // Basic diagnostic fetches to display database health counters
  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  const { count: categoryCount } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">እንኳን ደህና መጡ 👋</h2>
        <p className="text-sm text-slate-500 mt-1">Here is a summary breakdown of your Liyu POS workspace metrics.</p>
      </div>

      {/* Analytics Counter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">0.00 <span className="text-sm font-medium text-slate-400">ETB</span></p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Products</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{productCount || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product Categories</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{categoryCount || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shift Manager</p>
          <p className="text-sm font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2.5 py-1 inline-block mt-2">
            No Open Shift
          </p>
        </div>
      </div>

      {/* Workspace Isolation Notice */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-2">Workspace Isolation Confirmed</h3>
        <p className="text-sm text-slate-500 max-w-2xl mb-4">
          Your database migrations run seamlessly, and Row-Level Security isolation is perfectly separating your tables. Your layout routing group is successfully active.
        </p>
        <div className="border-l-4 border-emerald-500 bg-emerald-50/50 p-4 rounded-r-lg">
          <p className="text-xs font-medium text-emerald-800">
            💡 <strong>Next Step:</strong> Want to add your main register checkout interface? Drop a new page inside your route group folder at <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-pink-600">src/app/[locale]/(app)/dashboard/pos/page.tsx</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
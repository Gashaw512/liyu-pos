import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import AppShell from "../../../components/layout/AppShell";

interface AuthenticatedGroupLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

interface ProfileBusiness {
  name: string;
}

export const dynamic = "force-dynamic";

export default async function AuthenticatedGroupLayout({ 
  children, 
  params 
}: AuthenticatedGroupLayoutProps) {
  const { locale } = await params;
  const supabase = await createClient();

  // 1. የባለቤቱን/የሰራተኛውን ማንነት በከፍተኛ ጥበቃ ማረጋገጥ
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${locale}/auth/login` as any); // ወደ ትክክለኛው የ auth path መቀየር
  }

  // 2. ከ Row-Level Security (RLS) ጋር የተናበበ የተጠቃሚ መረጃ መሳብ
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      full_name,
      role,
      onboarding_completed,
      businesses (name)
    `)
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect(`/${locale}/auth/login` as any);
  }

  // 3. የኦንቦርዲንግ (Onboarding) ሂደት ካልተጠናቀቀ መገደብ
  if (!profile.onboarding_completed) {
    redirect(`/${locale}/onboarding`);
  }

  // Supabase Relations በተደጋጋሚ Array አድርጎ ስለሚመልሰው ደህንነቱ የተጠበቀ አያያዝ፡
  const businessRaw = profile.businesses;
  const businessData = Array.isArray(businessRaw) 
    ? (businessRaw[0] as unknown as ProfileBusiness | null)
    : (businessRaw as unknown as ProfileBusiness | null);

  return (
    <div className="w-full h-[100dvh] relative overflow-hidden bg-cream-100">
      <AppShell
        locale={locale}
        role={profile.role}
        fullName={profile.full_name}
        businessName={businessData?.name || "LIYU POS"}
      >
        {children}
      </AppShell>
    </div>
  );
}

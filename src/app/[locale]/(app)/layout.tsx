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

  // 1. Authenticate user safety state
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  // 2. Fetch multi-tenant workspace relations matching Row-Level Security
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
    redirect(`/${locale}/login`);
  }

  // 3. Keep un-initialized sessions constrained to onboarding pipeline
  if (!profile.onboarding_completed) {
    redirect(`/${locale}/onboarding`);
  }

  const businessData = profile.businesses as unknown as ProfileBusiness | null;

  return (
    <AppShell
      locale={locale}
      role={profile.role}
      fullName={profile.full_name}
      businessName={businessData?.name || "Liyu POS"}
    >
      {children}
    </AppShell>
  );
}
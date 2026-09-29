
// src/app/[locale]/onboarding/page.tsx
"use client";

import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import createClient from "@/lib/supabase/client";

// Centralized templates module
import {
  BusinessType,
  TemplateProduct,
  TemplateCategory,
  getSectorTemplatePackage,
} from "../../../lib/onboarding/templates";

import { setupBusiness } from "../../../lib/onboarding/orchestrator";

// Component step views
import WelcomeStep from "@/components/onboarding/WelcomeStep";
import BusinessHoursStep from "@/components/onboarding/BusinessHoursStep";
import CategoriesStep from "@/components/onboarding/CategoriesStep";
import ProductsStep from "@/components/onboarding/ProductsStep";
import ReviewStep from "@/components/onboarding/ReviewStep";
import SuccessStep from "@/components/onboarding/SuccessStep";

import {
  Loader2,
  Sparkles,
  Check,
  AlertCircle,
} from "lucide-react";

export default function OnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const locale = (params?.locale as string) || "am";
  const isAm = locale === "am";

  // ---------------------------------------------------------------------------
  // Workspace access / metadata
  // ---------------------------------------------------------------------------

  const [businessType, setBusinessType] =
    useState<BusinessType>("other");

  const [businessName, setBusinessName] = useState("");

  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // This page is strictly first-time onboarding.
  const [hasAccess, setHasAccess] = useState(false);

  // ---------------------------------------------------------------------------
  // Wizard navigation
  // ---------------------------------------------------------------------------

  const [step, setStep] = useState(0);
  const [highestVisitedStep, setHighestVisitedStep] = useState(0);

  const [isPending, startTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // Editable onboarding data
  // ---------------------------------------------------------------------------

  const [openTime, setOpenTime] = useState("06:00");
  const [closeTime, setCloseTime] = useState("23:00");

  const [categories, setCategories] =
    useState<TemplateCategory[]>([]);

  const [products, setProducts] =
    useState<TemplateProduct[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Step labels
  // ---------------------------------------------------------------------------

  const stepTitles = [
    isAm ? "እንኳን ደህና መጡ" : "Welcome",
    isAm ? "የሥራ ሰዓት" : "Business Hours",
    isAm ? "ምድቦች" : "Categories",
    isAm ? "ምርቶች" : "Products",
    isAm ? "ግምገማ" : "Review",
    isAm ? "ተጠናቋል" : "Complete",
  ];

  // ---------------------------------------------------------------------------
  // Wizard navigation
  // ---------------------------------------------------------------------------

  const goToStep = (nextStep: number) => {
    setErrorMessage(null);

    setStep(nextStep);

    setHighestVisitedStep((previous) =>
      Math.max(previous, nextStep),
    );
  };

  const handleNext = () => {
    goToStep(Math.min(step + 1, 5));
  };

  const handleBack = () => {
    goToStep(Math.max(step - 1, 0));
  };

  // ---------------------------------------------------------------------------
  // Safe business ID resolver
  // ---------------------------------------------------------------------------

  const resolveBusinessId = useCallback(
    async (userId: string): Promise<string> => {
      const { data: profileRow, error } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!profileRow?.business_id) {
        throw new Error(
          "Missing active business identification context",
        );
      }

      return profileRow.business_id;
    },
    [supabase],
  );

  // ---------------------------------------------------------------------------
  // Resolve session + enforce onboarding access
  //
  // ONLY:
  //   role === "owner"
  //   AND onboarding_completed !== true
  //
  // can remain on this page.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function getSessionContext() {
      try {
        setLoadingMetadata(true);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace(`/${locale}/login`);
          return;
        }

        const { data: profileRow, error: profileError } =
          await supabase
            .from("profiles")
            .select(
              "business_id, onboarding_completed, role",
            )
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        const isOwner = profileRow?.role === "owner";
        const onboardingCompleted =
          profileRow?.onboarding_completed === true;

        // ---------------------------------------------------------------------
        // HARD ACCESS RULE
        //
        // Non-owner:
        //   -> dashboard
        //
        // Already onboarded:
        //   -> dashboard
        //
        // Only owner + incomplete onboarding stays here.
        // ---------------------------------------------------------------------

        if (!isOwner || onboardingCompleted) {
          router.replace(`/${locale}/dashboard`);
          return;
        }

        if (cancelled) return;

        setHasAccess(true);

        const metadata = user.user_metadata || {};

        setBusinessName(
          metadata.business_name ||
            (isAm ? "የእኔ ንግድ" : "My Business"),
        );

        const detectedType =
          (metadata.business_type as BusinessType) || "other";

        setBusinessType(detectedType);

        const sectorPackage =
          getSectorTemplatePackage(detectedType);

        // ---------------------------------------------------------------------
        // First-time onboarding always starts from templates.
        //
        // Existing business configuration is NOT loaded here because this
        // route is no longer an edit/reconfiguration route.
        // ---------------------------------------------------------------------

        setCategories(sectorPackage.categories);
        setProducts(sectorPackage.products);
      } catch (error) {
        console.error(
          "[ONBOARDING] Failed reading workspace context:",
          error,
        );

        if (!cancelled) {
          setErrorMessage(
            isAm
              ? "የማቀናበሪያ መረጃውን መጫን አልተቻለም።"
              : "Could not load your onboarding workspace.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMetadata(false);
        }
      }
    }

    getSessionContext();

    return () => {
      cancelled = true;
    };
  }, [supabase, router, locale, isAm]);

  // ---------------------------------------------------------------------------
  // Sync templates when business type changes
  //
  // This only applies during first-time onboarding.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (loadingMetadata || !hasAccess) {
      return;
    }

    const sectorPackage =
      getSectorTemplatePackage(businessType);

    setCategories(sectorPackage.categories);
    setProducts(sectorPackage.products);
  }, [
    businessType,
    loadingMetadata,
    hasAccess,
  ]);

  // ---------------------------------------------------------------------------
  // Normalize category names before sending to orchestrator
  // ---------------------------------------------------------------------------

  const getNormalizedCategoryNames = (): string[] => {
    if (!Array.isArray(categories)) {
      return [];
    }

    return categories
      .map((category) => {
        if (typeof category === "string") {
          return category;
        }

        return (
          category?.name ||
          category?.name_am ||
          ""
        );
      })
      .filter(Boolean);
  };

  const saveOnboardingProgress = async (
    businessId: string,
    currentStep: string,
  ) => {
    const progress = {
      is_completed: true,
      current_step: currentStep,
    };
    const { data, error } = await supabase
      .from("onboarding_progress")
      .update(progress)
      .eq("business_id", businessId)
      .select("id");

    if (error) throw error;
    if (data?.length) return;

    const { error: insertError } = await supabase
      .from("onboarding_progress")
      .insert({ business_id: businessId, ...progress });

    if (insertError) throw insertError;
  };

  const completeOnboarding = async (
    userId: string,
    currentStep: string,
    destination: "success" | "dashboard",
  ) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", userId)
      .select("id,business_id")
      .maybeSingle();

    if (error) throw error;
    if (!profile) {
      throw new Error(isAm
        ? "መገለጫዎን ማዘመን አልተቻለም። የprofiles የማዘመን ፈቃድዎን ያረጋግጡ።"
        : "Your profile could not be updated. Check the profiles update policy.");
    }

    if (profile.business_id) {
      try {
        await saveOnboardingProgress(profile.business_id, currentStep);
      } catch (progressError) {
        console.warn("[ONBOARDING] Progress tracking could not be saved:", progressError);
      }
    }

    if (destination === "success") {
      goToStep(5);
      return;
    }

    startTransition(() => {
      router.refresh();
      router.replace(`/${locale}/dashboard`);
    });
  };

  // ---------------------------------------------------------------------------
  // Skip onboarding
  //
  // Skipping completes onboarding without seeding starter categories/products.
  // ---------------------------------------------------------------------------

  const handleSkipAll = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace(`/${locale}/login`);
        return;
      }

      await completeOnboarding(user.id, "skipped", "dashboard");
    } catch (error) {
      console.error(
        "[ONBOARDING] Failed to skip onboarding:",
        error,
      );

      setErrorMessage(error instanceof Error ? error.message :
        isAm
          ? "ማቀናበሩን ማጠናቀቅ አልተሳካም። እባክዎ ድጋሚ ይሞክሩ።"
          : "Could not complete setup. Please try again.");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Save workspace
  // ---------------------------------------------------------------------------

  const handleSaveWorkspace = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace(`/${locale}/login`);
        return;
      }

      await setupBusiness(supabase, {
        businessType,
        openTime,
        closeTime,
        categories: getNormalizedCategoryNames(),
        products,
      });

      await completeOnboarding(user.id, "completed", "success");
    } catch (error) {
      console.error(
        "[ONBOARDING] Failed saving workspace:",
        error,
      );

      setErrorMessage(error instanceof Error ? error.message :
        isAm
          ? "ማስቀመጥ አልተሳካም። እባክዎ የኢንተርኔት ግንኙነትዎን አረጋግጠው ድጋሚ ይሞክሩ።"
          : "Could not complete setup. Please check your connection and try again.");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Finalize onboarding + optional opening float
  // ---------------------------------------------------------------------------

  const handleFinalizeAndRedirect = async (
    openingFloat?: number,
  ) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace(`/${locale}/login`);
        return;
      }

      try {
        const businessId = await resolveBusinessId(user.id);
        const { data: primaryBranch, error: branchError } = await supabase
          .from("branches")
          .select("id")
          .eq("business_id", businessId)
          .eq("is_main", true)
          .maybeSingle();

        if (branchError) throw branchError;

        if (primaryBranch && openingFloat !== undefined) {
          const { error: shiftError } = await supabase
            .from("shifts")
            .insert({
              business_id: businessId,
              branch_id: primaryBranch.id,
              cashier_id: user.id,
              opened_by: user.id,
              opening_cash: Number(openingFloat || 0),
              shift_label: "Morning",
              status: "open",
            });

          if (shiftError) throw shiftError;
        }
      } catch (shiftError) {
        console.warn("[ONBOARDING] Optional opening shift could not be created:", shiftError);
      }

      await completeOnboarding(user.id, "completed", "dashboard");
    } catch (error) {
      console.error(
        "[ONBOARDING] Finalization failed:",
        error,
      );

      setErrorMessage(error instanceof Error ? error.message :
        isAm
          ? "ማጠናቀቁ አልተሳካም። እባክዎ ድጋሚ ይሞክሩ።"
          : "Could not finish setup. Please try again.");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading / access resolution
  //
  // Important: we intentionally do NOT render the wizard while the access
  // decision is being made. This prevents a non-owner or already-onboarded
  // user from briefly seeing onboarding before redirecting.
  // ---------------------------------------------------------------------------

  if (loadingMetadata || (!hasAccess && !errorMessage)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-cream-100 p-4">
        <div className="flex w-full max-w-sm flex-col items-center space-y-4 rounded-3xl border border-coffee-700/10 bg-white p-8 text-center shadow-elevated">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-berbere-500/10">
              <Loader2 className="h-8 w-8 animate-spin text-berbere-500" />
            </div>

            <Sparkles className="absolute -right-1 -top-1 h-5 w-5 animate-bounce text-gold-400" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-coffee-700">
              {isAm
                ? "ማቀናበሪያው በመጫን ላይ ነው..."
                : "Preparing your workspace..."}
            </h3>

            <p className="text-xs text-coffee-400">
              {isAm
                ? "እባክዎ ትንሽ ይጠብቁ..."
                : "Checking your workspace access"}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!hasAccess && errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-100 p-4">
        <div role="alert" className="w-full max-w-sm space-y-4 rounded-2xl border border-coffee-700/10 bg-white p-6 text-center shadow-elevated">
          <AlertCircle className="mx-auto h-8 w-8 text-berbere-500" />
          <p className="text-sm font-bold text-coffee-700">{errorMessage}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 rounded-lg bg-berbere-500 px-4 text-sm font-bold text-white hover:bg-berbere-600"
          >
            {isAm ? "እንደገና ሞክር" : "Try again"}
          </button>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // First-time owner onboarding
  // ---------------------------------------------------------------------------

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream-100 p-4 md:p-6">
      <div className="w-full max-w-2xl space-y-4">

        {/* -----------------------------------------------------------------
            Interactive top header
        ------------------------------------------------------------------ */}
        <div className="space-y-3 rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-elevated">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-berbere-500 text-xs font-black text-white shadow-sm">
                  {step + 1}
                </div>

                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-coffee-400">
                    {isAm
                      ? "የመጀመሪያ ማቀናበሪያ"
                      : "First-Time Setup"}
                  </span>

                  <h2 className="truncate text-sm font-black leading-tight text-coffee-700">
                    {stepTitles[step]}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSkipAll()}
                disabled={isSaving || isPending}
                aria-busy={isSaving || isPending}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-cream-300 px-3 text-xs font-bold text-coffee-700 hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm"
              >
                {isSaving || isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{step === 5
                  ? isAm ? "ወደ ዳሽቦርድ ሂድ" : "Go to Dashboard"
                  : isAm ? "ማዋቀርን ዝለል / ዳሽቦርድ" : "Skip Setup / Go to Dashboard"}</span>
              </button>
            </div>

            {/* -----------------------------------------------------------------
                Clickable progress tracker
            ------------------------------------------------------------------ */}
            {step < 5 && <div className="grid grid-cols-5 gap-1.5 pt-1">
              {[0, 1, 2, 3, 4].map((index) => {
                const isCurrent = index === step;
                const isPassed = index < step;
                const isClickable =
                  index <= highestVisitedStep;

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={!isClickable || isSaving}
                    onClick={() => goToStep(index)}
                    className={[
                      "relative h-2 rounded-full transition-all duration-300",
                      isCurrent
                        ? "bg-berbere-500 ring-2 ring-berbere-500/20"
                        : isPassed
                          ? "bg-gold-400"
                          : "bg-cream-200 opacity-60",
                      !isClickable
                        ? "cursor-not-allowed"
                        : "cursor-pointer",
                    ].join(" ")}
                    title={stepTitles[index]}
                  >
                    {isPassed && (
                      <Check className="absolute inset-0 m-auto h-2.5 w-2.5 text-white" />
                    )}
                  </button>
                );
              })}
            </div>}
        </div>

        {/* -----------------------------------------------------------------
            Error banner
        ------------------------------------------------------------------ */}
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-berbere-200 bg-berbere-50 p-3.5 text-xs font-bold text-berbere-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-berbere-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* -----------------------------------------------------------------
            Step views
        ------------------------------------------------------------------ */}
        <div className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-elevated">
          {step === 0 && (
            <WelcomeStep
              isAm={isAm}
              businessName={businessName}
              onNext={handleNext}
              onSkip={handleSkipAll}
              isSaving={isSaving}
              categoriesCount={
                Array.isArray(categories)
                  ? categories.length
                  : 0
              }
              productsCount={
                Array.isArray(products)
                  ? products.length
                  : 0
              }
            />
          )}

          {step === 1 && (
            <BusinessHoursStep
              isAm={isAm}
              openTime={openTime}
              setOpenTime={setOpenTime}
              closeTime={closeTime}
              setCloseTime={setCloseTime}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {step === 2 && (
            <CategoriesStep
              isAm={isAm}
              categories={categories}
              setCategories={setCategories}
              onNext={handleNext}
              onBack={handleBack}
              onSkip={handleSkipAll}
              isSaving={isSaving}
            />
          )}

          {step === 3 && (
            <ProductsStep
              isAm={isAm}
              categories={categories}
              products={products}
              setProducts={setProducts}
              onNext={handleNext}
              onBack={handleBack}
              onSkip={handleSkipAll}
              isSaving={isSaving}
            />
          )}

          {step === 4 && (
            <ReviewStep
              isAm={isAm}
              businessName={businessName}
              businessType={businessType}
              openTime={openTime}
              closeTime={closeTime}
              categoriesCount={
                Array.isArray(categories)
                  ? categories.length
                  : 0
              }
              productsCount={
                Array.isArray(products)
                  ? products.length
                  : 0
              }
              isSaving={isSaving || isPending}
              onSave={handleSaveWorkspace}
              onBack={handleBack}
              onSkip={handleSkipAll}
            />
          )}

          {step === 5 && (
            <SuccessStep
              isAm={isAm}
              onFinalize={(openingFloat) =>
                handleFinalizeAndRedirect(openingFloat)
              }
            />
          )}
        </div>
      </div>
    </main>
  );
}
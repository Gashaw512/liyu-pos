'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import createClient from '@/lib/supabase/client'

// Centralized templates module
import { 
  BusinessType, 
  TemplateProduct, 
  TemplateCategory,
  getSectorTemplatePackage 
} from '../../../lib/onboarding/templates'
import { setupBusiness } from '../../../lib/onboarding/orchestrator'

// Component step views
import WelcomeStep from '@/components/onboarding/WelcomeStep'
import BusinessHoursStep from '@/components/onboarding/BusinessHoursStep'
import CategoriesStep from '@/components/onboarding/CategoriesStep'
import ProductsStep from '@/components/onboarding/ProductsStep'
import ReviewStep from '@/components/onboarding/ReviewStep'
import SuccessStep from '@/components/onboarding/SuccessStep'

import { 
  Loader2, 
  Sparkles, 
  Settings2, 
  Check, 
  ArrowLeft, 
  AlertCircle 
} from 'lucide-react'

export default function OnboardingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  
  const locale = (params?.locale as string) || 'am'
  const isAm = locale === 'am'

  // Context & Metadata State
  const [businessType, setBusinessType] = useState<BusinessType>('other')
  const [businessName, setBusinessName] = useState('')
  const [loadingMetadata, setLoadingMetadata] = useState(true)
  const [isOnboarding, setIsOnboarding] = useState(true)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)

  // Wizard Navigation Progress
  const [step, setStep] = useState(0)
  const [highestVisitedStep, setHighestVisitedStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  
  // Fully Editable Form Field State Matrices
  const [openTime, setOpenTime] = useState('06:00')
  const [closeTime, setCloseTime] = useState('23:00')
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [products, setProducts] = useState<TemplateProduct[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Step Indicators metadata
  const stepTitles = [
    isAm ? 'እንኳን ደህና መጡ' : 'Welcome',
    isAm ? 'የሥራ ሰዓት' : 'Business Hours',
    isAm ? 'ምድቦች' : 'Categories',
    isAm ? 'ምርቶች' : 'Products',
    isAm ? 'ግምገማ' : 'Review',
    isAm ? 'ተጠናቋል' : 'Complete'
  ]

  // Track highest reached step to enable clickable back-navigation in header
  const goToStep = (nextStep: number) => {
    setErrorMessage(null)
    setStep(nextStep)
    setHighestVisitedStep((prev) => Math.max(prev, nextStep))
  }

  const handleNext = () => goToStep(Math.min(step + 1, 5))
  const handleBack = () => goToStep(Math.max(step - 1, 0))

  /**
   * Safe Business ID Resolver
   */
  const resolveBusinessId = useCallback(async (userId: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser()
    let bId = user?.user_metadata?.business_id || user?.app_metadata?.business_id
    
    if (!bId || bId === 'undefined') {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', userId)
        .maybeSingle()
      bId = profileRow?.business_id
    }

    if (!bId) {
      throw new Error('Missing active business identification context')
    }
    return bId
  }, [supabase])

  // ── Step 1: Resolve User, Business Meta & Hydro State Context ───────────────
  useEffect(() => {
    async function getSessionContext() {
      try {
        setLoadingMetadata(true)
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          router.push(`/${locale}/login`)
          return
        }

        const { data: profileRow } = await supabase
          .from('profiles')
          .select('business_id, onboarding_completed')
          .eq('id', user.id)
          .maybeSingle()

        const hasCompleted = profileRow?.onboarding_completed === true
        const isExplicitEditMode = searchParams.get('mode') === 'edit'
        
        setAlreadyCompleted(hasCompleted)
        setIsOnboarding(!hasCompleted && !isExplicitEditMode)

        const metadata = user.user_metadata || {}
        setBusinessName(metadata.business_name || (isAm ? 'የእኔ ንግድ' : 'My Business'))
        
        const detectedType = (metadata.business_type as BusinessType) || 'other'
        setBusinessType(detectedType)

        const sectorPackage = getSectorTemplatePackage(detectedType)
        
        if (hasCompleted && profileRow?.business_id) {
          const { data: existingCats } = await supabase
            .from('categories')
            .select('name, name_am, icon, color, sort_order')
            .eq('business_id', profileRow.business_id)

          if (existingCats && existingCats.length > 0) {
            setCategories(existingCats as TemplateCategory[])
          } else {
            setCategories(sectorPackage.categories)
          }

          const { data: existingProds } = await supabase
            .from('products')
            .select('name, name_am, price, category, image_url')
            .eq('business_id', profileRow.business_id)

          if (existingProds && existingProds.length > 0) {
            setProducts(existingProds as TemplateProduct[])
          } else {
            setProducts(sectorPackage.products)
          }
        } else {
          setCategories(sectorPackage.categories)
          setProducts(sectorPackage.products)
        }

      } catch (err) {
        console.error('Failed reading workspace onboarding context:', err)
      } finally {
        setLoadingMetadata(false)
      }
    }

    getSessionContext()
  }, [supabase, router, locale, isAm, searchParams])

  // ── Step 2: Sync Templates Whenever Business Type Mutates (First Time) ─────
  useEffect(() => {
    if (loadingMetadata || alreadyCompleted) return
    const sectorPackage = getSectorTemplatePackage(businessType)
    setCategories(sectorPackage.categories)
    setProducts(sectorPackage.products)
  }, [businessType, loadingMetadata, alreadyCompleted])

  const getNormalizedCategoryNames = (): string[] => {
    if (!Array.isArray(categories)) return []
    return categories
      .map((c: any) => (typeof c === 'string' ? c : c?.name || c?.name_am || ''))
      .filter(Boolean)
  }

  const handleSkipAll = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push(`/${locale}/login`)
        return
      }

      const businessId = await resolveBusinessId(user.id)

      await setupBusiness(supabase, {
        businessType,
        openTime,
        closeTime,
        categories: getNormalizedCategoryNames(),
        products
      })

      await supabase
        .from('onboarding_progress')
        .upsert({ business_id: businessId, is_completed: true, current_step: 'skipped' })

      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)

      startTransition(() => {
        router.refresh()
        router.push(`/${locale}/dashboard`)
      })
    } catch (err: any) {
      console.error('Error auto-provisioning workspace:', err)
      startTransition(() => {
        router.push(`/${locale}/dashboard`)
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveWorkspace = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push(`/${locale}/login`)
        return
      }

      const businessId = await resolveBusinessId(user.id)

      await setupBusiness(supabase, {
        businessType,
        openTime,
        closeTime,
        categories: getNormalizedCategoryNames(),
        products
      })

      await supabase
        .from('onboarding_progress')
        .upsert({ business_id: businessId, is_completed: true, current_step: 'completed' })

      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)

      goToStep(5)
    } catch (err: any) {
      console.error('Error saving workspace configurations:', err)
      setErrorMessage(
        isAm 
          ? 'ማስቀመጥ አልተሳካም። እባክዎ የስልክዎን ኢንተርኔት አረጋግጠው ድጋሚ ይሞክሩ!' 
          : 'Could not complete setup. Please check your connection and try again.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleFinalizeAndRedirect = async (openingFloat?: number) => {
    setIsSaving(true) 
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push(`/${locale}/login`)
        return
      }

      const businessId = await resolveBusinessId(user.id)

      const { data: primaryBranch } = await supabase
        .from('branches')
        .select('id')
        .eq('business_id', businessId)
        .eq('is_main', true)
        .maybeSingle()
      
      const branchId = primaryBranch?.id || null

      if (branchId && openingFloat !== undefined) {
        await supabase.from('shifts').insert({
          business_id: businessId,
          branch_id: branchId,
          cashier_id: user.id,
          opened_by: user.id,
          opening_cash: Number(openingFloat || 0),
          shift_label: 'Morning',
          status: 'open'
        })
      }

      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)

      startTransition(() => {
        router.refresh()
        router.push(`/${locale}/dashboard`)
      })
    } catch (err) {
      console.error('Finalization process error:', err)
      router.push(`/${locale}/dashboard`)
    } finally {
      setIsSaving(false)
    }
  }

  if (loadingMetadata) {
    return (
      <main className="min-h-screen bg-cream-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-elevated border border-coffee-700/10 flex flex-col items-center max-w-sm w-full text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-berbere-500/10 flex items-center justify-center text-berbere-500">
              <Loader2 className="w-8 h-8 animate-spin text-berbere-500" />
            </div>
            <Sparkles className="w-5 h-5 text-wegagen-orange absolute -top-1 -right-1 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-coffee-700">
              {isAm ? 'ማቀናበሪያው በመጫን ላይ ነው...' : 'Loading Workspace...'}
            </h3>
            <p className="text-xs text-coffee-400">
              {isAm ? 'እባክዎ ትንሽ ይጠብቁ...' : 'Syncing store templates & settings'}
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream-100 flex flex-col items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-2xl space-y-4">
        
        {/* Interactive Top Header Bar */}
        {step < 5 && (
          <div className="bg-white p-4 rounded-2xl border border-coffee-700/10 shadow-elevated space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-berbere-500 text-white text-xs font-black shadow-sm">
                  {step + 1}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-coffee-400">
                      {isOnboarding 
                        ? (isAm ? 'የመጀመሪያ ማቀናበሪያ' : 'First-Time Setup') 
                        : (isAm ? 'የንግድ መረጃ ማሻሻያ' : 'Reconfiguring Workspace')}
                    </span>
                    {alreadyCompleted && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 rounded border border-amber-200">
                        <Settings2 className="w-2.5 h-2.5" />
                        {isAm ? 'ማሻሻያ' : 'Edit Mode'}
                      </span>
                    )}
                  </div>
                  <h2 className="text-sm font-black text-coffee-700 leading-tight">
                    {stepTitles[step]}
                  </h2>
                </div>
              </div>

              {/* Express Skip or Back to Dashboard Button */}
              <div className="flex items-center gap-2">
                {alreadyCompleted && step === 0 && (
                  <button
                    type="button"
                    onClick={() => router.push(`/${locale}/dashboard`)}
                    className="text-xs font-bold text-coffee-400 hover:text-coffee-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {isAm ? 'ወደ ዳሽቦርድ' : 'Dashboard'}
                  </button>
                )}

                {isOnboarding && step < 4 && (
                  <button
                    type="button"
                    onClick={handleSkipAll}
                    disabled={isSaving || isPending}
                    className="text-xs font-extrabold text-berbere-500 hover:text-berbere-600 transition-colors underline underline-offset-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isAm ? 'አልፍ እና በኋላ ጨርስ' : 'Skip & set up later'}
                  </button>
                )}
              </div>
            </div>

            {/* Clickable Step Progress Tracker */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {[0, 1, 2, 3, 4].map((i) => {
                const isCurrent = i === step
                const isPassed = i < step
                const isClickable = i <= highestVisitedStep

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!isClickable || isSaving}
                    onClick={() => goToStep(i)}
                    className={`h-2 rounded-full transition-all duration-300 relative group cursor-pointer ${
                      isCurrent
                        ? 'bg-berbere-500 ring-2 ring-berbere-500/20'
                        : isPassed
                        ? 'bg-wegagen-orange'
                        : 'bg-cream-200 opacity-60 cursor-not-allowed'
                    }`}
                    title={stepTitles[i]}
                  >
                    {isPassed && (
                      <Check className="w-2.5 h-2.5 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step Views Container */}
        <div className="bg-white rounded-2xl border border-coffee-700/10 shadow-elevated overflow-hidden">
          {step === 0 && (
            <WelcomeStep 
              isAm={isAm} 
              businessName={businessName} 
              onNext={handleNext} 
              categoriesCount={Array.isArray(categories) ? categories.length : 0}
              productsCount={Array.isArray(products) ? products.length : 0}
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
              onSkip={isOnboarding ? handleSkipAll : undefined}
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
              onSkip={isOnboarding ? handleSkipAll : undefined}
            />
          )}

          {step === 4 && (
            <ReviewStep 
              isAm={isAm}
              businessName={businessName}
              businessType={businessType}
              openTime={openTime}
              closeTime={closeTime}
              categoriesCount={Array.isArray(categories) ? categories.length : 0} 
              productsCount={Array.isArray(products) ? products.length : 0}    
              isSaving={isSaving || isPending}
              onSave={handleSaveWorkspace}
              onBack={handleBack}
              onSkip={isOnboarding ? handleSkipAll : undefined}
            />
          )}

          {step === 5 && (
            <SuccessStep 
              isAm={isAm} 
              onFinalize={(float) => handleFinalizeAndRedirect(float)}
            />
          )}
        </div>
      </div>
    </main>
  )
}
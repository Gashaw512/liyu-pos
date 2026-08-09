// src/app/[locale]/onboarding/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import createClient from '../../../lib/supabase/client'

// Import centralized utilities and metadata configurations
import { BusinessType, TemplateProduct, CATEGORY_TEMPLATES } from '../../../lib/onboarding/categoryTemplates'
import { PRODUCT_TEMPLATES } from '../../../lib/onboarding/productTemplates'
import { setupBusiness } from '../../../lib/onboarding/setupBusiness'

// Import structured step components 
import WelcomeStep from '../../../components/onboarding/WelcomeStep'
import BusinessHoursStep from '../../../components/onboarding/BusinessHoursStep'
import CategoriesStep from '../../../components/onboarding/CategoriesStep'
import ProductsStep from '../../../components/onboarding/ProductsStep'
import ReviewStep from '../../../components/onboarding/ReviewStep'
import SuccessStep from '../../../components/onboarding/SuccessStep'

export default function OnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const locale = params?.locale || 'am'
  const isAm = locale === 'am'

  // Context & Metadata State
  const [businessType, setBusinessType] = useState<BusinessType>('other')
  const [businessName, setBusinessName] = useState('')
  const [loadingMetadata, setLoadingMetadata] = useState(true)

  // Wizard Navigation Progress
  const [step, setStep] = useState(0)
  
  // Fully Editable Form Field State Matrices
  const [openTime, setOpenTime] = useState('06:00')
  const [closeTime, setCloseTime] = useState('23:00')
  const [categories, setCategories] = useState<string[]>([])
  
  // Products carry explicit structures to seamlessly support Bono pricing options later
  const [products, setProducts] = useState<TemplateProduct[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // ── Step 1: Resolve User & Business Meta Context ───────────────────
  useEffect(() => {
    async function getSessionContext() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          router.push(`/${locale}/login`)
          return
        }

        const metadata = user.user_metadata
        if (metadata) {
          setBusinessName(metadata.business_name || (isAm ? 'የእኔ ንግድ' : 'My Business'))
          if (metadata.business_type) {
            setBusinessType(metadata.business_type as BusinessType)
          }
        }
      } catch (err) {
        console.error('Failed reading user metadata context:', err)
      } finally {
        setLoadingMetadata(false)
      }
    }
    getSessionContext()
  }, [supabase, router, locale, isAm])


  useEffect(() => {
    if (loadingMetadata) return
    

    const selectedTemplates = CATEGORY_TEMPLATES[businessType] || CATEGORY_TEMPLATES['other']
    setCategories(isAm ? selectedTemplates.am : selectedTemplates.en)
    

    const selectedProducts = PRODUCT_TEMPLATES[businessType] || PRODUCT_TEMPLATES['other']
    setProducts(selectedProducts)
  }, [businessType, isAm, loadingMetadata])


  const handleNext = () => setStep((prev) => prev + 1)
  const handleBack = () => setStep((prev) => prev - 1)

  const handleSkipAll = async () => {
    setIsSaving(true)
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push(`/${locale}/login`)
        return
      }

      let businessId = user.user_metadata?.business_id || user.app_metadata?.business_id
      if (!businessId) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('id', user.id)
          .single()
        businessId = profileRow?.business_id
      }

      if (!businessId) throw new Error('Missing active business identification context')

      // 1. Commit baseline template data matrix so DB isn't empty
      await setupBusiness(supabase, {
        businessType,
        openTime,
        closeTime,
        categories,
        products
      })

      // 2. Mark tracker metrics as complete
      await supabase
        .from('onboarding_progress')
        .update({ is_completed: true, current_step: 'skipped' })
        .eq('business_id', businessId)

      // 3. Flip profile lock toggle
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)

      router.refresh()
      router.push(`/${locale}/dashboard`)
    } catch (err) {
      console.error('Error auto-provisioning skipped workspace:', err)
      // Soft fallback redirect if network updates fail partially
      router.push(`/${locale}/dashboard`)
    } finally {
      setIsSaving(false)
    }
  }

  // Intermediate Save: Commits custom parameters to DB tables
 // 2. Simplify your handleSaveWorkspace function to handle everything and redirect:
const handleSaveWorkspace = async () => {
  setIsSaving(true)
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      router.push(`/${locale}/login`)
      return
    }

    let businessId = user.user_metadata?.business_id || user.app_metadata?.business_id
    if (!businessId) {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single()
      businessId = profileRow?.business_id
    }

    if (!businessId) throw new Error('Missing active business identification context')

    // A. Save the business configurations (Hours, Categories, Products)
    await setupBusiness(supabase, {
      businessType,
      openTime,
      closeTime,
      categories,
      products
    })

    // B. Mark onboarding progress tracker table as complete
    await supabase
      .from('onboarding_progress')
      .update({ is_completed: true, current_step: 'completed' })
      .eq('business_id', businessId)

    // C. Flip layout access lock on user profile record to true
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id)

    // D. Refresh and push straight to dashboard
    router.refresh()
    router.push(`/${locale}/dashboard`)

  } catch (err) {
    console.error('Error saving configurations:', err)
    alert(isAm 
      ? 'ማስቀመጥ አልተሳካም። እባክዎ የስልክዎን ኢንተርኔት አረጋግጠው ድጋሚ ይሞክሩ!' 
      : 'Could not complete setup. Please check your connection and try again.'
    )
  } finally {
    setIsSaving(false)
  }
}

  // Final Action: Commits opening shifts, updates progress tracking metrics, and unlocks POS application
  const handleFinalizeAndRedirect = async (openingFloat: number) => {
    setIsSaving(true) 
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push(`/${locale}/login`)
        return
      }

      let businessId = user.user_metadata?.business_id || user.app_metadata?.business_id
      let branchId = null

      if (!businessId) {
        const { data: profileRow, error: profileError } = await supabase
          .from('profiles')
          .select('business_id, branch_id')
          .eq('id', user.id)
          .single()
          
        if (profileError || !profileRow) throw new Error('Profile layout record missing')
        businessId = profileRow.business_id
        branchId = profileRow.branch_id
      }

      if (!businessId) throw new Error('Missing active business identification context')

      if (!branchId) {
        const { data: primaryBranch } = await supabase
          .from('branches')
          .select('id')
          .eq('business_id', businessId)
          .eq('is_main', true)
          .single()
        branchId = primaryBranch?.id || null
      }

      if (!branchId) throw new Error('No functional branch found to bind register shift assignment')

      // A. Create the active open register shift row
      const { error: shiftError } = await supabase.from('shifts').insert({
        business_id: businessId,
        branch_id: branchId,
        cashier_id: user.id,
        opened_by: user.id,
        opening_cash: openingFloat,
        shift_label: 'Morning',
        status: 'open'
      })
      if (shiftError) throw shiftError

      // B. Flag onboarding process tracker table as true
      const { error: progressError } = await supabase
        .from('onboarding_progress')
        .update({ is_completed: true, current_step: 'completed' })
        .eq('business_id', businessId)
      if (progressError) throw progressError

      // C. Flip layout access lock on user profile record to true
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)
      if (profileUpdateError) throw profileUpdateError

      router.refresh()
      router.push(`/${locale}/dashboard`)

    } catch (err) {
      console.error('Critical workspace initialization error caught safely:', err)
      alert(isAm 
        ? 'ማስቀመጥ አልተሳካም። እባክዎ የስልክዎን ኢንተርኔት አረጋግጠው ድጋሚ ይሞክሩ!' 
        : 'Could not complete setup. Please verify your mobile internet connection and try again.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (loadingMetadata) {
    return (
      <div className="min-h-screen bg-[#F7F4EB] flex items-center justify-center">
        <div className="w-9 h-9 border-4 border-[#8B2635]/20 border-t-[#8B2635] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F4EB] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white p-6 rounded-2xl border border-[#2B1E1A]/10 shadow-xl">
        
        {/* Render Step Sub-Components, Passing Down Core Form State Data Matrices */}
        {step === 0 && (
          <WelcomeStep 
            isAm={isAm}
            businessName={businessName}
            categoriesCount={categories.length}
            productsCount={products.length}
            onNext={handleNext}
            onSkip={handleSkipAll}
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
            onSkip={handleSkipAll}
          />
        )}

        {step === 2 && (
          <CategoriesStep 
            isAm={isAm}
            categories={categories} // Removed 'businessType' prop here to resolve the TypeScript error explicitly
            setCategories={setCategories}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkipAll}
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
          />
        )}

        {step === 4 && (
          <ReviewStep 
            isAm={isAm}
            businessName={businessName}
            businessType={businessType}
            openTime={openTime}
            closeTime={closeTime}
            categoriesCount={categories.length}
            productsCount={products.length}
            isSaving={isSaving}
            onSave={handleSaveWorkspace}
            onBack={handleBack}
            onSkip={handleSkipAll}
          />
        )}

        {step === 5 && (
          <SuccessStep 
            isAm={isAm}
            onFinalize={handleFinalizeAndRedirect}
          />
        )}

        {/* Modular Progress Indicator Segment Dots Bar */}
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div 
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                step === idx ? 'w-7 bg-[#8B2635]' : 'w-2 bg-[#2B1E1A]/10'
              }`}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
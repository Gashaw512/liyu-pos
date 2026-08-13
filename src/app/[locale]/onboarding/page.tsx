'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import createClient from '@/lib/supabase/client'

// Centralized templates module
import { 
  BusinessType, 
  TemplateProduct, 
  TemplateCategory, // 🌟 Imported unified Category template type contract
  getSectorTemplatePackage 
} from '../../../lib/onboarding/templates'
import { setupBusiness } from '../../../lib/onboarding/orchestrator'

// Explicit design token path links
import WelcomeStep from '@/components/onboarding/WelcomeStep'
import BusinessHoursStep from '@/components/onboarding/BusinessHoursStep'
import CategoriesStep from '@/components/onboarding/CategoriesStep'
import ProductsStep from '@/components/onboarding/ProductsStep'
import ReviewStep from '@/components/onboarding/ReviewStep'
import SuccessStep from '@/components/onboarding/SuccessStep'

export default function OnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const locale = (params?.locale as string) || 'am'
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
  // 🌟 Upgraded state array type from string[] to TemplateCategory[]
  const [categories, setCategories] = useState<TemplateCategory[]>([])
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

  // ── Step 2: Sync Templates Whenever Business Type Mutates ───────────
  useEffect(() => {
    if (loadingMetadata) return
    
    // 🌟 Leverages single raw package payload object to fill state arrays
    const sectorPackage = getSectorTemplatePackage(businessType)
    
    setCategories(sectorPackage.categories)
    setProducts(sectorPackage.products)
  }, [businessType, loadingMetadata])

  const handleNext = () => setStep((prev) => prev + 1)
  const handleBack = () => setStep((prev) => prev - 1)

  // Fast Auto-Provisioning Skip Trigger
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

      // Commit baseline template definitions
      await setupBusiness(supabase, {
        businessType,
        openTime,
        closeTime,
        // 🌟 Maps full metadata object parameters inside layout builder matching your orchestrator specifications
        categories: categories.map(c => c.name),
        products
      })

      await supabase
        .from('onboarding_progress')
        .update({ is_completed: true, current_step: 'skipped' })
        .eq('business_id', businessId)

      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)

      router.refresh()
      router.push(`/${locale}/dashboard`)
    } catch (err) {
      console.error('Error auto-provisioning skipped workspace:', err)
      router.push(`/${locale}/dashboard`)
    } finally {
      setIsSaving(false)
    }
  }

  // Intermediate Custom Save Event Execution 
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

      await setupBusiness(supabase, {
        businessType,
        openTime,
        closeTime,
        categories: categories.map(c => c.name), // 🌟 Handled mapping out string values dynamically
        products
      })

      await supabase
        .from('onboarding_progress')
        .update({ is_completed: true, current_step: 'completed' })
        .eq('business_id', businessId)

      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)

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

  /**
   * 🎰 Step 3: Production-Hardened Shift Provisioning Utility
   * Matches your exact structural database schema layout parameters perfectly.
   */
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

      // A. Seed business starter packages
      await setupBusiness(supabase, {
        businessType,
        openTime,
        closeTime,
        categories: categories.map(c => c.name), // 🌟 Handled mapping safely to plain string values
        products
      })

      // B. Create the active open register shift row with your exact schema keys
      const { error: shiftError } = await supabase.from('shifts').insert({
        business_id: businessId,
        branch_id: branchId,
        cashier_id: user.id,
        opened_by: user.id,
        opening_cash: Number(openingFloat || 0),
        shift_label: 'Morning',
        status: 'open'
      })

      if (shiftError) throw shiftError

      // C. Update onboarding steps completion track
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)

      router.refresh()
      router.push(`/${locale}/dashboard`)
    } catch (err) {
      console.error('Finalization process threw unhandled error:', err)
    } finally {
      setIsSaving(false)
    }
  }

    // ── Step 4: Step Switching Wizard UI Tree Layout ───────────────────
    // ── Step 4: Step Switching Wizard UI Tree Layout ───────────────────
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {step === 0 && (
          <WelcomeStep 
            isAm={isAm} 
            businessName={businessName} 
            onNext={handleNext} 
            // 🌟 Added missing summary fields your Welcome component relies on
            categoriesCount={categories.length}
            productsCount={products.length}
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
            onFinalize={() => router.push(`/${locale}/dashboard`)}
          />
        )}
      </div>
    </main>
  )

}

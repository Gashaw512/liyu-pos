'use client'

import React, { useMemo } from 'react'
import { ClipboardCheck, Loader2, ArrowLeft, ArrowRight } from 'lucide-react'

interface ReviewStepProps {
  isAm: boolean
  businessName: string
  businessType: string
  openTime: string
  closeTime: string
  categoriesCount: number
  productsCount: number
  isSaving: boolean
  onSave: () => void
  onBack: () => void
  onSkip?: () => void
}

export default function ReviewStep({
  isAm,
  businessName,
  businessType,
  openTime,
  closeTime,
  categoriesCount,
  productsCount,
  isSaving,
  onSave,
  onBack,
  onSkip,
}: ReviewStepProps) {
  // Smart localization dictionary
  const labels = useMemo(() => ({
    title: isAm ? 'መረጃዎን ያረጋግጡ' : 'Confirm Your Setup',
    subtitle: isAm 
      ? 'ሁሉም ነገር ትክክል መሆኑን ካረጋገጡ በኋላ "ጨርስ" የሚለውን ይጫኑ' 
      : 'Verify everything looks correct before launching your workspace',
    bizName: isAm ? 'የንግድ ስም' : 'Business Name',
    sector: isAm ? 'የስራ ዘርፍ' : 'Sector',
    hours: isAm ? 'የስራ ሰዓት' : 'Operating Hours',
    categories: isAm ? 'የምርት ምድቦች' : 'Product Categories',
    products: isAm ? 'የምርቶች ብዛት' : 'Total Products',
    autoCategorized: isAm ? '*በምድብ የተከፋፈሉ' : '*Auto-categorized',
    unspecified: isAm ? 'አልተጠቀሰም' : 'Not specified',
    fixSetup: isAm ? 'ማስተካከያ' : 'Fix Setup',
    finish: isAm ? 'አዋቅርና ጨርስ' : 'Finish & Open',
    saving: isAm ? 'ኢንቬንቶሪውን እያዘጋጀን ነው...' : 'Structuring Inventory Items...',
    skip: isAm ? 'ይህንን ደረጃ እለፍና በቀጥታ ወደ ዳሽቦርድ ሂድ' : 'Skip setup and go directly to dashboard',
  }), [isAm])

  // Formatted operational time display
  const formattedHours = useMemo(() => {
    if (!openTime || !closeTime) return '-'
    return `${openTime} - ${closeTime}`
  }, [openTime, closeTime])

  // Formatted sector title
  const formattedSector = useMemo(() => {
    if (!businessType) return '-'
    return businessType.replace(/_/g, ' ')
  }, [businessType])

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-elevated border border-coffee-700/10 p-6 md:p-8 space-y-6 animate-fadeIn">
      
      {/* Header Section */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-berbere-500/10 flex items-center justify-center mx-auto text-berbere-500 ring-4 ring-berbere-50">
          <ClipboardCheck className="w-7 h-7 stroke-[2]" />
        </div>
        <h2 className="text-2xl font-bold text-coffee-700 font-sans tracking-tight">
          {labels.title}
        </h2>
        <p className="text-sm text-coffee-400 max-w-sm mx-auto leading-relaxed">
          {labels.subtitle}
        </p>
      </div>

      {/* Structured Summary Card (Using Cream Tokens) */}
      <div className="bg-cream-100 rounded-2xl border border-coffee-700/5 p-5 space-y-3.5">
        
        {/* Business Name */}
        <div className="flex justify-between items-center text-sm border-b border-coffee-700/5 pb-2.5">
          <span className="text-coffee-400 font-medium">{labels.bizName}</span>
          <span className="font-bold text-coffee-700 truncate max-w-[220px] text-right">
            {businessName.trim() || labels.unspecified}
          </span>
        </div>

        {/* Sector */}
        <div className="flex justify-between items-center text-sm border-b border-coffee-700/5 pb-2.5">
          <span className="text-coffee-400 font-medium">{labels.sector}</span>
          <span className="font-bold text-coffee-700 capitalize">
            {formattedSector}
          </span>
        </div>

        {/* Hours */}
        <div className="flex justify-between items-center text-sm border-b border-coffee-700/5 pb-2.5">
          <span className="text-coffee-400 font-medium">{labels.hours}</span>
          <span className="font-bold text-coffee-700">
            {formattedHours}
          </span>
        </div>

        {/* Categories Count */}
        <div className="flex justify-between items-center text-sm border-b border-coffee-700/5 pb-2.5">
          <span className="text-coffee-400 font-medium">{labels.categories}</span>
          <span className="font-bold text-berbere-500 text-base">
            {categoriesCount}
          </span>
        </div>

        {/* Total Products */}
        <div className="flex justify-between items-center text-sm">
          <div className="flex flex-col items-start">
            <span className="text-coffee-400 font-medium">{labels.products}</span>
            <span className="text-xs text-success font-semibold">
              {labels.autoCategorized}
            </span>
          </div>
          <span className="font-bold text-berbere-500 text-base">
            {productsCount}
          </span>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex gap-3">
          {!isSaving && (
            <button 
              type="button"
              onClick={onBack}
              className="w-1/3 py-3.5 px-4 font-bold text-sm rounded-xl text-coffee-700 bg-cream-200 hover:bg-cream-300 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-coffee-400" />
              <span>{labels.fixSetup}</span>
            </button>
          )}

          <button 
            type="button"
            onClick={onSave}
            disabled={isSaving}
            aria-busy={isSaving}
            className={`${
              isSaving 
                ? 'w-full bg-berbere-500/80' 
                : 'w-2/3 bg-berbere-500 hover:bg-berbere-600 active:scale-[0.98]'
            } py-3.5 px-4 text-white font-bold text-sm rounded-xl shadow-card transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-cream-100" />
                <span aria-live="polite">{labels.saving}</span>
              </>
            ) : (
              <>
                <span>{labels.finish}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Optional Skip Action */}
        {onSkip && !isSaving && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-center text-coffee-400 hover:text-coffee-700 font-bold underline underline-offset-4 pt-1 cursor-pointer transition-colors"
          >
            {labels.skip}
          </button>
        )}
      </div>

    </div>
  )
}
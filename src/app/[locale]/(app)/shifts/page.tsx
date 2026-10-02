// src/app/%5Blocale%5D/%28app%29/shifts/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { getDB } from '../../../../lib/offline/db'
import { useParams, useRouter } from 'next/navigation'

export default function ShiftsPage() {
  const params = useParams()
  const router = useRouter()
  const isAm = params.locale === 'am'
  
  const [activeShift, setActiveShift] = useState<any>(null)
  const [closingCash, setClosingCash] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkShiftState() {
      const db = await getDB()
      const current = await db.get('active_shift', 'current')
      setActiveShift(current)
      setLoading(false)
    }
    checkShiftState()
  }, [])

  const handleCloseShift = async () => {
    if (!closingCash) return
    
    try {
      const db = await getDB()

      const reportId =
        activeShift.report_id ||
        activeShift.real_database_id ||
        (activeShift.id !== 'current' ? activeShift.id : null)

      if (!reportId || !activeShift.business_id || !activeShift.branch_id || !activeShift.cashier_id) {
        throw new Error('The active shift is missing its synchronization context.')
      }

      await db.put('pending_shift_closures', {
        reportId,
        businessId: activeShift.business_id,
        branchId: activeShift.branch_id,
        cashierId: activeShift.cashier_id,
        openedAt: activeShift.opened_at,
        closedAt: new Date().toISOString(),
        openingCash: Number(activeShift.opening_cash) || 0,
        actualCash: Number(closingCash),
        attempts: 0,
      })

      // Wipe current tracking slot
      await db.delete('active_shift', 'current')

      if (navigator.onLine) {
        const { syncEngine } = await import('@/lib/offline/syncEngine')
        void syncEngine.syncAll()
      }
      
      alert(navigator.onLine
        ? isAm
          ? 'ፈረቃው ተዘግቷል! የሪፖርት መልዕክት ለባለቤቱ በቴሌግራም ይላካል::'
          : 'Shift locked down! Analytical metrics pushed straight to owner.'
        : isAm
          ? 'ፈረቃው ተዘግቷል። ሪፖርቱ ኢንተርኔት ሲመለስ ይላካል።'
          : 'Shift closed. The report is queued and will sync when online.')
      router.refresh()
      window.location.reload()
    } catch (err) {
      alert('Shift state preservation error.')
    }
  }

  if (loading) return <div className="p-4 text-center font-bold">...</div>

  return (
    <div className="space-y-4">
      {activeShift ? (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <span className="text-xs text-rose-500 font-bold uppercase tracking-wider block">⚠️ Active Operational Drawer</span>
            <h2 className="text-xl font-black text-slate-800 mt-0.5">Morning Cashier Shift</h2>
          </div>

          <div className="text-sm space-y-1 text-slate-600 font-medium">
            <div>💵 {isAm ? 'የመጀመሪያ መነሻ ገንዘብ:' : 'Opening Drawer Float:'} <span className="font-mono font-bold text-slate-900">{activeShift.opening_cash} ETB</span></div>
            <div>⏰ {isAm ? 'የተጀመረበት ሰዓት:' : 'Initialization Bound:'} <span className="font-mono font-bold text-slate-900">{new Date().toLocaleTimeString()}</span></div>
          </div>

          <div className="pt-2 space-y-2">
            <label className="text-xs font-black text-slate-400 block uppercase tracking-wide">
              {isAm ? 'ያለው ጥሬ ገንዘብ በብር (Physical Drawer Cash)' : 'Physical Cash Remaining In Drawer'}
            </label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              className="w-full h-12 border-2 border-slate-200 rounded-xl px-3 font-mono font-bold text-lg focus:border-slate-900 focus:outline-none"
            />
          </div>

          <button
            onClick={handleCloseShift}
            disabled={!closingCash}
            className="w-full h-14 bg-rose-600 disabled:bg-slate-200 text-white rounded-xl font-black text-base active:scale-95 transition-transform mt-2 shadow-sm"
          >
            🔒 {isAm ? 'ፈረቃውን ዝጋ (Close Shift)' : 'Execute Shift Lock & Close'}
          </button>
        </div>
      ) : (
        <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 space-y-3">
          <span className="text-4xl">💤</span>
          <h3 className="font-black text-slate-700 text-lg">{isAm ? 'ምንም ክፍት ፈረቃ የለም' : 'Register Drawer Closed'}</h3>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            {isAm ? 'ሽያጭ ለመጀመር እባክዎ አስቀድመው ፈረቃ ይክፈቱ::' : 'Please complete setup flow to open structural shifts drawer assignments.'}
          </p>
        </div>
      )}
    </div>
  )
}

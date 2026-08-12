// src/app/[locale]/(app)/management/db-admin/page.tsx
'use client'

import React, { useState, useTransition } from "react" // 🟢 Ensure React is imported
import { Shield, Database, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"

// 🟢 Update props definition to expect a Promise for params
interface PageProps {
  params: Promise<{ locale: string }>
}

export default function DbAdminPage({ params }: PageProps) {
  // 🟢 Unwrap the asynchronous params promise using React.use()
  const unwrappedParams = React.use(params) 
  const isAm = unwrappedParams.locale === "am"

  const [isPending, startTransition] = useTransition()
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const appendLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  // Server Action inline executor to prevent service_role key leak
  const runDbMaintenance = async (actionType: 'reconcile_categories' | 'wipe_demo_data') => {
    startTransition(async () => {
      setStatus('idle')
      setLogs([])
      appendLog(`Starting operational task: ${actionType}...`)

      try {
        // Trigger server-side execution via a safe API route or server action proxy
        const response = await fetch('/api/admin/db-maintenance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: actionType }),
        })

        const result = await response.json()

        if (!response.ok) throw new Error(result.message || 'Server execution fault')

        result.logs?.forEach((l: string) => appendLog(l))
        setStatus('success')
        appendLog("Task execution finished successfully.")
      } catch (err: any) {
        setStatus('error')
        appendLog(`CRITICAL ERROR: ${err.message}`)
      }
    })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 font-['DM_Sans',sans-serif]">
      {/* Header section */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 shadow-sm">
        <Shield className="h-6 w-6 text-amber-600 shrink-0" />
        <div>
          <h1 className="font-black text-lg">{isAm ? "የዳታቤዝ መቆጣጠሪያ ፓናል" : "Database System Administration"}</h1>
          <p className="text-xs text-amber-700/80">
            {isAm ? "የቀጥታ ስርጭት (Remote Dashboard) ጥገና ስራዎች ብቻ።" : "High-privilege cloud backend utility. Actions run with service-role permissions."}
          </p>
        </div>
      </div>

      {/* Control Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Action 1 */}
        <div className="bg-white border border-cream-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-berbere-600 animate-spin-slow" />
            <h3 className="font-black text-sm text-coffee-950">{isAm ? "ካቴጎሪዎችን እና ምርቶችን አስተካክል" : "Reconcile Category Indices"}</h3>
          </div>
          <p className="text-xs text-coffee-500 leading-relaxed">
            {isAm ? "በተደጋጋሚ onboarding ምክንያት የመጡ የውሂብ መደራረቦችን ያጸዳል እንዲሁም ደህንነቱ በተጠበቀ ሁኔታ ካቴጎሪዎችን ያዋህዳል።" : "Scans and maps existing product data structural models to category IDs, absorbing unique index constraint blocks safely."}
          </p>
          <button
            disabled={isPending}
            onClick={() => runDbMaintenance('reconcile_categories')}
            className="w-full bg-coffee-950 text-white rounded-xl py-2.5 text-xs font-bold transition-all hover:bg-coffee-900 disabled:opacity-50 min-h-[44px]"
          >
            {isPending ? (isAm ? "በማቀነባበር ላይ..." : "Processing...") : (isAm ? "አሁን አስተካክል" : "Execute Reconciliation")}
          </button>
        </div>

        {/* Action 2 */}
        <div className="bg-white border border-cream-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-red-600" />
            <h3 className="font-black text-sm text-red-950">{isAm ? "የሙከራ ዳታዎችን አጽዳ" : "Wipe Workspace Demo Tables"}</h3>
          </div>
          <p className="text-xs text-coffee-500 leading-relaxed">
            {isAm ? "ለሙከራ የገቡ ካቴጎሪዎችን፣ ምርቶችን እና የመጋዘን ክምችቶችን ሙሉ በሙሉ ያጠፋል።" : "Completely flushes out all categories, products, and inventory matrices for this business tenant context to simulate a clean signup pass."}
          </p>
          <button
            disabled={isPending}
            onClick={() => {
              if (confirm(isAm ? "እርግጠኛ ነዎት ሁሉንም መረጃዎች ማጥፋት ይፈልጋሉ?" : "Are you sure you want to flush all product records? This operation cannot be reversed.")) {
                runDbMaintenance('wipe_demo_data')
              }
            }}
            className="w-full bg-red-600 text-white rounded-xl py-2.5 text-xs font-bold transition-all hover:bg-red-700 disabled:opacity-50 min-h-[44px]"
          >
            {isPending ? (isAm ? "በማጥፋት ላይ..." : "Flushing...") : (isAm ? "ሁሉንም ዳታ አጽዳ" : "Wipe Clean Slate")}
          </button>
        </div>
      </div>

      {/* Output Console Logs */}
      <div className="bg-coffee-950 rounded-2xl p-4 border border-coffee-900 shadow-inner space-y-2">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-[10px] font-bold text-white/50 tracking-widest uppercase">System Execution Console Output</span>
          {status === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          {status === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
        </div>
        <div className="font-mono text-xs text-emerald-400 space-y-1 max-h-60 overflow-y-auto selection:bg-emerald-800">
          {logs.length === 0 ? (
            <p className="text-white/30 italic">{isAm ? "የስራ ውጤቶች እዚህ ይታያሉ..." : "Console idle. Awaiting instruction telemetry execution..."}</p>
          ) : (
            logs.map((log, idx) => <p key={idx}>{log}</p>)
          )}
        </div>
      </div>
    </div>
  )
}

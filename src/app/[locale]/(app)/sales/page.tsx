'use client'

import { useState, useEffect } from 'react'
import { getDB } from '../../../../lib/offline/db'
import PaymentSelector from '../../../../components/pos/PaymentSelector'
import { useParams, useRouter } from 'next/navigation'
import { Coins, ArrowRight, Loader2, Plus, Minus, Receipt, LogOut, Coffee, Save } from 'lucide-react'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface DynamicTable {
  id: string
  name: string
  has_open_tab?: boolean
}

export default function POSPage() {
  const params = useParams()
  const router = useRouter()
  const isAm = params.locale === 'am'

  // Application UI Screens states
  const [products, setProducts] = useState<any[]>([])
  const [tables, setTables] = useState<DynamicTable[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [loading, setLoading] = useState(true)

  // Waiter Order management states
  const [selectedTable, setSelectedTable] = useState<DynamicTable | null>(null)
  const [savingTab, setSavingTab] = useState(false)

  // Shift control status values
  const [activeShift, setActiveShift] = useState<any>(null)
  const [cashFloat, setCashFloat] = useState<string>('1000')
  const [openingShift, setOpeningShift] = useState(false)
  const [closingShift, setClosingShift] = useState(false)

  // --- MANUAL WAITER TIP ENTRY STATE ---
  const [manualTip, setManualTip] = useState<string>('')

  // Load backend configurations from the offline database
  async function loadPOSData() {
    try {
      const db = await getDB()
      
      const currentShift = await db.get('active_shift', 'current')
      setActiveShift(currentShift || null)

      const items = await db.getAll('products')
      setProducts(items || [])

      const openTabsList = db.objectStoreNames.contains('open_tabs') 
        ? await db.getAll('open_tabs') 
        : []

      if (db.objectStoreNames.contains('tables')) {
        const structuralTables = await db.getAll('tables')

        if (structuralTables && structuralTables.length > 0) {
          const mappedTables: DynamicTable[] = structuralTables.map((t: any) => ({
            id: String(t.id || t.table_number),
            name: t.name || t.table_number || `Table ${t.id}`,
            has_open_tab: openTabsList.some((tab: any) => String(tab.id) === String(t.id || t.table_number))
          }))
          setTables(mappedTables)
        } else {
          const localDefaults = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6', 'VIP Box']
          setTables(localDefaults.map((name, index) => ({
            id: `fallback_${index}`,
            name: name,
            has_open_tab: openTabsList.some((tab: any) => tab.table_number === name || tab.id === `fallback_${index}`)
          })))
        }
      } else {
        const localDefaults = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6', 'VIP Box1']
        setTables(localDefaults.map((name, index) => ({
          id: `fallback_${index}`,
          name: name,
          has_open_tab: openTabsList.some((tab: any) => tab.table_number === name)
        })))
      }
    } catch (err) {
      console.error('Failed to parse runtime local backend layout stores:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPOSData()
  }, [])

  // Auto load active items whenever a table button is pressed
  useEffect(() => {
    async function syncActiveTableTab() {
      if (!selectedTable) {
        setCart([])
        return
      }
      try {
        const db = await getDB()
        if (db.objectStoreNames.contains('open_tabs')) {
          const existingTab = await db.get('open_tabs', selectedTable.id)
          if (existingTab && existingTab.items) {
            setCart(existingTab.items)
          } else {
            setCart([]) 
          }
        }
      } catch (err) {
        console.error('Error fetching open table configuration record:', err)
      }
    }
    syncActiveTableTab()
  }, [selectedTable])

  const handleOpenShift = async () => {
    setOpeningShift(true)
    try {
      const db = await getDB()
      const floatNum = parseFloat(cashFloat) || 0
      const functionalShiftId = `shift_${crypto.randomUUID().substring(0, 8)}`

      const newShift = {
        id: 'current',
        real_database_id: functionalShiftId,
        branch_id: 'branch_main',
        cashier_id: 'cashier_default',
        business_id: 'biz_active',
        opening_cash: floatNum,
        opening_float: floatNum,
        opened_at: new Date().toISOString(),
        opened_by: 'cashier_default',
        closed_by: null,
        shift_label: `Shift-${new Date().toLocaleDateString()}`,
        closed_at: null,
        closing_float: null,
        actual_cash: null,
        difference: null,
        status: 'open',
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      try {
        await db.put('active_shift', newShift as any, 'current')
      } catch (keyError) {
        await db.put('active_shift', newShift as any)
      }

      setActiveShift(newShift)
    } catch (err) {
      console.error('Shift storage initialization failed:', err)
      alert(isAm ? 'ፈረቃ መክፈት አልተሳካም' : 'Failed to initialize register shift')
    } finally {
      setOpeningShift(false)
    }
  }

  const handleCloseShift = async () => {
    const confirmation = window.confirm(
      isAm ? 'የአሁኑን የስራ ፈረቃ መዝጋት ይፈልጋሉ?' : 'Are you sure you want to close this active shift?'
    )
    if (!confirmation) return

    setClosingShift(true)
    try {
      const db = await getDB()
      await db.delete('active_shift', 'current')
      setActiveShift(null)
      setCart([])
      setSelectedTable(null)
      setShowPayment(false)
      setManualTip('')

      alert(isAm ? 'ፈረቃው በተሳካ ሁኔታ ተዘግቷል!' : 'Shift closed successfully!')
    } catch (err) {
      console.error('Failed to terminate system active shift context:', err)
      alert(isAm ? 'ፈረቃ መዝጋት አልተሳካም' : 'Failed to close shift')
    } finally {
      setClosingShift(false)
    }
  }

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { id: product.id, name: product.name, price: product.retail_price || 0, quantity: 1 }]
    })
  }

  const updateQuantity = (id: string, amount: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + amount } : item))
        .filter((item) => item.quantity > 0)
    )
  }

  const quickIncrement = (id: string, count: number) => {
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity + count } : item))
    )
  }

  const totalBill = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleSaveTab = async () => {
    if (!selectedTable) return
    setSavingTab(true)
    try {
      const db = await getDB()
      const tabPayload = {
        id: selectedTable.id,
        table_number: selectedTable.name, 
        updated_at: new Date().toISOString(),
        items: cart,
        total_accumulated: totalBill
      }
      await db.put('open_tabs', tabPayload)
      
      await loadPOSData()
      setCart([])
      setSelectedTable(null)
      alert(isAm ? 'ትዕዛዙ በጠረጴዛው ላይ ተቀምጧል!' : 'Rounds saved to table successfully!')
    } catch (err) {
      console.error('Failed to preserve open session tab:', err)
      alert('Error updating open table session.')
    } finally {
      setSavingTab(false)
    }
  }

  // ─── LOGICAL FINALIZE SALE WITH MANUAL TIP ───
  const handleFinalizeSale = async (splitPayments: { cash: number; telebirr: number; bank_transfer?: number; selected_bank?: string }) => {
    try {
      const db = await getDB()
      const localId = crypto.randomUUID()
      
      // Parse the manual tip value typed into our state input by the waiter
      const parsedTip = parseFloat(manualTip) || 0

      const pendingPayload = {
        localId,
        createdAt: new Date().toISOString(),
        retryCount: 0,
        syncStatus: 'pending' as const,
        offline_id: localId,
        receipt_number: `REC-${Date.now().toString().substring(6)}`,
        shift_id: activeShift?.real_database_id || null,
        branch_id: activeShift?.branch_id || 'branch_main',
        cashier_id: activeShift?.cashier_id || 'cashier_default',
        business_id: activeShift?.business_id || 'biz_active',
        table_number: selectedTable ? selectedTable.name : 'Walk-in',
        
        // --- CLEAN AUDITING ENTRIES ---
        total_amount: totalBill + parsedTip, // Grand total sent by customer (Food + Tip combined)
        subtotal: totalBill,                 // Taxable restaurant revenue (Pure total bill)
        tip_amount: parsedTip,               // Tracked manually for owner to return to waiter at night
        
        discount_amount: 0,
        tax_amount: 0,
        status: 'completed' as const,
        payment_status: 'paid' as const,
        items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          cost_price: item.price * 0.7,
          total_price: item.price * item.quantity,
        })),
        payments: [
          { method: 'cash', amount: splitPayments.cash },
          { method: 'telebirr', amount: splitPayments.telebirr },
          { method: splitPayments.selected_bank || 'bank_transfer', amount: splitPayments.bank_transfer || 0 }
        ].filter(p => p.amount > 0)
      }

      await db.put('pending_sales', pendingPayload as any)

      if (selectedTable && db.objectStoreNames.contains('open_tabs')) {
        await db.delete('open_tabs', selectedTable.id)
      }

      await loadPOSData()
      setCart([])
      setSelectedTable(null)
      setShowPayment(false)
      setManualTip('') // Reset tips field on cleanup lifecycle

      router.push(`/${params.locale}/sales/${localId}`)
    } catch (err) {
      console.error('Local order logging crash:', err)
      alert('Local storage engine failure.')
    }
  }

  if (loading) return <div className="p-8 text-center text-sm font-bold text-slate-500 animate-pulse">{isAm ? 'በመጫን ላይ...' : 'Loading POS Cache...'}</div>

  if (!activeShift) {
    return (
      <div className="max-w-md mx-auto my-6 p-1">
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 px-6 py-8 text-center text-white space-y-2">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto">
              <Coins className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="font-bold text-xl">{isAm ? 'የመጀመሪያ ስራ ፈረቃዎን ይክፈቱ' : 'Open Your Shift'}</h1>
            <p className="text-slate-400 text-xs">
              {isAm ? 'ሽያጭ ለመጀመር መሳቢያዎ ውስጥ ያለውን የመነሻ መለወጫ ገንዘብ (ካሽ) ያስገቡ' : 'To start accepting sales, enter the starting cash float'}
            </p>
          </div>

          <div className="p-6 space-y-5">
            <div className="relative max-w-xs mx-auto">
              <input
                type="number"
                value={cashFloat}
                onChange={(e) => setCashFloat(e.target.value)}
                placeholder="0.00"
                className="w-full text-center font-mono font-black text-2xl text-slate-900 py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none"
              />
              <span className="absolute right-4 top-4 font-bold text-xs text-slate-400">ETB</span>
            </div>

            <button
              onClick={handleOpenShift}
              disabled={openingShift}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-base shadow-sm"
            >
              {openingShift ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{isAm ? 'ፈረቃ ክፈትና ሽያጭ ጀምር' : 'Open Shift & Start Selling'}<ArrowRight className="w-5 h-5" /></>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-4 pb-52 max-w-md mx-auto px-1 relative select-none">

      {/* Shift Action Bar */}
      <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {isAm ? 'ፈረቃ ተከፍቷል' : 'Shift Active'}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200/60 font-bold">{activeShift.real_database_id || 'Local'}</span>
          <button
            onClick={handleCloseShift}
            disabled={closingShift}
            className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-200/40 font-bold transition-all"
          >
            {closingShift ? <Loader2 className="w-3 h-3 animate-spin" /> : <><LogOut className="w-3 h-3" /><span>{isAm ? 'ዝጋ' : 'Close'}</span></>}
          </button>
        </div>
      </div>

      {/* Tables Selection Layout */}
      {!showPayment && (
        <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
          <span className="text-[11px] font-black tracking-wider text-slate-400 uppercase pl-1 block">
            {isAm ? 'ጠረጴዛ ይምረጡ' : 'Assign / Select Table'}
          </span>
          
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedTable(null)}
              className={`h-11 px-2 text-xs font-black rounded-xl border transition-all truncate text-center ${
                !selectedTable ? 'bg-slate-950 border-slate-950 text-white shadow-md' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {isAm ? 'ቀጥታ መሸጫ' : 'Walk-In'}
            </button>

            {tables.map((t) => {
              const isSelected = selectedTable?.id === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTable(t)}
                  className={`h-11 px-1 text-xs font-black rounded-xl border transition-all flex items-center justify-center gap-1 relative ${
                    isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md' : t.has_open_tab ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <Coffee className={`w-3 h-3 shrink-0 ${isSelected ? 'text-white' : t.has_open_tab ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span className="truncate max-w-[80px] uppercase tracking-tight">{t.name}</span>
                  {t.has_open_tab && !isSelected && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Screen Active View */}
      {!showPayment ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const cartItem = cart.find(item => item.id === product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className={`bg-white border relative h-28 p-3 rounded-2xl flex flex-col justify-between text-left transition-all shadow-sm active:scale-95 ${
                    cartItem ? 'border-blue-500 ring-2 ring-blue-500/10 bg-blue-50/5' : 'border-slate-200/80'
                  }`}
                >
                  {cartItem && <span className="absolute top-2 right-2 bg-blue-600 text-white font-mono font-black text-xs min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center shadow-sm">{cartItem.quantity}</span>}
                  <span className="font-bold text-slate-800 line-clamp-2 text-sm leading-tight pr-5">{product.name}</span>
                  <span className="font-mono text-slate-900 font-black text-base tracking-tight">{product.retail_price} <span className="text-[10px] font-bold text-slate-400">ETB</span></span>
                </button>
              );
            })}
          </div>

          {/* Cart Item Drawer layout */}
          {cart.length > 0 && (
            <div className="bg-white border-t border-slate-200 fixed bottom-16 left-0 right-0 max-w-md mx-auto p-4 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] rounded-t-3xl space-y-4">
              <div className="max-h-[140px] overflow-y-auto space-y-2 divide-y divide-slate-100 pr-1 subtle-scrollbar">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm pt-2 first:pt-0 gap-1">
                    <div className="w-2/5 truncate">
                      <span className="font-bold text-slate-700 block truncate">{item.name}</span>
                      <div className="flex gap-1 mt-0.5">
                        <button type="button" onClick={() => quickIncrement(item.id, 2)} className="text-[9px] font-mono bg-slate-100 text-slate-500 font-bold px-1 rounded">+2</button>
                        <button type="button" onClick={() => quickIncrement(item.id, 5)} className="text-[9px] font-mono bg-slate-100 text-slate-500 font-bold px-1 rounded">+5</button>
                      </div>
                    </div>

                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5">
                      <button type="button" onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white text-slate-600 rounded-lg shadow-sm border border-slate-100"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="font-mono font-black w-8 text-center text-slate-800">{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-white text-slate-600 rounded-lg shadow-sm border border-slate-100"><Plus className="w-3.5 h-3.5" /></button>
                    </div>

                    <span className="font-mono font-black text-slate-700 w-20 text-right text-xs">{(item.price * item.quantity)} <span className="text-[10px] font-bold text-slate-400">ETB</span></span>
                  </div>
                ))}
              </div>

              {/* Action layout panel */}
              <div className="grid grid-cols-5 gap-2">
                <button
                  type="button"
                  disabled={!selectedTable || savingTab}
                  onClick={handleSaveTab}
                  className="col-span-2 h-14 bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-0.5"
                >
                  {savingTab ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /><span>{isAm ? 'ትዕዛዝ አስቀምጥ' : 'Save Tab'}</span></>}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPayment(true)}
                  className="col-span-3 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm flex items-center justify-between px-3 shadow-md"
                >
                  <span className="flex items-center gap-1"><Receipt className="w-4 h-4" />{isAm ? 'ሂሳብ ዝጋ' : 'Close Bill'}</span>
                  <span className="font-mono font-black text-sm bg-emerald-700/50 px-2 py-1 rounded-xl">{totalBill} ETB</span>
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Payment view rendering screen */
        <div className="space-y-4 pb-24">
          <button
            type="button"
            onClick={() => {
              setShowPayment(false)
              setManualTip('') // Reset tips if they change minds
            }}
            className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/40"
          >
            ⬅️ {isAm ? 'ተመለስ' : 'Go Back'}
          </button>
          
          {selectedTable && (
            <div className="bg-slate-900 text-white font-black text-xs rounded-2xl p-3 flex justify-between items-center shadow-inner">
              <span className="uppercase tracking-wider text-slate-400 text-[10px]">{isAm ? 'አካውንት ጠረጴዛ' : 'Active Account'}</span>
              <span className="bg-blue-600 px-2.5 py-1 rounded-lg text-white font-mono text-xs shadow-sm uppercase">{selectedTable.name}</span>
            </div>
          )}

          {/* ─── VISUAL MANUAL TIP INJECTION BLOCK ─── */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <label className="text-xs font-black tracking-wide text-slate-500 uppercase block">
              {isAm ? 'ጉርሻ (የእጅ በእጅ / ማኑዋል)' : 'Manual Tip (Lump-Sum Transfer)'}
            </label>
            <div className="relative rounded-xl shadow-sm">
              <input
                type="number"
                value={manualTip}
                onChange={(e) => setManualTip(e.target.value)}
                placeholder="0.00"
                className="w-full font-mono text-sm font-bold bg-white border border-slate-200 rounded-xl py-2.5 pl-3 pr-14 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-slate-400 text-xs font-bold font-mono">ETB</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-tight">
              {isAm 
                ? '* ይህ ጉርሻ ወደ ዋናው ሂሳብ አይደመርም፤ ባለቤቱ ማታ ለዋናው አስተናጋጅ የሚመልሰውን መጠን ለመመዝገብ ብቻ ነው።'
                : '* This manual tip records the extra cash the owner must hand back to the waiter at night.'}
            </p>
          </div>

          <div className="bg-white p-4 border border-slate-100 rounded-3xl shadow-sm">
            {/* The underlying onConfirmPayment triggers the dynamic handleFinalizeSale function below */}
            <PaymentSelector totalBill={totalBill} onConfirmPayment={handleFinalizeSale} isAm={isAm} />
          </div>
        </div>
      )}
    </div>
  )
}
// // src/app/[locale]/(app)/sales/page.tsx
// 'use client';

// import { useState, useEffect } from 'react'
// import { getDB } from '../../../../lib/offline/db'
// import { finalizeSale } from '@/lib/offline/saleService'
// import PaymentSelector from '../../../../components/pos/PaymentSelector'
// import { useParams, useRouter } from 'next/navigation'

// import { 
//   Coins, 
//   ArrowRight, 
//   Loader2, 
//   Plus, 
//   Minus, 
//   Receipt, 
//   LogOut, 
//   Coffee, 
//   Save, 
//   ShoppingBag, 
//   Utensils 
// } from 'lucide-react'

// interface CartItem {
//   id: string
//   name: string
//   price: number
//   quantity: number
// }

// interface DynamicTable {
//   id: string
//   name: string
//   has_open_tab?: boolean
// }

// export default function POSPage() {
//   const params = useParams()
//   const router = useRouter()

//   const isAm = params.locale === 'am'

//   // Application UI Screens states
//   const [products, setProducts] = useState<any[]>([])
//   const [tables, setTables] = useState<DynamicTable[]>([])
//   const [cart, setCart] = useState<CartItem[]>([])
//   const [showPayment, setShowPayment] = useState(false)
//   const [loading, setLoading] = useState(true)

//   // Waiter Order management states
//   const [selectedTable, setSelectedTable] = useState<DynamicTable | null>(null)
//   const [savingTab, setSavingTab] = useState(false)

//   // Shift control status values
//   const [activeShift, setActiveShift] = useState<any>(null)
//   const [cashFloat, setCashFloat] = useState<string>('1000')
//   const [openingShift, setOpeningShift] = useState(false)
//   const [closingShift, setClosingShift] = useState(false)

//   // --- MANUAL WAITER TIP ENTRY STATE ---
//   const [manualTip, setManualTip] = useState<string>('')

//   // Load backend configurations from the offline database
//   async function loadPOSData() {
//     try {
//       const db = await getDB()

//       const currentShift = await db.get('active_shift', 'current')
//       setActiveShift(currentShift || null)

//       const items = await db.getAll('products')
//       setProducts(items || [])

//       const openTabsList = db.objectStoreNames.contains('open_tabs') 
//         ? await db.getAll('open_tabs') 
//         : []

//       if (db.objectStoreNames.contains('tables')) {
//         const structuralTables = await db.getAll('tables')

//         if (structuralTables && structuralTables.length > 0) {
//           const mappedTables: DynamicTable[] = structuralTables.map((t: any) => ({
//             id: String(t.id || t.table_number),
//             name: t.name || t.table_number || `Table ${t.id}`,
//             has_open_tab: openTabsList.some((tab: any) => String(tab.id) === String(t.id || t.table_number))
//           }))
//           setTables(mappedTables)
//         } else {
//           const localDefaults = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6', 'VIP Box']
//           setTables(localDefaults.map((name, index) => ({
//             id: `fallback_${index}`,
//             name: name,
//             has_open_tab: openTabsList.some((tab: any) => tab.table_number === name || tab.id === `fallback_${index}`)
//           })))
//         }
//       } else {
//         const localDefaults = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6', 'VIP Box1']
//         setTables(localDefaults.map((name, index) => ({
//           id: `fallback_${index}`,
//           name: name,
//           has_open_tab: openTabsList.some((tab: any) => tab.table_number === name)
//         })))
//       }
//     } catch (err) {
//       console.error('Failed to parse runtime local backend layout stores:', err)
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     loadPOSData()
//   }, [])

//   // Auto load active items whenever a table button is pressed
//   // Auto load active items whenever a table button is pressed
//   useEffect(() => {
//     async function syncActiveTableTab() {
//       if (!selectedTable) {
//         setCart([])
//         return
//       }
//       try {
//         const db = await getDB()
//         if (db.objectStoreNames.contains('open_tabs')) {
//           const existingTab = await db.get('open_tabs', selectedTable.id)

//           if (existingTab && Array.isArray(existingTab.items)) {
//             // Map keys instantly to resolve TypeScript definitions without altering database entries
//             const formattedCartItems = existingTab.items.map((item: any) => ({
//               id: item.product_id || item.id,
//               name: item.product_name || item.name || '',
//               quantity: Number(item.quantity || 1),
//               price: Number(item.unit_price || item.price || 0),
//               // Preserve database keys implicitly as backup references if business rules need them
//               product_id: item.product_id || item.id,
//               product_name: item.product_name || item.name || '',
//               unit_price: Number(item.unit_price || item.price || 0)
//             }))
//             setCart(formattedCartItems)
//           } else {
//             setCart([]) 
//           }
//         }
//       } catch (err) {
//         console.error('Error fetching open table configuration record:', err)
//       }
//     }
//     syncActiveTableTab()
//   }, [selectedTable])


//   const handleOpenShift = async () => {
//     setOpeningShift(true)
//     try {
//       const db = await getDB()
//       const floatNum = parseFloat(cashFloat) || 0
//       const functionalShiftId = `shift_${crypto.randomUUID().substring(0, 8)}`

//       const newShift = {
//         id: 'current',
//         real_database_id: functionalShiftId,
//         branch_id: 'branch_main',
//         cashier_id: 'cashier_default',
//         business_id: 'biz_active',
//         opening_cash: floatNum,
//         opening_float: floatNum,
//         opened_at: new Date().toISOString(),
//         opened_by: 'cashier_default',
//         closed_by: null,
//         shift_label: `Shift-${new Date().toLocaleDateString()}`,
//         closed_at: null,
//         closing_float: null,
//         actual_cash: null,
//         difference: null,
//         status: 'open',
//         notes: '',
//         created_at: new Date().toISOString(),
//         updated_at: new Date().toISOString()
//       }

//       try {
//         await db.put('active_shift', newShift as any, 'current')
//       } catch (keyError) {
//         await db.put('active_shift', newShift as any)
//       }

//       setActiveShift(newShift)
//     } catch (err) {
//       console.error('Shift storage initialization failed:', err)
//       alert(isAm ? 'ፈረቃ መክፈት አልተሳካም' : 'Failed to initialize register shift')
//     } finally {
//       setOpeningShift(false)
//     }
//   }

//   const handleCloseShift = async () => {
//     const confirmation = window.confirm(
//       isAm ? 'የአሁኑን የስራ ፈረቃ መዝጋት ይፈልጋሉ?' : 'Are you sure you want to close this active shift?'
//     )
//     if (!confirmation) return

//     setClosingShift(true)
//     try {
//       const db = await getDB()
//       await db.delete('active_shift', 'current')
//       setActiveShift(null)
//       setCart([])
//       setSelectedTable(null)
//       setShowPayment(false)
//       setManualTip('')

//       alert(isAm ? 'ፈረቃው በተሳካ ሁኔታ ተዘግቷል!' : 'Shift closed successfully!')
//     } catch (err) {
//       console.error('Failed to terminate system active shift context:', err)
//       alert(isAm ? 'ፈረቃ መዝጋት አልተሳካም' : 'Failed to close shift')
//     } finally {
//       setClosingShift(false)
//     }
//   }

//   const addToCart = (product: any) => {
//     setCart((prev) => {
//       const existing = prev.find((item) => item.id === product.id)
//       if (existing) {
//         return prev.map((item) =>
//           item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
//         )
//       }
//       return [...prev, { id: product.id, name: product.name, price: product.retail_price || 0, quantity: 1 }]
//     })
//   }

//   const updateQuantity = (id: string, amount: number) => {
//     setCart((prev) =>
//       prev
//         .map((item) => (item.id === id ? { ...item, quantity: item.quantity + amount } : item))
//         .filter((item) => item.quantity > 0)
//     )
//   }

//   const quickIncrement = (id: string, count: number) => {
//     setCart((prev) =>
//       prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity + count } : item))
//     )
//   }

//   const totalBill = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
//   const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

//     const handleSaveTab = async () => {
//     if (!selectedTable) return
//     setSavingTab(true)
//     try {
//       const db = await getDB()

//       // Map frontend cart properties back to your exact database keys
//       const formattedDatabaseItems = cart.map((item: any) => ({
//         product_id: item.id || item.product_id,
//         product_name: item.name || item.product_name || '',
//         quantity: Number(item.quantity || 1),
//         unit_price: Number(item.price || item.unit_price || 0),
//         // Keep standard keys too so no component layer breaks
//         id: item.id || item.product_id,
//         name: item.name || item.product_name || '',
//         price: Number(item.price || item.unit_price || 0)
//       }))

//       const tabPayload = {
//         id: selectedTable.id,
//         table_number: selectedTable.name, 
//         updated_at: new Date().toISOString(),
//         items: formattedDatabaseItems,
//         total_accumulated: totalBill
//       }

//       await db.put('open_tabs', tabPayload)

//       await loadPOSData()
//       setCart([])
//       setSelectedTable(null)
//       alert(isAm ? 'ትዕዛዙ በጠረጴዛው ላይ ተቀምጧል!' : 'Rounds saved to table successfully!')
//     } catch (err) {
//       console.error('Failed to preserve open session tab:', err)
//       alert('Error updating open table session.')
//     } finally {
//       setSavingTab(false)
//     }
//   }

//   const handleFinalizeSale = async (
//   splitPayments: {
//     cash: number
//     telebirr: number
//     bank_transfer?: number
//     selected_bank?: string
//   }
// ) => {
//   try {
//     const sale = await finalizeSale({
//       splitPayments,

//       manualTip,

//       activeShift,

//       selectedTable,

//       cart,

//       totalBill,
//     })

//     /*
//      * Refresh POS data so the UI immediately
//      * sees the new local stock quantity.
//      */
//     await loadPOSData()

//     /*
//      * Clear checkout state.
//      */
//     setCart([])
//     setSelectedTable(null)
//     setShowPayment(false)
//     setManualTip('')

//     /*
//      * Receipt reads the same local pending sale.
//      */
//     router.push(
//       `/${params.locale}/sales/${sale.localId}`
//     )

//   } catch (error) {
//     console.error(
//       '[POS] Failed to finalize local sale:',
//       error
//     )

//     alert(
//       'Unable to save the sale locally. Please try again.'
//     )
//   }
// }

//   if (loading) {
//     return (
//       <div className="h-screen w-screen flex items-center justify-center font-bold text-coffee-400 animate-pulse text-sm bg-cream-100">
//         {isAm ? 'በመጫን ላይ...' : 'Loading POS Cache...'}
//       </div>
//     )
//   }

//   if (!activeShift) {
//     return (
//       <div className="h-screen w-full flex items-center justify-center bg-coffee-800 p-4">
//         <div className="bg-cream-50 rounded-3xl shadow-elevated border border-cream-200 overflow-hidden w-full max-w-md">
//           <div className="bg-coffee-900 px-6 py-8 text-center text-cream-50 space-y-2">
//             <div className="w-12 h-12 rounded-full bg-cream-50/10 flex items-center justify-center mx-auto">
//               <Coins className="w-6 h-6 text-gold-400" />
//             </div>
//             <h1 className="font-bold text-xl">{isAm ? 'የመጀመሪያ ስራ ፈረቃዎን ይክፈቱ' : 'Open Your Shift'}</h1>
//             <p className="text-cream-300 text-xs">
//               {isAm ? 'ሽያጭ ለመጀመር መሳቢያዎ ውስጥ ያለውን የመነሻ መለወጫ ገንዘብ (ካሽ) ያስገቡ' : 'To start accepting sales, enter the starting cash float'}
//             </p>
//           </div>

//           <div className="p-6 space-y-5">
//             <div className="relative max-w-xs mx-auto">
//               <input
//                 type="number"
//                 value={cashFloat}
//                 onChange={(e) => setCashFloat(e.target.value)}
//                 placeholder="0.00"
//                 className="w-full text-center font-mono font-black text-2xl text-coffee-900 py-3 px-4 bg-cream-100 border border-cream-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-berbere-400"
//               />
//               <span className="absolute right-4 top-4 font-bold text-xs text-coffee-400">ETB</span>
//             </div>

//             <button
//               onClick={handleOpenShift}
//               disabled={openingShift}
//               className="w-full py-4 bg-success hover:bg-success text-cream-50 font-bold rounded-2xl flex items-center justify-center gap-2 text-base shadow-card transition-colors"
//             >
//               {openingShift ? (
//                 <Loader2 className="w-5 h-5 animate-spin" />
//               ) : (
//                 <>
//                   <span>{isAm ? 'ፈረቃ ክፈትና ሽያጭ ጀምር' : 'Open Shift & Start Selling'}</span>
//                   <ArrowRight className="w-5 h-5" />
//                 </>
//               )}
//             </button>
//           </div>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="h-screen w-full max-w-md mx-auto grid grid-rows-[auto_auto_1fr_auto] overflow-hidden bg-cream-100 text-coffee-700 relative select-none font-sans">

//       {/* 1. Shift Action Bar Header */}
//       <div className="flex justify-between items-center bg-coffee-900 px-4 py-2 text-xs font-medium text-cream-300 shadow-card">
//         <span className="flex items-center gap-1.5 font-bold">
//           <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
//           {isAm ? 'ፈረቃ ተከፍቷል' : 'SHIFT ACTIVE'}
//         </span>
//         <div className="flex items-center gap-2">
//           <span className="font-mono bg-coffee-800 text-gold-300 px-2 py-0.5 rounded border border-coffee-700 font-bold text-xs">
//             {activeShift.real_database_id || 'Local'}
//           </span>
//           <button
//             onClick={handleCloseShift}
//             disabled={closingShift}
//             className="flex items-center gap-1 bg-danger-bg text-danger border border-danger/20 px-2.5 py-1 rounded-md font-black text-xs transition-transform active:scale-95"
//           >
//             {closingShift ? <Loader2 className="w-3 h-3 animate-spin" /> : <><LogOut className="w-3 h-3" /><span>{isAm ? 'ዝጋ' : 'Close'}</span></>}
//           </button>
//         </div>
//       </div>

//       {/* 2. Live ERP KPI Overview Header Panel */}
//       <div className="bg-cream-50 border-b border-cream-300 p-3 grid grid-cols-2 gap-2 shadow-sm">
//         <div className="bg-cream-100 border border-cream-200 rounded-xl px-3 py-2 flex items-center justify-between">
//           <div>
//             <span className="text-[10px] uppercase font-black text-coffee-400 tracking-wider block">
//               {isAm ? 'የአሁኑ ጠረጴዛ' : 'Active Account'}
//             </span>
//             <span className="font-black text-sm text-coffee-700 uppercase truncate max-w-[120px] block">
//               {selectedTable ? selectedTable.name : (isAm ? 'ቀጥታ መሸጫ' : 'Walk-In')}
//             </span>
//           </div>
//           <Utensils className="w-4 h-4 text-berbere-400" />
//         </div>
//         <div className="bg-cream-100 border border-cream-200 rounded-xl px-3 py-2 flex items-center justify-between">
//           <div>
//             <span className="text-[10px] uppercase font-black text-coffee-400 tracking-wider block">
//               {isAm ? 'የእቃ ብዛት' : 'Total Basket'}
//             </span>
//             <span className="font-mono font-black text-sm text-berbere-500 block">
//               {totalItemsCount} <span className="text-[10px] font-bold text-coffee-400">items</span>
//             </span>
//           </div>
//           <ShoppingBag className="w-4 h-4 text-gold-500" />
//         </div>
//       </div>

//       {/* 3. Main Screen Active Scrollable View */}
//       <div className="overflow-y-auto px-3 py-4 space-y-4 subtle-scrollbar">
//         {!showPayment ? (
//           <>
//             {/* Tables Selection Layout */}
//             <div className="space-y-2 bg-cream-50 p-3 rounded-2xl border border-cream-300 shadow-sm">
//               <span className="text-[11px] font-black tracking-wider text-coffee-400 uppercase pl-0.5 block">
//                 {isAm ? 'ጠረጴዛ ይምረጡ' : 'Assign / Select Table'}
//               </span>

//               <div className="grid grid-cols-3 gap-2">
//                 <button
//                   type="button"
//                   onClick={() => setSelectedTable(null)}
//                   className={`h-11 px-2 text-xs font-black rounded-xl border transition-all truncate text-center ${
//                     !selectedTable 
//                       ? 'bg-berbere-500 border-berbere-500 text-cream-50 shadow-card' 
//                       : 'bg-cream-100 text-coffee-700 border-cream-300 hover:bg-cream-200'
//                   }`}
//                 >
//                   {isAm ? 'ቀጥታ መሸጫ' : 'Walk-In'}
//                 </button>

//                 {tables.map((t) => {
//                   const isSelected = selectedTable?.id === t.id
//                   return (
//                     <button
//                       key={t.id}
//                       type="button"
//                       onClick={() => setSelectedTable(t)}
//                       className={`h-11 px-1 text-xs font-black rounded-xl border transition-all flex items-center justify-center gap-1 relative ${
//                         isSelected 
//                           ? 'bg-gold-400 border-gold-400 text-coffee-800 shadow-card' 
//                           : t.has_open_tab 
//                             ? 'bg-warning-bg border-warning text-warning font-black' 
//                             : 'bg-cream-100 text-coffee-700 border-cream-300 hover:bg-cream-200'
//                       }`}
//                     >
//                       <Coffee className={`w-3 h-3 shrink-0 ${isSelected ? 'text-coffee-800' : t.has_open_tab ? 'text-warning' : 'text-coffee-400'}`} />
//                       <span className="truncate max-w-[75px] uppercase tracking-tight">{t.name}</span>
//                       {t.has_open_tab && !isSelected && (
//                         <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
//                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
//                           <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning"></span>
//                         </span>
//                       )}
//                     </button>
//                   )
//                 })}
//               </div>
//             </div>

//             {/* Menu Products Grid Container */}
//             <div className="grid grid-cols-2 gap-3">
//               {products.map((product) => {
//                 const cartItem = cart.find(item => item.id === product.id);
//                 return (
//                   <button
//                     key={product.id}
//                     type="button"
//                     onClick={() => addToCart(product)}
//                     className={`bg-cream-50 border relative h-28 p-3 rounded-2xl flex flex-col justify-between text-left transition-all shadow-sm active:scale-95 ${
//                       cartItem ? 'border-berbere-400 ring-2 ring-berbere-200 bg-cream-50' : 'border-cream-300'
//                     }`}
//                   >
//                     {cartItem && (
//                       <span className="absolute top-2 right-2 bg-berbere-500 text-cream-50 font-mono font-black text-xs min-w-[22px] h-5.5 px-1.5 rounded-full flex items-center justify-center shadow-card animate-duration-150 animate-bounce">
//                         {cartItem.quantity}
//                       </span>
//                     )}
//                     <span className="font-bold text-coffee-700 line-clamp-2 text-sm leading-tight pr-5">{product.name}</span>
//                     <span className="font-mono text-coffee-900 font-black text-base tracking-tight">
//                       {product.retail_price} <span className="text-[10px] font-bold text-coffee-400">ETB</span>
//                     </span>
//                   </button>
//                 );
//               })}
//             </div>
//           </>
//         ) : (
//           /* Payment view rendering screen */
//           <div className="space-y-4 animate-in fade-in duration-200">
//             <button
//               type="button"
//               onClick={() => {
//                 setShowPayment(false)
//                 setManualTip('')
//               }}
//               className="inline-flex items-center gap-1 text-xs font-black text-coffee-700 bg-cream-50 px-3.5 py-2 rounded-xl border border-cream-300 transition-transform active:scale-95 shadow-sm"
//             >
//               ⬅️ {isAm ? 'ተመለስ' : 'Go Back'}
//             </button>

//             {selectedTable && (
//               <div className="bg-coffee-900 text-cream-50 font-black text-xs rounded-2xl p-3.5 flex justify-between items-center shadow-md">
//                 <span className="uppercase tracking-wider text-cream-300 text-[10px]">{isAm ? 'አካውንት ጠረጴዛ' : 'Active Account'}</span>
//                 <span className="bg-gold-400 px-3 py-1 rounded-lg text-coffee-800 font-mono text-xs shadow-sm uppercase">{selectedTable.name}</span>
//               </div>
//             )}

//             {/* Manual Tip Module Layout Block */}
//             <div className="bg-cream-50 border border-cream-300 rounded-2xl p-4 space-y-2.5 shadow-sm">
//               <label className="text-xs font-black tracking-wide text-coffee-500 uppercase block">
//                 {isAm ? 'ጉርሻ (የእጅ በእጅ / ማኑዋል)' : 'Manual Tip (Lump-Sum Transfer)'}
//               </label>
//               <div className="relative rounded-xl shadow-sm">
//                 <input
//                   type="number"
//                   value={manualTip}
//                   onChange={(e) => setManualTip(e.target.value)}
//                   placeholder="0.00"
//                   className="w-full font-mono text-sm font-bold bg-cream-100 border border-cream-300 rounded-xl py-2.5 pl-3 pr-14 text-coffee-800 focus:outline-none focus:ring-2 focus:ring-berbere-400 focus:border-transparent"
//                 />
//                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
//                   <span className="text-coffee-400 text-xs font-bold font-mono">ETB</span>
//                 </div>
//               </div>
//               <p className="text-[10px] text-coffee-400 font-medium leading-tight">
//                 {isAm 
//                   ? '* ይህ ጉርሻ ወደ ዋናው ሂሳብ አይደመርም፤ ባለቤቱ ማታ ለዋናው አስተናጋጅ የሚመልሰውን መጠን ለመመዝገብ ብቻ ነው።'
//                   : '* This manual tip records the extra cash the owner must hand back to the waiter at night.'}
//               </p>
//             </div>

//             <div className="bg-cream-50 p-4 border border-cream-300 rounded-3xl shadow-sm">
//               <PaymentSelector totalBill={totalBill} onConfirmPayment={handleFinalizeSale} isAm={isAm} />
//             </div>
//           </div>
//         )}
//       </div>

//       {/* 4. Persistent Cart Item Bucket List Container & Action Controls Bar */}
//       {!showPayment && cart.length > 0 && (
//         <div className="bg-cream-50 border-t border-cream-300 p-4 shadow-elevated rounded-t-3xl space-y-3">
//           {/* Cart Item Row List Container */}
//           <div className="max-h-[130px] overflow-y-auto space-y-2 divide-y divide-cream-200 pr-1 subtle-scrollbar">
//             {cart.map((item) => (
//               <div key={item.id} className="flex items-center justify-between text-sm pt-2 first:pt-0 gap-2">
//                 <div className="w-2/5 truncate">
//                   <span className="font-bold text-coffee-700 block truncate">{item.name}</span>
//                   <div className="flex gap-1 mt-1">
//                     <button type="button" onClick={() => quickIncrement(item.id, 2)} className="text-[9px] font-mono bg-cream-200 hover:bg-cream-300 text-coffee-600 font-bold px-1.5 py-0.5 rounded">+2</button>
//                     <button type="button" onClick={() => quickIncrement(item.id, 5)} className="text-[9px] font-mono bg-cream-200 hover:bg-cream-300 text-coffee-600 font-bold px-1.5 py-0.5 rounded">+5</button>
//                   </div>
//                 </div>

//                 <div className="flex items-center border border-cream-300 rounded-xl bg-cream-100 p-0.5 shadow-inner">
//                   <button type="button" onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-cream-50 text-coffee-600 rounded-lg shadow-sm border border-cream-200 active:scale-90 transition-transform"><Minus className="w-3.5 h-3.5" /></button>
//                   <span className="font-mono font-black w-8 text-center text-coffee-800">{item.quantity}</span>
//                   <button type="button" onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-cream-50 text-coffee-600 rounded-lg shadow-sm border border-cream-200 active:scale-90 transition-transform"><Plus className="w-3.5 h-3.5" /></button>
//                 </div>

//                 <span className="font-mono font-black text-coffee-700 w-20 text-right text-xs">
//                   {item.price * item.quantity} <span className="text-[10px] font-bold text-coffee-400">ETB</span>
//                 </span>
//               </div>
//             ))}
//           </div>

//           {/* Core POS ERP Billing Controller Summary Block */}
//           <div className="bg-cream-100 rounded-xl p-2 flex justify-between items-center border border-cream-200 font-mono text-xs font-bold text-coffee-400">
//             <span>{isAm ? 'ንዑስ ድምር' : 'Subtotal Basket Sum:'}</span>
//             <span className="font-black text-coffee-700 text-sm">{totalBill.toLocaleString()} ETB</span>
//           </div>

//           <div className="grid grid-cols-5 gap-2 pt-1">
//             <button
//               type="button"
//               disabled={!selectedTable || savingTab}
//               onClick={handleSaveTab}
//               className="col-span-2 h-14 bg-cream-200 hover:bg-cream-300 disabled:opacity-40 border border-cream-300 text-coffee-700 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-0.5 transition-transform active:scale-95"
//             >
//               {savingTab ? <Loader2 className="w-4 h-4 animate-spin text-coffee-700" /> : <><Save className="w-4 h-4 text-coffee-600" /><span>{isAm ? 'ትዕዛዝ አስቀምጥ' : 'Save Tab'}</span></>}
//             </button>

//             <button
//               type="button"
//               onClick={() => setShowPayment(true)}
//               className="col-span-3 h-14 bg-berbere-500 hover:bg-berbere-600 text-cream-50 rounded-2xl font-black text-sm flex items-center justify-between px-4 shadow-card transition-transform active:scale-95"
//             >
//               <span className="flex items-center gap-1.5"><Receipt className="w-4 h-4 text-gold-300" />{isAm ? 'ሂሳብ ዝጋ' : 'Close Bill'}</span>
//               <span className="font-mono font-black text-sm bg-berbere-700/60 text-gold-300 px-2.5 py-1 rounded-xl shadow-inner">{totalBill} ETB</span>
//             </button>
//           </div>
//         </div>
//       )}

//     </div>
//   )
// }



'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Coins,
  Loader2,
  Table2,
} from 'lucide-react'

import { getDB } from '../../../../lib/offline/db'
import type { Shift } from '../../../../types/database/operations'
import { finalizeSale } from '@/lib/offline/saleService'

import POSHeader from '../../../../components/pos/POSHeader'
import POSCategories from '../../../../components/pos/POSCategories'
import POSProductGrid from '../../../../components/pos/POSProductGrid'
import POSCart from '../../../../components/pos/POSCart'
import POSCheckout from '../../../../components/pos/POSCheckout'

import type {
  POSCartItem,
  POSCategory,
  POSProduct,
  POSTable,
  PaymentSplit,
} from '../../../../components/pos/types'

export default function SalesPage() {
  const params = useParams()
  const router = useRouter()

  const locale = String(params.locale || 'en')
  const isAm = locale === 'am'

  // ============================================================
  // STATE
  // ============================================================

  const [loading, setLoading] = useState(true)

  const [products, setProducts] = useState<POSProduct[]>([])
  const [categories, setCategories] = useState<POSCategory[]>([])
  const [tables, setTables] = useState<POSTable[]>([])

  const [selectedCategoryId, setSelectedCategoryId] =
    useState<string>('all')

  const [selectedTable, setSelectedTable] =
    useState<POSTable | null>(null)

  const [cart, setCart] = useState<POSCartItem[]>([])

  const [activeShift, setActiveShift] =
    useState<Shift | null>(null)

  const [showCheckout, setShowCheckout] = useState(false)

  const [savingTab, setSavingTab] = useState(false)
  const [openingShift, setOpeningShift] = useState(false)
  const [closingShift, setClosingShift] = useState(false)

  const [cashFloat, setCashFloat] = useState('1000')
  const [manualTip, setManualTip] = useState('')

  // ============================================================
  // LOAD POS DATA
  // ============================================================

  const loadPOSData = useCallback(async () => {
    try {
      const db = await getDB()

      // --------------------------------------------------------
      // ACTIVE SHIFT
      // --------------------------------------------------------

      const shift = await db.get(
        'active_shift',
        'current',
      )

      /*
       * POSShift should use the same nullable fields
       * as the IndexedDB/database Shift type.
       *
       * Therefore we can safely use the returned shift
       * directly.
       */
      setActiveShift(shift || null)

      // --------------------------------------------------------
      // PRODUCTS
      // --------------------------------------------------------

      const productRows = await db.getAll('products')

      const normalizedProducts: POSProduct[] =
        (productRows || []).map((product: any) => ({
          id: String(product.id),

          name: String(
            product.name || 'Unnamed Product',
          ),

          category_id:
            product.category_id ??
            product.categoryId ??
            null,

          retail_price: Number(
            product.retail_price ??
            product.price ??
            0,
          ),

          image_url:
            product.image_url ??
            null,

          is_active:
            product.is_active !== false,

          sku:
            product.sku ??
            null,
        }))

      setProducts(normalizedProducts)

      // --------------------------------------------------------
      // CATEGORIES
      // --------------------------------------------------------

      if (
        db.objectStoreNames.contains(
          'categories',
        )
      ) {
        const categoryRows =
          await db.getAll('categories')

        const normalizedCategories: POSCategory[] =
          (categoryRows || [])
            .filter(
              (category: any) =>
                category.is_active !== false,
            )
            .map((category: any) => ({
              id: String(category.id),

              name: String(
                category.name ||
                category.category_name ||
                'Category',
              ),

              sort_order:
                Number(
                  category.sort_order ?? 0,
                ),

              is_active: true,
            }))
            .sort(
              (a, b) =>
                (a.sort_order ?? 0) -
                (b.sort_order ?? 0),
            )

        setCategories(
          normalizedCategories,
        )
      } else {
        setCategories([])
      }

      // --------------------------------------------------------
      // OPEN TABS
      // --------------------------------------------------------

      let openTabs: any[] = []

      if (
        db.objectStoreNames.contains(
          'open_tabs',
        )
      ) {
        openTabs =
          await db.getAll('open_tabs')
      }

      // --------------------------------------------------------
      // TABLES
      // --------------------------------------------------------

      let normalizedTables: POSTable[] = []

      if (
        db.objectStoreNames.contains(
          'tables',
        )
      ) {
        const tableRows =
          await db.getAll('tables')

        normalizedTables =
          (tableRows || []).map(
            (table: any) => {
              const id = String(
                table.id ??
                table.table_number ??
                crypto.randomUUID(),
              )

              const name = String(
                table.name ??
                table.table_number ??
                `Table ${id}`,
              )

              const hasOpenTab =
                openTabs.some(
                  (tab: any) =>
                    String(tab.id) === id ||
                    String(tab.table_id) === id ||
                    String(
                      tab.table_number,
                    ) === name,
                )

              return {
                id,
                name,

                table_number:
                  String(
                    table.table_number ??
                    name,
                  ),

                has_open_tab:
                  hasOpenTab,
              }
            },
          )
      }

      // --------------------------------------------------------
      // FALLBACK TABLES
      // --------------------------------------------------------

      /*
       * Keep fallback tables so the POS can still work
       * when the tables store has not been populated yet.
       */
      if (
        normalizedTables.length === 0
      ) {
        const defaultNames = [
          'Table 1',
          'Table 2',
          'Table 3',
          'Table 4',
          'Table 5',
          'Table 6',
          'VIP Box',
        ]

        normalizedTables =
          defaultNames.map(
            (name, index) => ({
              id: `fallback_${index}`,

              name,

              table_number: name,

              has_open_tab:
                openTabs.some(
                  (tab: any) =>
                    String(
                      tab.table_number,
                    ) === name,
                ),
            }),
          )
      }

      setTables(normalizedTables)
    } catch (error) {
      console.error(
        '[POS] Failed to load POS data:',
        error,
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPOSData()
  }, [loadPOSData])

  // ============================================================
  // FILTERED PRODUCTS
  // ============================================================

  const filteredProducts = useMemo(() => {
    if (
      selectedCategoryId === 'all'
    ) {
      return products
    }

    return products.filter(
      (product) =>
        String(
          product.category_id ?? '',
        ) ===
        String(
          selectedCategoryId,
        ),
    )
  }, [
    products,
    selectedCategoryId,
  ])

  // ============================================================
  // TOTALS
  // ============================================================

  const totalBill = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum +
          Number(item.price) *
          Number(item.quantity),
        0,
      ),
    [cart],
  )

  const totalItemsCount = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity),
        0,
      ),
    [cart],
  )

  const cartProductIds = useMemo(
    () =>
      new Set(
        cart.map(
          (item) => item.id,
        ),
      ),
    [cart],
  )

  // ============================================================
  // LOAD TABLE TAB
  // ============================================================

  const loadTableTab = useCallback(
    async (table: POSTable) => {
      try {
        const db = await getDB()

        if (
          !db.objectStoreNames.contains(
            'open_tabs',
          )
        ) {
          setCart([])
          return
        }

        // ------------------------------------------------------
        // TRY EXACT TABLE ID
        // ------------------------------------------------------

        let existingTab =
          await db.get(
            'open_tabs',
            table.id,
          )

        // ------------------------------------------------------
        // FALLBACK LOOKUP
        // ------------------------------------------------------

        if (!existingTab) {
          const allTabs =
            await db.getAll(
              'open_tabs',
            )

          existingTab =
            allTabs.find(
              (tab: any) =>
                String(
                  tab.table_id,
                ) ===
                String(
                  table.id,
                ) ||
                String(tab.id) ===
                String(
                  table.id,
                ) ||
                String(
                  tab.table_number,
                ) ===
                String(
                  table.name,
                ),
            )
        }

        // ------------------------------------------------------
        // RESTORE CART
        // ------------------------------------------------------

        if (
          existingTab &&
          Array.isArray(
            existingTab.items,
          )
        ) {
          const restoredCart: POSCartItem[] =
            existingTab.items
              .map(
                (item: any) => ({
                  id: String(
                    item.product_id ??
                    item.id,
                  ),

                  name: String(
                    item.product_name ??
                    item.name ??
                    'Product',
                  ),

                  price: Number(
                    item.unit_price ??
                    item.price ??
                    0,
                  ),

                  quantity: Number(
                    item.quantity ??
                    1,
                  ),
                }),
              )
              .filter(
                (item) =>
                  item.quantity > 0,
              )

          setCart(restoredCart)
        } else {
          setCart([])
        }
      } catch (error) {
        console.error(
          '[POS] Failed to load table tab:',
          error,
        )

        setCart([])
      }
    },
    [],
  )

  // ============================================================
  // SELECT TABLE
  // ============================================================

  const handleSelectTable = async (
    table: POSTable,
  ) => {
    /*
     * Prevent accidental loss of current order.
     */
    if (
      cart.length > 0 &&
      selectedTable &&
      selectedTable.id !==
      table.id
    ) {
      const confirmed =
        window.confirm(
          isAm
            ? 'የአሁኑን ትዕዛዝ ሳያስቀምጡ ጠረጴዛ መቀየር ይፈልጋሉ?'
            : 'Switch table without saving the current order?',
        )

      if (!confirmed) {
        return
      }
    }

    setSelectedTable(table)

    await loadTableTab(table)

    setShowCheckout(false)
  }

  // ============================================================
  // WALK-IN
  // ============================================================

  const handleWalkIn = () => {
    if (
      cart.length > 0 &&
      selectedTable
    ) {
      const confirmed =
        window.confirm(
          isAm
            ? 'የአሁኑን ትዕዛዝ ሳያስቀምጡ ወደ ቀጥታ ሽያጭ መሄድ ይፈልጋሉ?'
            : 'Switch to walk-in without saving the current order?',
        )

      if (!confirmed) {
        return
      }
    }

    setSelectedTable(null)
    setCart([])
    setShowCheckout(false)
  }

  // ============================================================
  // ADD PRODUCT
  // ============================================================

  const addToCart = (
    product: POSProduct,
  ) => {
    const price = Number(
      product.retail_price ?? 0,
    )

    setCart((previous) => {
      const existing =
        previous.find(
          (item) =>
            item.id ===
            product.id,
        )

      if (existing) {
        return previous.map(
          (item) =>
            item.id ===
              product.id
              ? {
                ...item,
                quantity:
                  item.quantity +
                  1,
              }
              : item,
        )
      }

      return [
        ...previous,
        {
          id: product.id,
          name: product.name,
          price,
          quantity: 1,
        },
      ]
    })
  }

  // ============================================================
  // QUANTITY
  // ============================================================

  const increaseQuantity = (
    id: string,
    amount = 1,
  ) => {
    setCart((previous) =>
      previous.map(
        (item) =>
          item.id === id
            ? {
              ...item,
              quantity:
                item.quantity +
                amount,
            }
            : item,
      ),
    )
  }

  const decreaseQuantity = (
    id: string,
  ) => {
    setCart((previous) =>
      previous
        .map(
          (item) =>
            item.id === id
              ? {
                ...item,
                quantity:
                  item.quantity -
                  1,
              }
              : item,
        )
        .filter(
          (item) =>
            item.quantity > 0,
        ),
    )
  }

  const clearCartItem = (
    id: string,
  ) => {
    setCart((previous) =>
      previous.filter(
        (item) =>
          item.id !== id,
      ),
    )
  }

  // ============================================================
  // OPEN SHIFT
  // ============================================================

  // ============================================================
  // OPEN SHIFT
  // ============================================================

 const handleOpenShift = async () => {
  setOpeningShift(true)

  try {
    const db = await getDB()

    const floatNum =
      Number.parseFloat(cashFloat) || 0

    const now =
      new Date().toISOString()

    const newShift: Shift = {
      /*
       * IMPORTANT:
       * active_shift is a local IndexedDB record,
       * so its key is "current".
       */
      id: 'current',

      business_id:
        'biz_active',

      branch_id:
        'branch_main',

      cashier_id:
        'cashier_default',

      opened_by:
        'cashier_default',

      closed_by:
        null,

      shift_label:
        `Shift-${new Date().toLocaleDateString()}` as Shift['shift_label'],

      opened_at:
        now,

      closed_at:
        null,

      opening_cash:
        floatNum,

      opening_float:
        floatNum,

      expected_cash:
        floatNum,

      actual_cash_reported:
        null,

      cash_discrepancy:
        null,

      total_sales:
        0,

      total_transactions:
        0,

      status:
        'open' as Shift['status'],

      is_first_shift:
        false,

      notes:
        null,

      created_at:
        now,

      updated_at:
        now,

      closing_float:
        null,

      actual_cash:
        null,

      difference:
        null,
    }

    /*
     * IMPORTANT:
     * Do NOT pass "current" as the third argument.
     *
     * The active_shift object store uses an inline key.
     */
    await db.put(
      'active_shift',
      newShift,
    )

    setActiveShift(newShift)

  } catch (error) {
    console.error(
      '[POS] Failed to open shift:',
      error,
    )

    window.alert(
      isAm
        ? 'ፈረቃ መክፈት አልተሳካም'
        : 'Failed to open shift',
    )
  } finally {
    setOpeningShift(false)
  }
}

  // ============================================================
  // CLOSE SHIFT
  // ============================================================

  const handleCloseShift =
    async () => {
      const confirmed =
        window.confirm(
          isAm
            ? 'የአሁኑን ፈረቃ መዝጋት ይፈልጋሉ?'
            : 'Are you sure you want to close this shift?',
        )

      if (!confirmed) {
        return
      }

      setClosingShift(true)

      try {
        const db = await getDB()

        await db.delete(
          'active_shift',
          'current',
        )

        setActiveShift(null)
        setCart([])
        setSelectedTable(null)
        setShowCheckout(false)
        setManualTip('')
      } catch (error) {
        console.error(
          '[POS] Failed to close shift:',
          error,
        )

        window.alert(
          isAm
            ? 'ፈረቃ መዝጋት አልተሳካም'
            : 'Failed to close shift',
        )
      } finally {
        setClosingShift(false)
      }
    }

  // ============================================================
  // SAVE TABLE TAB
  // ============================================================

  const handleSaveTab =
    async () => {
      if (!selectedTable) {
        window.alert(
          isAm
            ? 'እባክዎ ጠረጴዛ ይምረጡ'
            : 'Please select a table first.',
        )

        return
      }

      if (cart.length === 0) {
        return
      }

      setSavingTab(true)

      try {
        const db = await getDB()

        const items =
          cart.map((item) => ({
            product_id:
              item.id,

            product_name:
              item.name,

            quantity: Number(
              item.quantity,
            ),

            unit_price:
              Number(item.price),
          }))

        const tabPayload = {
          id: selectedTable.id,

          table_id:
            selectedTable.id,

          table_number:
            selectedTable.table_number ??
            selectedTable.name,

          items,

          total_accumulated:
            Number(totalBill),

          updated_at:
            new Date().toISOString(),
        }

        await db.put(
          'open_tabs',
          tabPayload,
        )

        await loadPOSData()

        setCart([])

        setSelectedTable(null)

        window.alert(
          isAm
            ? 'ትዕዛዙ በጠረጴዛው ላይ ተቀምጧል!'
            : 'Order saved to table successfully.',
        )
      } catch (error) {
        console.error(
          '[POS] Failed to save table tab:',
          error,
        )

        window.alert(
          isAm
            ? 'ትዕዛዙን ማስቀመጥ አልተቻለም'
            : 'Failed to save table order.',
        )
      } finally {
        setSavingTab(false)
      }
    }

  // ============================================================
  // FINALIZE SALE
  // ============================================================

  const handleFinalizeSale =
    async (
      splitPayments: PaymentSplit,
    ) => {
      if (!activeShift) {
        return
      }

      try {
        const sale =
          await finalizeSale({
            splitPayments,
            manualTip,
            activeShift,
            selectedTable,
            cart,
            totalBill,
          })

        await loadPOSData()

        setCart([])

        setSelectedTable(null)

        setShowCheckout(false)

        setManualTip('')

        router.push(
          `/${locale}/sales/${sale.localId}`,
        )
      } catch (error) {
        console.error(
          '[POS] Failed to finalize sale:',
          error,
        )

        window.alert(
          isAm
            ? 'ሽያጩን ማስቀመጥ አልተቻለም'
            : 'Unable to save the sale locally.',
        )
      }
    }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-cream-100">
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-berbere-500" />

          <p className="mt-3 text-xs font-black text-coffee-500">
            {isAm
              ? 'በመጫን ላይ...'
              : 'Loading POS...'}
          </p>
        </div>
      </div>
    )
  }

  // ============================================================
  // OPEN SHIFT SCREEN
  // ============================================================

  if (!activeShift) {
    return (
      <div className="flex h-dvh items-center justify-center bg-coffee-900 p-4">
        <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-cream-50 shadow-elevated">
          <div className="bg-coffee-900 px-6 py-8 text-center text-white">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <Coins className="h-7 w-7 text-gold-400" />
            </div>

            <h1 className="mt-4 text-xl font-black">
              {isAm
                ? 'ፈረቃ ይክፈቱ'
                : 'Open Your Shift'}
            </h1>

            <p className="mt-2 text-xs text-cream-300">
              {isAm
                ? 'ሽያጭ ለመጀመር የመነሻ ገንዘብ ያስገቡ'
                : 'Enter the starting cash float to begin selling.'}
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-xs font-black text-coffee-500">
                {isAm
                  ? 'የመነሻ ገንዘብ'
                  : 'Opening Cash'}
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={cashFloat}
                  onChange={(e) =>
                    setCashFloat(
                      e.target.value,
                    )
                  }
                  className="h-14 w-full rounded-2xl border border-cream-300 bg-cream-100 px-4 pr-14 text-center font-mono text-xl font-black text-coffee-900 outline-none focus:border-berbere-400 focus:ring-2 focus:ring-berbere-100"
                />

                <span className="absolute right-4 top-5 text-xs font-black text-coffee-400">
                  ETB
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={
                handleOpenShift
              }
              disabled={
                openingShift
              }
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-success text-white shadow-card active:scale-95 disabled:opacity-50"
            >
              {openingShift ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="font-black">
                  {isAm
                    ? 'ፈረቃ ክፈት'
                    : 'Open Shift'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // MAIN POS
  // ============================================================

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-cream-100 font-sans text-coffee-700">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <POSHeader
        isAm={isAm}
        activeShift={activeShift}
        selectedTable={selectedTable}
        totalItems={totalItemsCount}
        totalBill={totalBill}
        onCloseShift={
          handleCloseShift
        }
        closingShift={
          closingShift
        }
      />

      {/* ======================================================
          MAIN CONTENT
      ======================================================= */}

     {/* ============================================================
    MAIN CONTENT
============================================================ */}

<main className="min-h-0 flex-1 overflow-y-auto subtle-scrollbar">
  {!showCheckout ? (
    <div className="mx-auto w-full max-w-[1600px] p-3 sm:p-4 lg:p-5">

      {/* ======================================================
          RESPONSIVE POS LAYOUT
      ======================================================= */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_360px] lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-5">

        {/* ====================================================
            LEFT SIDE
        ===================================================== */}

        <div className="min-w-0 space-y-4">

          {/* ==================================================
              TABLES
          =================================================== */}

          <section className="rounded-2xl border border-cream-300 bg-cream-50 p-3 shadow-sm sm:p-4">

            <div className="mb-3 flex items-center justify-between">

              <div className="flex items-center gap-2">
                <Table2 className="h-4 w-4 text-berbere-500" />

                <h2 className="text-xs font-black uppercase tracking-wider text-coffee-700">
                  {isAm
                    ? 'ጠረጴዛ'
                    : 'Tables'}
                </h2>
              </div>

              <span className="text-[10px] font-bold text-coffee-400">
                {tables.length}
              </span>

            </div>

            {/* ==============================================
                TABLE LIST

                Mobile:
                horizontal scroll

                Tablet/Desktop:
                grid
            =============================================== */}

            <div className="flex gap-2 overflow-x-auto pb-1 subtle-scrollbar md:grid md:grid-cols-4 md:overflow-visible md:pb-0 lg:grid-cols-5 xl:grid-cols-6">

              {/* WALK-IN */}

              <button
                type="button"
                onClick={handleWalkIn}
                className={[
                  'h-14 min-w-[92px] shrink-0 rounded-xl border text-xs font-black transition md:min-w-0',
                  !selectedTable
                    ? 'border-berbere-500 bg-berbere-500 text-white shadow-sm'
                    : 'border-cream-300 bg-cream-100 text-coffee-700 hover:border-berbere-300',
                ].join(' ')}
              >
                {isAm
                  ? 'ቀጥታ'
                  : 'Walk-In'}
              </button>

              {/* TABLES */}

              {tables.map((table) => {
                const selected =
                  selectedTable?.id === table.id

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() =>
                      void handleSelectTable(table)
                    }
                    className={[
                      'relative h-14 min-w-[92px] shrink-0 overflow-hidden rounded-xl border px-2 text-xs font-black transition md:min-w-0',
                      selected
                        ? 'border-gold-400 bg-gold-400 text-coffee-900 shadow-sm'
                        : table.has_open_tab
                          ? 'border-warning bg-warning-bg text-warning hover:brightness-95'
                          : 'border-cream-300 bg-cream-100 text-coffee-700 hover:border-berbere-300',
                    ].join(' ')}
                  >
                    <span className="block truncate">
                      {table.name}
                    </span>

                    {table.has_open_tab && (
                      <>
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-warning" />

                        <span className="mt-1 block text-[8px] uppercase">
                          {isAm
                            ? 'ክፍት'
                            : 'OPEN'}
                        </span>
                      </>
                    )}
                  </button>
                )
              })}

            </div>
          </section>

          {/* ==================================================
              CATEGORIES
          =================================================== */}

          <POSCategories
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            isAm={isAm}
          />

          {/* ==================================================
              PRODUCTS
          =================================================== */}

          <POSProductGrid
            products={filteredProducts}
            cartProductIds={cartProductIds}
            onAddProduct={addToCart}
            isAm={isAm}
          />

        </div>

        {/* ====================================================
            CART
        ===================================================== */}

        <aside className="min-w-0">

          <div className="md:sticky md:top-0">

            <POSCart
              cart={cart}
              totalBill={totalBill}
              selectedTable={selectedTable}
              savingTab={savingTab}
              onIncrease={increaseQuantity}
              onDecrease={decreaseQuantity}
              onClearItem={clearCartItem}
              onSaveTab={handleSaveTab}
              onCheckout={() =>
                setShowCheckout(true)
              }
              isAm={isAm}
            />

          </div>

        </aside>

      </div>

    </div>
  ) : (

    /* ========================================================
       CHECKOUT
    ========================================================= */

    <div className="mx-auto w-full max-w-2xl p-3 sm:p-4 lg:p-6">

      <POSCheckout
        cart={cart}
        totalBill={totalBill}
        selectedTable={selectedTable}
        manualTip={manualTip}
        onManualTipChange={setManualTip}
        onBack={() =>
          setShowCheckout(false)
        }
        onConfirmPayment={handleFinalizeSale}
        isAm={isAm}
      />

    </div>

  )}
</main>

      {/* ======================================================
          MOBILE CART
      ======================================================= */}

      {!showCheckout && (
        <div className="lg:hidden">
          <POSCart
            cart={cart}
            totalBill={
              totalBill
            }
            selectedTable={
              selectedTable
            }
            savingTab={
              savingTab
            }
            onIncrease={
              increaseQuantity
            }
            onDecrease={
              decreaseQuantity
            }
            onClearItem={
              clearCartItem
            }
            onSaveTab={
              handleSaveTab
            }
            onCheckout={() =>
              setShowCheckout(
                true,
              )
            }
            isAm={isAm}
          />
        </div>
      )}
    </div>
  )
}
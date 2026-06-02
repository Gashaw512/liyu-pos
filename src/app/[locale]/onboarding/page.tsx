// //  Business setup wizard


// // src/app/[locale]/onboarding/page.tsx
// 'use client'

// import React from 'react'
// import { useParams } from 'next/navigation'

// /**
//  * Liyu POS - Onboarding Workspace Welcome Dashboard
//  * Next.js demands this component be exported as the DEFAULT asset.
//  */
// export default function OnboardingPage() {
//   const params = useParams()
//   const locale = params?.locale || 'am'

//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
//       <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 text-center space-y-6">
//         <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
//           <span className="text-2xl">🏪</span>
//         </div>
        
//         <h1 className="text-2xl font-bold text-gray-900">
//           {locale === 'am' ? 'ወደ Liyu POS እንኳን ደህና መጡ!' : 'Welcome to Liyu POS!'}
//         </h1>
        
//         <p className="text-gray-600 text-sm">
//           {locale === 'am' 
//             ? 'የአካውንት ምዝገባዎ በተሳካ ሁኔታ ተጠናቋል። አሁን የስራ ቦታዎን እያዘጋጀን ነው።' 
//             : 'Your registration was highly successful. We are now preparing your cloud workspace setup.'}
//         </p>

//         <div className="pt-4">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
//         </div>
//       </div>
//     </div>
//   )
// }


// 'use client'

// import { useState } from 'react'
// import { useRouter } from 'next/navigation'
// import {
//   Beer, Utensils, Store, Hotel, ShoppingBag,
//   ArrowRight, ArrowLeft, CheckCircle, Plus, X,
//   Coffee, Package, ChevronDown,
// } from 'lucide-react'
// import  createClient  from '../../../lib/supabase/client'

// /* ─── Types ──────────────────────────────────────────────────────────────── */
// type Lang = 'am' | 'en'

// interface BusinessSetup {
//   type: string
//   currency: string
//   openTime: string
//   closeTime: string
//   categories: string[]
//   products: Array<{ name: string; nameAm: string; costPrice: string; retailPrice: string; unit: string; emoji: string }>
// }

// /* ─── Business type options ───────────────────────────────────────────────── */
// const BIZ_TYPES = [
//   { value: 'bar',        icon: Beer,        emoji: '🍺', en: 'Bar / Tej Bet',      am: 'ባር / ተጅ ቤት',     color: 'border-berbere-200 hover:border-berbere-400' },
//   { value: 'restaurant', icon: Utensils,    emoji: '🍽️', en: 'Restaurant',          am: 'ምግብ ቤት',         color: 'border-gold-200 hover:border-gold-400' },
//   { value: 'cafe',       icon: Coffee,      emoji: '☕', en: 'Cafe / Coffee House', am: 'ካፌ / ቡና ቤት',    color: 'border-amber-200 hover:border-amber-400' },
//   { value: 'hotel',      icon: Hotel,       emoji: '🏨', en: 'Hotel',               am: 'ሆቴል',            color: 'border-blue-200 hover:border-blue-400' },
//   { value: 'retail',     icon: ShoppingBag, emoji: '🛒', en: 'Kiosk / Mini-Market', am: 'ኪዮስክ / ሱቅ',    color: 'border-green-200 hover:border-green-400' },
//   { value: 'other',      icon: Store,       emoji: '🏪', en: 'Other',               am: 'ሌላ',             color: 'border-coffee-200 hover:border-coffee-300' },
// ]

// /* ─── Starter product templates per business type ────────────────────────── */
// const STARTER_PRODUCTS: Record<string, BusinessSetup['products']> = {
//   bar: [
//     { name: 'St. George Beer', nameAm: 'ሴንት ጆርጅ ቢራ', costPrice: '45', retailPrice: '85', unit: 'bottle', emoji: '🍺' },
//     { name: 'Dashen Beer',     nameAm: 'ዳሸን ቢራ',      costPrice: '42', retailPrice: '80', unit: 'bottle', emoji: '🍺' },
//     { name: 'Meta Beer',       nameAm: 'ሜታ ቢራ',       costPrice: '40', retailPrice: '75', unit: 'bottle', emoji: '🍺' },
//     { name: 'Tej (Glass)',     nameAm: 'ተጅ (ብርጭቆ)',  costPrice: '20', retailPrice: '60', unit: 'piece',  emoji: '🍯' },
//     { name: 'Water 0.5L',      nameAm: 'ውሃ 0.5 ሊትር', costPrice: '5',  retailPrice: '15', unit: 'bottle', emoji: '💧' },
//     { name: 'Pepsi 0.5L',      nameAm: 'ፔፕሲ 0.5 ሊትር',costPrice: '12', retailPrice: '25', unit: 'bottle', emoji: '🥤' },
//   ],
//   restaurant: [
//     { name: 'Tibs (Beef)',    nameAm: 'ጥብስ (ስጋ)',   costPrice: '80',  retailPrice: '180', unit: 'piece', emoji: '🥩' },
//     { name: 'Injera + Wot',   nameAm: 'እንጀራ + ወጥ', costPrice: '35',  retailPrice: '90',  unit: 'piece', emoji: '🫓' },
//     { name: 'Firfir',         nameAm: 'ፍርፍር',       costPrice: '25',  retailPrice: '70',  unit: 'piece', emoji: '🍲' },
//     { name: 'Macchiato',      nameAm: 'ማኪያቶ',       costPrice: '8',   retailPrice: '25',  unit: 'piece', emoji: '☕' },
//     { name: 'Pepsi 0.5L',     nameAm: 'ፔፕሲ',        costPrice: '12',  retailPrice: '25',  unit: 'bottle',emoji: '🥤' },
//     { name: 'Water 0.5L',     nameAm: 'ውሃ',          costPrice: '5',   retailPrice: '15',  unit: 'bottle',emoji: '💧' },
//   ],
//   cafe: [
//     { name: 'Macchiato',      nameAm: 'ማኪያቶ',        costPrice: '8',  retailPrice: '25',  unit: 'piece', emoji: '☕' },
//     { name: 'Buna (Coffee)',  nameAm: 'ቡና',           costPrice: '6',  retailPrice: '20',  unit: 'piece', emoji: '☕' },
//     { name: 'Cappuccino',     nameAm: 'ካፑቺኖ',        costPrice: '15', retailPrice: '55',  unit: 'piece', emoji: '☕' },
//     { name: 'Tea',            nameAm: 'ሻይ',           costPrice: '5',  retailPrice: '18',  unit: 'piece', emoji: '🍵' },
//     { name: 'Juice (Mixed)',  nameAm: 'ጁስ (ድብልቅ)',  costPrice: '20', retailPrice: '60',  unit: 'piece', emoji: '🥤' },
//     { name: 'Sandwich',       nameAm: 'ሳንድዊች',       costPrice: '30', retailPrice: '75',  unit: 'piece', emoji: '🥪' },
//   ],
//   hotel: [
//     { name: 'Room Service Coffee', nameAm: 'ቡና', costPrice: '10', retailPrice: '40', unit: 'piece', emoji: '☕' },
//     { name: 'Breakfast Plate',     nameAm: 'ቁርስ', costPrice: '60', retailPrice: '150', unit: 'piece', emoji: '🍳' },
//     { name: 'St. George Beer',     nameAm: 'ቢራ',  costPrice: '45', retailPrice: '100', unit: 'bottle', emoji: '🍺' },
//     { name: 'Water 0.5L',          nameAm: 'ውሃ',  costPrice: '5',  retailPrice: '20',  unit: 'bottle', emoji: '💧' },
//   ],
//   retail: [
//     { name: 'Cooking Oil 1L', nameAm: 'ዘይት 1 ሊ',   costPrice: '55', retailPrice: '70', unit: 'piece',  emoji: '🫙' },
//     { name: 'Sugar 1kg',      nameAm: 'ስኳር 1 ኪ',   costPrice: '25', retailPrice: '32', unit: 'kg',     emoji: '🧂' },
//     { name: 'Teff 1kg',       nameAm: 'ጤፍ 1 ኪ',    costPrice: '30', retailPrice: '38', unit: 'kg',     emoji: '🌾' },
//     { name: 'Bread (Dabo)',   nameAm: 'ዳቦ',          costPrice: '12', retailPrice: '18', unit: 'piece',  emoji: '🍞' },
//   ],
//   other: [
//     { name: 'Product 1', nameAm: 'ምርት 1', costPrice: '10', retailPrice: '20', unit: 'piece', emoji: '📦' },
//     { name: 'Product 2', nameAm: 'ምርት 2', costPrice: '10', retailPrice: '20', unit: 'piece', emoji: '📦' },
//   ],
// }

// const UNIT_OPTIONS = [
//   { v: 'bottle', en: 'Bottle', am: 'ጠርሙስ' },
//   { v: 'piece',  en: 'Piece',  am: 'ቁራጭ' },
//   { v: 'kg',     en: 'Kg',     am: 'ኪሎ' },
//   { v: 'liter',  en: 'Liter',  am: 'ሊትር' },
//   { v: 'crate',  en: 'Crate',  am: 'ሳጥን' },
//   { v: 'pack',   en: 'Pack',   am: 'ጥቅል' },
// ]

// const STEPS = [
//   { en: 'Business type', am: 'የንግድ አይነት' },
//   { en: 'Working hours', am: 'የሥራ ሰዓት' },
//   { en: 'Products',      am: 'ምርቶች' },
//   { en: 'All done!',     am: 'ተጠናቀቀ!' },
// ]

// export default function OnboardingPage() {
//   const router   = useRouter()
//   const supabase = createClient()

//   const [lang, setLang]   = useState<Lang>('am')
//   const [step, setStep]   = useState(0)
//   const [saving, setSaving] = useState(false)
//   const [setup, setSetup] = useState<BusinessSetup>({
//     type: '',
//     currency: 'ETB',
//     openTime: '06:00',
//     closeTime: '23:00',
//     categories: [],
//     products: [],
//   })

//   const t = (en: string, am: string) => lang === 'am' ? am : en

//   /* ── Step 0: pick business type ─────────────────────────────────────── */
//   const pickType = (type: string) => {
//     setSetup(s => ({
//       ...s,
//       type,
//       products: [...STARTER_PRODUCTS[type] || []],
//     }))
//     setTimeout(() => setStep(1), 180) // small delay for tap feedback
//   }

//   /* ── Step 2: product management ─────────────────────────────────────── */
//   const updateProduct = (index: number, field: keyof BusinessSetup['products'][0], value: string) => {
//     setSetup(s => {
//       const prods = [...s.products]
//       prods[index] = { ...prods[index], [field]: value }
//       return { ...s, products: prods }
//     })
//   }

//   const removeProduct = (index: number) => {
//     setSetup(s => ({ ...s, products: s.products.filter((_, i) => i !== index) }))
//   }

//   const addProduct = () => {
//     setSetup(s => ({
//       ...s,
//       products: [...s.products, { name: '', nameAm: '', costPrice: '', retailPrice: '', unit: 'piece', emoji: '📦' }],
//     }))
//   }

//   /* ── Final save to Supabase ─────────────────────────────────────────── */
//   const finishSetup = async () => {
//     setSaving(true)
//     try {
//       const { data: { user } } = await supabase.auth.getUser()
//       if (!user) { router.push('/login'); return }

//       // Get business_id from profile
//       const { data: profile } = await supabase
//         .from('profiles').select('business_id, branch_id').eq('id', user.id).single()
//       if (!profile) return

//       const bizId    = profile.business_id
//       const branchId = profile.branch_id

//       // 1. Update business settings
//       await supabase.from('businesses').update({
//         type: setup.type,
//         currency: setup.currency,
//       }).eq('id', bizId)

//       // 2. Create default categories
//       const catNames: Record<string, { en: string; am: string }[]> = {
//         bar:        [{ en: 'Beer', am: 'ቢራ' }, { en: 'Spirits', am: 'አልኮሆል' }, { en: 'Soft Drink', am: 'ለስላሳ' }, { en: 'Water', am: 'ውሃ' }],
//         restaurant: [{ en: 'Main Dish', am: 'ዋና ምግብ' }, { en: 'Drinks', am: 'መጠጥ' }, { en: 'Breakfast', am: 'ቁርስ' }],
//         cafe:       [{ en: 'Coffee', am: 'ቡና' }, { en: 'Tea', am: 'ሻይ' }, { en: 'Juice', am: 'ጁስ' }, { en: 'Snacks', am: 'ቀላል ምግብ' }],
//         hotel:      [{ en: 'Room Service', am: 'ሩም ሰርቪስ' }, { en: 'Restaurant', am: 'ምግብ ቤት' }, { en: 'Bar', am: 'ባር' }],
//         retail:     [{ en: 'Food & Groceries', am: 'ምግብ' }, { en: 'Household', am: 'የቤት ዕቃ' }, { en: 'Beverages', am: 'መጠጥ' }],
//         other:      [{ en: 'General', am: 'አጠቃላይ' }],
//       }

//       const cats = catNames[setup.type] || catNames.other
//       const { data: insertedCats } = await supabase.from('categories').insert(
//         cats.map((c, i) => ({
//           business_id: bizId,
//           name: c.en,
//           name_am: c.am,
//           sort_order: i,
//         }))
//       ).select('id, name')

//       const defaultCatId = insertedCats?.[0]?.id

//       // 3. Insert products
//       const validProducts = setup.products.filter(p => p.name && p.retailPrice)
//       if (validProducts.length > 0 && defaultCatId) {
//         const productRows = validProducts.map(p => ({
//           business_id:  bizId,
//           branch_id:    branchId,
//           category_id:  defaultCatId,
//           name:         p.name,
//           name_am:      p.nameAm || p.name,
//           cost_price:   parseFloat(p.costPrice) || 0,
//           retail_price: parseFloat(p.retailPrice) || 0,
//           unit_type:    p.unit,
//           is_active:    true,
//           track_inventory: true,
//         }))
//         const { data: insertedProducts } = await supabase
//           .from('products').insert(productRows).select('id')

//         // 4. Create initial inventory records (zero stock)
//         if (insertedProducts) {
//           await supabase.from('inventory').insert(
//             insertedProducts.map(p => ({
//               business_id: bizId,
//               branch_id:   branchId,
//               product_id:  p.id,
//               quantity:    0,
//             }))
//           )
//         }
//       }

//       // 5. Mark onboarding complete on profile
//       await supabase.from('profiles').update({
//         updated_at: new Date().toISOString(),
//       }).eq('id', user.id)

//       setStep(3) // go to success screen
//     } catch (err) {
//       console.error('Onboarding error:', err)
//     } finally {
//       setSaving(false)
//     }
//   }

//   /* ─── Input class ───────────────────────────────────────────────────── */
//   const inp = (err = false) =>
//     `w-full px-3 text-[14px] text-[#2B1E1A] bg-[#F7F4EB]/60 border rounded-xl
//      outline-none transition-colors focus:border-[#8B2635] focus:bg-white
//      min-h-[48px] ${err ? 'border-red-400' : 'border-[#2B1E1A]/15'}`

//   const selectedType = BIZ_TYPES.find(b => b.value === setup.type)

//   return (
//     <div className="min-h-screen bg-[#F7F4EB] flex flex-col font-['DM_Sans',sans-serif]"
//          style={{ WebkitTapHighlightColor: 'transparent' }}>

//       {/* ─── FIXED HEADER ─────────────────────────────────────────────── */}
//       <div className="sticky top-0 z-20 bg-[#8B2635]">
//         {/* Logo row */}
//         <div className="flex items-center justify-between px-4 pt-4 pb-3">
//           <span className="font-['Playfair_Display',serif] font-bold text-white text-xl">
//             ሊዩ <span className="text-[#E2A03F]">POS</span>
//           </span>
//           <button
//             onClick={() => setLang(l => l === 'am' ? 'en' : 'am')}
//             className="text-xs font-bold text-white/70 hover:text-white bg-white/15
//                        px-2.5 py-1 rounded-full transition-colors min-h-[32px]">
//             {lang === 'am' ? 'EN' : 'አማ'}
//           </button>
//         </div>

//         {/* Step title */}
//         {step < 3 && (
//           <div className="px-4 pb-3">
//             <div className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-0.5">
//               {t(`Step ${step + 1} of 3`, `ደረጃ ${step + 1} ከ 3`)}
//             </div>
//             <div className="text-white font-bold text-base">
//               {t(STEPS[step].en, STEPS[step].am)}
//             </div>
//           </div>
//         )}

//         {/* Progress bar */}
//         {step < 3 && (
//           <div className="flex gap-1 px-4 pb-3">
//             {[0, 1, 2].map(i => (
//               <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
//                 ${i <= step ? 'bg-[#E2A03F]' : 'bg-white/20'}`} />
//             ))}
//           </div>
//         )}
//       </div>

//       {/* ─── SCROLLABLE CONTENT ───────────────────────────────────────── */}
//       <div className="flex-1 overflow-y-auto pb-32">

//         {/* ══ STEP 0: Business type ════════════════════════════════════ */}
//         {step === 0 && (
//           <div className="px-4 pt-5">
//             <p className="text-[#5a3e38] text-sm mb-5">
//               {t('Choose what best describes your business. This sets up the right products and categories for you.',
//                  'ለንግድዎ የሚስማማውን ይምረጡ። ትክክለኛ ምርቶችና ምድቦች ይዘጋጁሎታል።')}
//             </p>
//             <div className="grid grid-cols-2 gap-3">
//               {BIZ_TYPES.map((bt) => (
//                 <button key={bt.value} onClick={() => pickType(bt.value)}
//                   className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-white
//                                border-2 transition-all active:scale-95 min-h-[100px]
//                                ${setup.type === bt.value
//                                  ? 'border-[#8B2635] bg-[#8B2635]/5 shadow-md'
//                                  : bt.color}`}>
//                   <span className="text-3xl">{bt.emoji}</span>
//                   <span className="text-xs font-bold text-[#2B1E1A] text-center leading-tight">
//                     {lang === 'am' ? bt.am : bt.en}
//                   </span>
//                   {setup.type === bt.value && (
//                     <CheckCircle className="w-4 h-4 text-[#8B2635]" />
//                   )}
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* ══ STEP 1: Hours & currency ════════════════════════════════ */}
//         {step === 1 && (
//           <div className="px-4 pt-5 space-y-5">
//             <p className="text-[#5a3e38] text-sm">
//               {t('Tell us your typical working hours so we can help you manage shifts correctly.',
//                  'የሥራ ሰዓትዎን ያስገቡ። ሺፍቶችን በትክክል ለማስተዳደር ይረዳል።')}
//             </p>

//             {/* Selected type reminder */}
//             <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3
//                             border border-[#2B1E1A]/8">
//               <span className="text-2xl">{selectedType?.emoji}</span>
//               <div>
//                 <div className="text-xs text-[#9b7b74] font-medium">
//                   {t('Your business type', 'የንግድ አይነት')}
//                 </div>
//                 <div className="font-bold text-sm text-[#2B1E1A]">
//                   {selectedType ? (lang === 'am' ? selectedType.am : selectedType.en) : ''}
//                 </div>
//               </div>
//             </div>

//             {/* Hours */}
//             <div className="bg-white rounded-2xl border border-[#2B1E1A]/8 p-4 space-y-4">
//               <div className="text-xs font-bold uppercase tracking-wider text-[#5a3e38]">
//                 {t('Working Hours', 'የሥራ ሰዓት')}
//               </div>
//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <label className="block text-[11px] font-bold text-[#9b7b74] mb-1.5 uppercase tracking-wide">
//                     {t('Opens', 'ይከፈታል')}
//                   </label>
//                   <input type="time" value={setup.openTime}
//                     onChange={e => setSetup(s => ({ ...s, openTime: e.target.value }))}
//                     className={inp()} />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] font-bold text-[#9b7b74] mb-1.5 uppercase tracking-wide">
//                     {t('Closes', 'ይዘጋል')}
//                   </label>
//                   <input type="time" value={setup.closeTime}
//                     onChange={e => setSetup(s => ({ ...s, closeTime: e.target.value }))}
//                     className={inp()} />
//                 </div>
//               </div>
//             </div>

//             {/* Shift types */}
//             <div className="bg-white rounded-2xl border border-[#2B1E1A]/8 p-4">
//               <div className="text-xs font-bold uppercase tracking-wider text-[#5a3e38] mb-3">
//                 {t('Shift Labels', 'የሺፍት ስሞች')}
//               </div>
//               <div className="flex flex-wrap gap-2">
//                 {[
//                   { en: 'Morning', am: 'ጠዋት' },
//                   { en: 'Afternoon', am: 'ቀን' },
//                   { en: 'Evening', am: 'ምሽት' },
//                   { en: 'Night', am: 'ሌሊት' },
//                 ].map(sh => (
//                   <div key={sh.en}
//                     className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F4EB]
//                                rounded-full border border-[#2B1E1A]/10 text-xs font-medium text-[#5a3e38]">
//                     <CheckCircle className="w-3 h-3 text-emerald-500" />
//                     {lang === 'am' ? sh.am : sh.en}
//                   </div>
//                 ))}
//               </div>
//               <p className="text-[10px] text-[#9b7b74] mt-2">
//                 {t('You can assign any of these labels when opening a shift.',
//                    'ሺፍት ሲከፍቱ ከነዚህ ስሞች ይምረጡ።')}
//               </p>
//             </div>
//           </div>
//         )}

//         {/* ══ STEP 2: Products ════════════════════════════════════════ */}
//         {step === 2 && (
//           <div className="pt-4">
//             <div className="px-4 mb-4">
//               <p className="text-[#5a3e38] text-sm">
//                 {t('We\'ve added starter products for your business type. Edit prices or add more.',
//                    'ለንግድዎ አይነት የጀማሪ ምርቶች ተጨምረዋል። ዋጋዎችን ይቀይሩ ወይም ተጨማሪ ያክሉ።')}
//               </p>
//             </div>

//             {/* Price header hint */}
//             <div className="mx-4 mb-3 grid grid-cols-[1fr_72px_72px_32px] gap-2 items-center">
//               <div className="text-[10px] font-bold uppercase tracking-wide text-[#9b7b74]">
//                 {t('Product', 'ምርት')}
//               </div>
//               <div className="text-[10px] font-bold uppercase tracking-wide text-[#9b7b74] text-center">
//                 {t('Cost', 'ዋጋ ገዢ')}
//               </div>
//               <div className="text-[10px] font-bold uppercase tracking-wide text-[#9b7b74] text-center">
//                 {t('Sell', 'ዋጋ ሸጪ')}
//               </div>
//               <div />
//             </div>

//             {/* Product rows */}
//             <div className="space-y-2 px-4">
//               {setup.products.map((prod, i) => (
//                 <div key={i}
//                   className="bg-white rounded-2xl border border-[#2B1E1A]/8 p-3
//                              flex items-start gap-2">
//                   {/* Emoji */}
//                   <div className="w-9 h-9 rounded-xl bg-[#F7F4EB] flex items-center justify-center
//                                   text-lg shrink-0 mt-1">
//                     {prod.emoji}
//                   </div>

//                   {/* Name + unit */}
//                   <div className="flex-1 min-w-0">
//                     <input value={prod.name}
//                       onChange={e => updateProduct(i, 'name', e.target.value)}
//                       placeholder={t('Product name', 'የምርት ስም')}
//                       className="w-full text-[13px] font-semibold text-[#2B1E1A] bg-transparent
//                                  outline-none border-b border-[#2B1E1A]/10 pb-0.5 mb-1
//                                  placeholder:text-[#9b7b74]" />
//                     <div className="relative">
//                       <select value={prod.unit}
//                         onChange={e => updateProduct(i, 'unit', e.target.value)}
//                         className="text-[10px] text-[#9b7b74] bg-transparent outline-none
//                                    appearance-none pr-4 cursor-pointer">
//                         {UNIT_OPTIONS.map(u => (
//                           <option key={u.v} value={u.v}>
//                             {lang === 'am' ? u.am : u.en}
//                           </option>
//                         ))}
//                       </select>
//                       <ChevronDown className="absolute right-0 top-0 w-3 h-3 text-[#9b7b74] pointer-events-none" />
//                     </div>
//                   </div>

//                   {/* Cost price */}
//                   <div className="w-[68px] shrink-0">
//                     <div className="text-[9px] text-[#9b7b74] text-center mb-0.5">ETB</div>
//                     <input value={prod.costPrice}
//                       onChange={e => updateProduct(i, 'costPrice', e.target.value)}
//                       type="number" inputMode="decimal" placeholder="0"
//                       className="w-full text-center text-[13px] font-semibold text-[#5a3e38]
//                                  bg-[#F7F4EB]/60 border border-[#2B1E1A]/10 rounded-lg py-1.5
//                                  outline-none focus:border-[#8B2635] min-h-[36px]" />
//                   </div>

//                   {/* Retail price */}
//                   <div className="w-[68px] shrink-0">
//                     <div className="text-[9px] text-[#9b7b74] text-center mb-0.5">ETB</div>
//                     <input value={prod.retailPrice}
//                       onChange={e => updateProduct(i, 'retailPrice', e.target.value)}
//                       type="number" inputMode="decimal" placeholder="0"
//                       className="w-full text-center text-[13px] font-bold text-[#8B2635]
//                                  bg-[#8B2635]/5 border border-[#8B2635]/20 rounded-lg py-1.5
//                                  outline-none focus:border-[#8B2635] min-h-[36px]" />
//                   </div>

//                   {/* Remove */}
//                   <button onClick={() => removeProduct(i)}
//                     className="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center
//                                justify-center text-red-400 hover:bg-red-100 shrink-0 mt-1
//                                active:scale-90 transition-all">
//                     <X className="w-3.5 h-3.5" />
//                   </button>
//                 </div>
//               ))}
//             </div>

//             {/* Profit preview */}
//             {setup.products.some(p => p.costPrice && p.retailPrice) && (
//               <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
//                 <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-1.5">
//                   {t('Profit Preview', 'ትርፍ ቅድመ ዕይታ')}
//                 </div>
//                 {setup.products.filter(p => p.costPrice && p.retailPrice).slice(0, 3).map((p, i) => {
//                   const profit = parseFloat(p.retailPrice) - parseFloat(p.costPrice)
//                   const margin = ((profit / parseFloat(p.retailPrice)) * 100).toFixed(0)
//                   return (
//                     <div key={i} className="flex items-center justify-between text-xs py-0.5">
//                       <span className="text-[#5a3e38]">{p.name || t('Product', 'ምርት')}</span>
//                       <span className="font-bold text-emerald-700">
//                         +{profit} ETB ({margin}%)
//                       </span>
//                     </div>
//                   )
//                 })}
//               </div>
//             )}

//             {/* Add product button */}
//             <button onClick={addProduct}
//               className="mx-4 mt-3 flex items-center justify-center gap-2 w-[calc(100%-32px)]
//                          py-3 rounded-2xl border-2 border-dashed border-[#8B2635]/30
//                          text-[#8B2635] text-sm font-semibold hover:bg-[#8B2635]/5
//                          transition-all active:scale-98 min-h-[52px]">
//               <Plus className="w-4 h-4" />
//               {t('Add Another Product', 'ሌላ ምርት ያክሉ')}
//             </button>

//             <p className="text-center text-[11px] text-[#9b7b74] mt-3 px-4">
//               {t('You can always add, edit, or remove products from the Products screen later.',
//                  'ምርቶችን ከምርቶች ገጽ ማከል፣ ማስተካከልና መሰረዝ ሁልጊዜ ይቻላል።')}
//             </p>
//           </div>
//         )}

//         {/* ══ STEP 3: Success ═════════════════════════════════════════ */}
//         {step === 3 && (
//           <div className="px-4 pt-10 flex flex-col items-center text-center">
//             {/* Animated checkmark */}
//             <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
//               <CheckCircle className="w-12 h-12 text-emerald-500" strokeWidth={1.5} />
//             </div>

//             <h2 className="font-['Playfair_Display',serif] font-bold text-2xl text-[#2B1E1A] mb-2">
//               {t('All set! 🎉', 'ተዘጋጅቷል! 🎉')}
//             </h2>
//             <p className="text-[#5a3e38] text-sm max-w-xs leading-relaxed mb-6">
//               {t(
//                 'Your business is configured. Products and categories are ready. Now open your first shift and start selling.',
//                 'ንግድዎ ተዘጋጅቷል። ምርቶችና ምድቦች ዝግጁ ናቸው። አሁን የመጀመሪያ ሺፍትዎን ይክፈቱ እና ሽያጭ ይጀምሩ።'
//               )}
//             </p>

//             {/* Summary cards */}
//             <div className="w-full space-y-2 mb-8">
//               {[
//                 {
//                   emoji: '🏪', label: t('Business type', 'የንግድ አይነት'),
//                   value: selectedType ? (lang === 'am' ? selectedType.am : selectedType.en) : '',
//                 },
//                 {
//                   emoji: '📦', label: t('Products added', 'የተጨመሩ ምርቶች'),
//                   value: `${setup.products.filter(p => p.name).length} ${t('products', 'ምርቶች')}`,
//                 },
//                 {
//                   emoji: '🕐', label: t('Working hours', 'የሥራ ሰዓት'),
//                   value: `${setup.openTime} – ${setup.closeTime}`,
//                 },
//               ].map(card => (
//                 <div key={card.label}
//                   className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3
//                              border border-[#2B1E1A]/8">
//                   <span className="text-xl">{card.emoji}</span>
//                   <div className="text-left flex-1">
//                     <div className="text-[11px] text-[#9b7b74]">{card.label}</div>
//                     <div className="text-sm font-bold text-[#2B1E1A]">{card.value}</div>
//                   </div>
//                   <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
//                 </div>
//               ))}
//             </div>

//             <button onClick={() => router.push('/dashboard')}
//               className="w-full flex items-center justify-center gap-2
//                          bg-[#8B2635] hover:bg-[#7a1f2d] text-white
//                          font-bold text-base rounded-xl shadow-md
//                          transition-all active:scale-[0.98] min-h-[56px]">
//               {t('Open My Dashboard', 'ዳሽቦርዴን ይክፈቱ')}
//               <ArrowRight className="w-5 h-5" />
//             </button>
//           </div>
//         )}
//       </div>

//       {/* ─── FIXED BOTTOM ACTIONS (steps 0-2) ────────────────────────── */}
//       {step < 3 && (
//         <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#F7F4EB]
//                         border-t border-[#2B1E1A]/10 px-4 py-4
//                         safe-area-inset-bottom">

//           <div className="flex gap-3 max-w-sm mx-auto">
//             {/* Back button */}
//             {step > 0 && (
//               <button onClick={() => setStep(s => (s - 1) as 0 | 1 | 2)}
//                 className="flex items-center justify-center gap-1.5 px-5 py-3.5
//                            border-2 border-[#2B1E1A]/15 rounded-xl font-semibold
//                            text-[#5a3e38] hover:bg-white transition-all min-h-[52px]">
//                 <ArrowLeft className="w-4 h-4" />
//                 {t('Back', 'ተመለስ')}
//               </button>
//             )}

//             {/* Next / Finish */}
//             <button
//               onClick={step === 2 ? finishSetup : () => {
//                 if (step === 0 && !setup.type) return
//                 setStep(s => (s + 1) as 1 | 2)
//               }}
//               disabled={saving || (step === 0 && !setup.type)}
//               className="flex-1 flex items-center justify-center gap-2
//                          bg-[#8B2635] hover:bg-[#7a1f2d] disabled:opacity-50
//                          text-white font-bold text-[15px] rounded-xl shadow-sm
//                          transition-all active:scale-[0.98] min-h-[52px]">
//               {saving ? (
//                 <>
//                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                   {t('Saving...', 'እየተቀመጠ...')}
//                 </>
//               ) : step === 2 ? (
//                 <>
//                   {t('Finish Setup', 'ቅንብርን ጨርስ')}
//                   <CheckCircle className="w-4 h-4" />
//                 </>
//               ) : (
//                 <>
//                   {t('Continue', 'ቀጥሉ')}
//                   <ArrowRight className="w-4 h-4" />
//                 </>
//               )}
//             </button>
//           </div>

//           {step === 0 && !setup.type && (
//             <p className="text-center text-[11px] text-[#9b7b74] mt-2">
//               {t('Please select your business type to continue', 'ለመቀጠል የንግድ አይነቱን ይምረጡ')}
//             </p>
//           )}
//         </div>
//       )}
//     </div>
//   )
// }

// src/app/[locale]/onboarding/page.tsx
// 'use client'

// import { useParams } from 'next/navigation'
// import { CheckCircle2, Store, Database, ShieldCheck } from 'lucide-react'

// export default function OnboardingPage() {
//   const params = useParams()
//   const locale = params?.locale || 'am'

//   const isAm = locale === 'am'

//   return (
//     <div className="min-h-screen bg-[#F7F4EB] flex items-center justify-center px-4">
//       <div className="w-full max-w-lg">

//         <div className="bg-white rounded-3xl shadow-xl border border-[#2B1E1A]/10 overflow-hidden">

//           {/* Header */}
//           <div className="bg-[#8B2635] px-6 py-8 text-center text-white">
//             <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-4">
//               <CheckCircle2 className="w-10 h-10 text-[#E2A03F]" />
//             </div>

//             <h1 className="font-bold text-2xl">
//               {isAm
//                 ? 'አካውንትዎ ተፈጥሯል'
//                 : 'Your Account Is Ready'}
//             </h1>

//             <p className="text-white/75 mt-2 text-sm">
//               {isAm
//                 ? 'ወደ ሊዩ POS እንኳን ደህና መጡ'
//                 : 'Welcome to Liyu POS'}
//             </p>
//           </div>

//           {/* Content */}
//           <div className="p-6">

//             <div className="text-center">
//               <div className="text-lg font-semibold text-[#2B1E1A]">
//                 {isAm
//                   ? 'የንግድ ቦታዎን እያዘጋጀን ነው'
//                   : 'Preparing Your Workspace'}
//               </div>

//               <p className="text-sm text-[#7A6A67] mt-2">
//                 {isAm
//                   ? 'የሽያጭ፣ የእቃ እና የሪፖርት ስርዓትዎን በራስ-ሰር እያዘጋጀን ነው።'
//                   : 'We are setting up your sales, inventory and reporting system.'}
//               </p>
//             </div>

//             {/* Progress */}
//             <div className="mt-8 space-y-4">

//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
//                   <ShieldCheck className="w-5 h-5 text-green-600" />
//                 </div>

//                 <div>
//                   <div className="font-medium text-sm">
//                     {isAm
//                       ? 'አካውንት ተፈጥሯል'
//                       : 'Account Created'}
//                   </div>
//                   <div className="text-xs text-[#7A6A67]">
//                     {isAm
//                       ? 'በተሳካ ሁኔታ'
//                       : 'Completed successfully'}
//                   </div>
//                 </div>
//               </div>

//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-full bg-[#E2A03F]/20 flex items-center justify-center">
//                   <Store className="w-5 h-5 text-[#E2A03F]" />
//                 </div>

//                 <div>
//                   <div className="font-medium text-sm">
//                     {isAm
//                       ? 'የንግድ ቦታ እየተዘጋጀ'
//                       : 'Creating Business Workspace'}
//                   </div>
//                   <div className="text-xs text-[#7A6A67]">
//                     {isAm
//                       ? 'እባክዎ ይጠብቁ...'
//                       : 'Please wait...'}
//                   </div>
//                 </div>
//               </div>

//               <div className="flex items-center gap-3 opacity-60">
//                 <div className="w-10 h-10 rounded-full bg-[#F7F4EB] flex items-center justify-center">
//                   <Database className="w-5 h-5 text-[#8B2635]" />
//                 </div>

//                 <div>
//                   <div className="font-medium text-sm">
//                     {isAm
//                       ? 'የመጀመሪያ ቅንብር'
//                       : 'Initial Setup'}
//                   </div>
//                   <div className="text-xs text-[#7A6A67]">
//                     {isAm
//                       ? 'በቅርቡ ይጠናቀቃል'
//                       : 'Almost finished'}
//                   </div>
//                 </div>
//               </div>

//             </div>

//             {/* Progress Bar */}
//             <div className="mt-8">
//               <div className="w-full h-2 bg-[#F1ECE1] rounded-full overflow-hidden">
//                 <div className="h-full w-3/4 bg-[#8B2635] rounded-full animate-pulse" />
//               </div>
//             </div>

//             {/* Footer */}
//             <div className="mt-8 text-center">
//               <p className="text-xs text-[#7A6A67]">
//                 {isAm
//                   ? 'በጥቂት ሰከንዶች ውስጥ ወደ ዳሽቦርድዎ ይመራሉ'
//                   : 'You will be redirected to your dashboard shortly'}
//               </p>
//             </div>

//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }






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

  const [businessType, setBusinessType] = useState<BusinessType>('other')
  const [businessName, setBusinessName] = useState('')
  const [loadingMetadata, setLoadingMetadata] = useState(true)

  const [step, setStep] = useState(0)
  const [openTime, setOpenTime] = useState('06:00')
  const [closeTime, setCloseTime] = useState('23:00')
  const [categories, setCategories] = useState<string[]>([])
  const [products, setProducts] = useState<TemplateProduct[]>([])
  const [isSaving, setIsSaving] = useState(false)

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

  const handleSaveWorkspace = async () => {
    setIsSaving(true)
    try {
      await setupBusiness(supabase, {
        businessType,
        openTime,
        closeTime,
        categories,
        products
      })
      handleNext()
    } catch (err) {
      console.error('Error committing configuration matrix to backend tables:', err)
    } finally {
      setIsSaving(false)
    }
  }

const handleFinalizeAndRedirect = async (openingFloat: number) => {
    setIsSaving(true) // 1. Trigger the full-screen loading spinner to block double-tapping
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push(`/${locale}/login`)
        return
      }

      // 2. Resolve structural business workspace parameters securely
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

      // 3. Ensure branch exists for the shift register assignment
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

      // 4. SEQUENTIAL EXECUTION: Code stops immediately if any write fails (Prevents fake success redirects)
      
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

      // 5. SUCCESS ROUTE: Safe to refresh and advance into the application canvas framework
      router.refresh()
      router.push(`/${locale}/dashboard`)

    } catch (err) {
      console.error('Critical workspace initialization error caught safely:', err)
      
      // 6. NON-TECHNICAL UI RESCUE: Friendly notification instead of crashing silently
      alert(isAm 
        ? 'ማስቀመጥ አልተሳካም። እባክዎ የስልክዎን ኢንተርኔት አረጋግጠው ድጋሚ ይሞክሩ!' 
        : 'Could not complete setup. Please verify your mobile internet connection and try again.'
      )
    } finally {
      setIsSaving(false) // Shut off loading indicator whether code succeeded or errored out
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
      <div className="w-full max-w-lg">
        
        {step === 0 && (
          <WelcomeStep 
            isAm={isAm}
            businessName={businessName}
            categoriesCount={categories.length}
            productsCount={products.length}
            onNext={handleNext}
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
            businessType={businessType}
            categories={categories}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {step === 3 && (
          <ProductsStep 
            isAm={isAm}
            products={products}
            onNext={handleNext}
            onBack={handleBack}
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
          />
        )}

        {step === 5 && (
          <SuccessStep 
            isAm={isAm}
            onFinalize={handleFinalizeAndRedirect}
          />
        )}

        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: 6 }).map((_, idx) => (
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
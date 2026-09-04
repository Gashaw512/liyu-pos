// 'use client'

// import { Search, X } from 'lucide-react'

// import POSTableSelector from './POSTableSelector'
// import POSCategories from './POSCategories'
// import POSProductGrid from './POSProductGrid'

// import type {
//   POSCategory,
//   POSProduct,
// } from './types'

// interface POSWorkspaceProps {
//   isAm: boolean

//   tables: any[]
//   selectedTable: any
//   onSelectTable: (table: any) => void
//   onWalkIn: () => void

//   productSearch: string
//   setProductSearch: (value: string) => void

//   filteredProducts: POSProduct[]

//   categories: POSCategory[]
//   selectedCategoryId: string
//   setSelectedCategoryId: (value: string) => void

//   cartQuantities: Map<string, number>
//   addToCart: (product: POSProduct) => void
// }

// export default function POSWorkspace({
//   isAm,
//   tables,
//   selectedTable,
//   onSelectTable,
//   onWalkIn,
//   productSearch,
//   setProductSearch,
//   filteredProducts,
//   categories,
//   selectedCategoryId,
//   setSelectedCategoryId,
//   cartQuantities,
//   addToCart,
// }: POSWorkspaceProps) {
//   const totalCartItems = Array.from(
//     cartQuantities.values(),
//   ).reduce(
//     (sum, quantity) => sum + quantity,
//     0,
//   )

//   return (
//     <div
//       className="
//         flex
//         h-full
//         min-h-0
//         w-full
//         flex-col
//         overflow-hidden
//         bg-cream-100
//       "
//     >
//       {/* ======================================================
//           FIXED POS CONTROLS
//           ====================================================== */}

//       <div
//         className="
//           shrink-0
//           px-2
//           pt-2
//           sm:px-3
//           sm:pt-3
//           lg:px-4
//           lg:pt-3
//         "
//       >
//         <div className="mx-auto w-full max-w-[1600px]">

//           {/* ==================================================
//               TABLE / SALES AREA
//               ================================================== */}

//           <section
//             className="
//               overflow-hidden
//               rounded-xl
//               border
//               border-cream-300
//               bg-cream-50
//               shadow-sm
//               sm:rounded-2xl
//             "
//           >
//             <div
//               className="
//                 flex
//                 min-h-[54px]
//                 items-center
//                 gap-2
//                 px-2.5
//                 py-1.5
//                 sm:px-3
//                 sm:py-2
//               "
//             >
//               {/* SALES AREA LABEL */}

//               <div className="min-w-0 shrink-0">
//                 <p
//                   className="
//                     truncate
//                     text-[9px]
//                     font-black
//                     uppercase
//                     tracking-[0.08em]
//                     text-coffee-400
//                     sm:text-[10px]
//                   "
//                 >
//                   {isAm
//                     ? 'የሽያጭ ቦታ'
//                     : 'Sales Area'}
//                 </p>

//                 <p
//                   className="
//                     max-w-[130px]
//                     truncate
//                     text-[11px]
//                     font-black
//                     text-coffee-800
//                     sm:max-w-[180px]
//                     sm:text-xs
//                   "
//                 >
//                   {selectedTable
//                     ? selectedTable.name
//                     : isAm
//                       ? 'ቀጥታ ሽያጭ'
//                       : 'Walk-in Sale'}
//                 </p>
//               </div>

//               <div className="h-7 w-px shrink-0 bg-cream-300" />

//               {/* TABLE SELECTOR */}

//               <div className="min-w-0 flex-1 overflow-hidden">
//                 <POSTableSelector
//                   tables={tables}
//                   selectedTable={selectedTable}
//                   isAm={isAm}
//                   onSelectTable={onSelectTable}
//                   onWalkIn={onWalkIn}
//                 />
//               </div>
//             </div>
//           </section>

//           {/* ==================================================
//               SEARCH + CATEGORIES
//               ================================================== */}

//           <section
//             className="
//               mt-2
//               overflow-hidden
//               rounded-xl
//               border
//               border-cream-300
//               bg-cream-50
//               shadow-sm
//               sm:mt-2.5
//               sm:rounded-2xl
//             "
//           >
//             {/* SEARCH */}

//             <div className="p-2 sm:p-2.5">
//               <div className="relative">

//                 <Search
//                   className="
//                     pointer-events-none
//                     absolute
//                     left-3
//                     top-1/2
//                     h-4
//                     w-4
//                     -translate-y-1/2
//                     text-coffee-400
//                   "
//                 />

//                 <input
//                   type="search"
//                   value={productSearch}
//                   onChange={(event) =>
//                     setProductSearch(
//                       event.target.value,
//                     )
//                   }
//                   placeholder={
//                     isAm
//                       ? 'ምርት ይፈልጉ...'
//                       : 'Search products...'
//                   }
//                   className="
//                     h-9
//                     w-full
//                     rounded-lg
//                     border
//                     border-cream-300
//                     bg-cream-100
//                     pl-9
//                     pr-9
//                     text-xs
//                     font-bold
//                     text-coffee-800
//                     outline-none
//                     transition
//                     placeholder:text-coffee-400
//                     focus:border-berbere-400
//                     focus:bg-white
//                     focus:ring-2
//                     focus:ring-berbere-100
//                     sm:h-10
//                     sm:rounded-xl
//                     sm:text-sm
//                   "
//                   aria-label={
//                     isAm
//                       ? 'ምርት ይፈልጉ'
//                       : 'Search products'
//                   }
//                 />

//                 {/* CLEAR SEARCH */}

//                 {productSearch.length > 0 && (
//                   <button
//                     type="button"
//                     onClick={() =>
//                       setProductSearch('')
//                     }
//                     className="
//                       absolute
//                       right-2
//                       top-1/2
//                       flex
//                       h-7
//                       w-7
//                       -translate-y-1/2
//                       items-center
//                       justify-center
//                       rounded-full
//                       text-coffee-400
//                       transition
//                       hover:bg-cream-200
//                       hover:text-coffee-700
//                       active:scale-95
//                     "
//                     aria-label={
//                       isAm
//                         ? 'ፍለጋ አጽዳ'
//                         : 'Clear search'
//                     }
//                   >
//                     <X className="h-3.5 w-3.5" />
//                   </button>
//                 )}
//               </div>

//               {/* SEARCH RESULT */}

//               {productSearch.trim().length > 0 && (
//                 <div
//                   className="
//                     mt-1
//                     px-1
//                     text-[9px]
//                     font-bold
//                     text-coffee-400
//                   "
//                 >
//                   {isAm
//                     ? `${filteredProducts.length} ምርቶች ተገኝተዋል`
//                     : `${filteredProducts.length} product${
//                         filteredProducts.length === 1
//                           ? ''
//                           : 's'
//                       } found`}
//                 </div>
//               )}
//             </div>

//             {/* CATEGORIES */}

//             <div
//               className="
//                 border-t
//                 border-cream-200
//                 px-2
//                 py-1.5
//                 sm:px-2.5
//                 sm:py-2
//               "
//             >
//               <POSCategories
//                 categories={categories}
//                 selectedCategoryId={selectedCategoryId}
//                 onSelectCategory={setSelectedCategoryId}
//                 isAm={isAm}
//               />
//             </div>
//           </section>
//         </div>
//       </div>

//       {/* ======================================================
//           PRODUCT AREA

//           ONLY THE PRODUCT GRID SCROLLS.
//           ====================================================== */}

//       <div
//         className="
//           min-h-0
//           flex-1
//           overflow-hidden
//           px-2
//           pb-2
//           pt-2
//           sm:px-3
//           sm:pb-3
//           sm:pt-2.5
//           lg:px-4
//         "
//       >
//         <div
//           className="
//             mx-auto
//             flex
//             h-full
//             min-h-0
//             w-full
//             max-w-[1600px]
//             flex-col
//           "
//         >
//           {/* PRODUCT HEADER */}

//           <div
//             className="
//               flex
//               shrink-0
//               items-center
//               justify-between
//               px-1
//               pb-1.5
//             "
//           >
//             <div className="min-w-0">
//               <h2
//                 className="
//                   text-xs
//                   font-black
//                   text-coffee-900
//                   sm:text-sm
//                 "
//               >
//                 {isAm
//                   ? 'ምርቶች'
//                   : 'Products'}
//               </h2>

//               <p
//                 className="
//                   text-[9px]
//                   font-semibold
//                   text-coffee-400
//                 "
//               >
//                 {filteredProducts.length}{' '}
//                 {isAm
//                   ? 'ምርቶች'
//                   : filteredProducts.length === 1
//                     ? 'product'
//                     : 'products'}
//               </p>
//             </div>

//             {/* CART COUNT */}

//             {totalCartItems > 0 && (
//               <div
//                 className="
//                   flex
//                   shrink-0
//                   items-center
//                   rounded-full
//                   border
//                   border-berbere-100
//                   bg-berbere-50
//                   px-2
//                   py-1
//                   text-[9px]
//                   font-black
//                   text-berbere-600
//                 "
//               >
//                 {totalCartItems}{' '}
//                 {isAm
//                   ? 'እቃ'
//                   : totalCartItems === 1
//                     ? 'item'
//                     : 'items'}
//               </div>
//             )}
//           </div>

//           {/* ==================================================
//               SCROLLABLE PRODUCT GRID
//               ================================================== */}

//           <div
//             className="
//               min-h-0
//               flex-1
//               overflow-y-auto
//               overscroll-contain
//               pb-1
//               subtle-scrollbar
//             "
//           >
//             <POSProductGrid
//               products={filteredProducts}
//               cartQuantities={cartQuantities}
//               onAddProduct={addToCart}
//               isAm={isAm}
//             />
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
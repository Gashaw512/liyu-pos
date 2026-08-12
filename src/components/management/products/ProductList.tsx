'use client'

import { Trash2, Barcode, AlertTriangle, PackageCheck } from 'lucide-react'

interface InventoryProduct {
  id?: string;
  nameEn: string;
  nameAm: string;
  categoryEn: string;
  categoryAm: string;
  cost: number;
  sell: number;
  opening_count: number;
  category_id: string | null;
  unit_type: string;
  barcode: string;
  sku: string;
  low_stock_alert: number;
  track_inventory: boolean;
}

interface ProductListProps {
  products: InventoryProduct[];
  setProducts: React.Dispatch<React.SetStateAction<InventoryProduct[]>>;
  selectedCategory: string;
  isAm: boolean;
  supabase: any;
}

export function ProductList({ products, setProducts, selectedCategory, isAm, supabase }: ProductListProps) {
  
  const handleUpdateField = (globalIndex: number, key: keyof InventoryProduct, value: any) => {
    setProducts(prev => {
      const copy = [...prev]
      copy[globalIndex] = { ...copy[globalIndex], [key]: value }
      return copy
    })
  }

  const handleRemoveProduct = async (globalIndex: number) => {
    const targetProduct = products[globalIndex]
    if (targetProduct.id) {
      if (!confirm(isAm ? 'ይህን ዕቃ ሙሉ በሙሉ ለማጥፋት እርግጠኛ ነዎት?' : 'Confirm permanent removal of this product template?')) return
      await supabase.from('inventory').delete().eq('product_id', targetProduct.id)
      await supabase.from('products').delete().eq('id', targetProduct.id)
    }
    setProducts(prev => prev.filter((_, idx) => idx !== globalIndex))
  }

  const activeCategoryList = products.filter(p => isAm ? p.categoryAm === selectedCategory : p.categoryEn === selectedCategory)

  if (activeCategoryList.length === 0) {
    return (
      <div className="text-xs text-coffee-400 italic py-8 text-center bg-cream-50/30 rounded-xl border border-dashed border-cream-200">
        {isAm ? 'በዚህ ምድብ ስር ምንም ምርት አልተመዘገበም' : 'No items assigned under this category segment.'}
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
      {products.map((prod, index) => {
        const currentCategoryMatch = isAm ? prod.categoryAm === selectedCategory : prod.categoryEn === selectedCategory;
        if (!currentCategoryMatch) return null;

        const isLowStock = prod.track_inventory && prod.opening_count <= prod.low_stock_alert

        return (
          <div key={index} className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white hover:shadow-sm ${isLowStock ? 'border-red-200 bg-red-50/10' : 'border-cream-100'}`}>
            
            <div className="flex-1 min-w-0 flex items-start gap-2.5">
              <button
                type="button"
                onClick={() => handleRemoveProduct(index)}
                className="text-coffee-300 hover:text-red-600 p-1.5 rounded transition-colors mt-0.5 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex-1 space-y-2 min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] font-bold text-coffee-400 block uppercase">English Name</label>
                    <input
                      type="text"
                      value={prod.nameEn}
                      onChange={(e) => handleUpdateField(index, 'nameEn', e.target.value)}
                      className="font-bold text-xs text-coffee-950 bg-transparent border-b border-cream-100 focus:border-berbere-600 outline-none w-full py-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-coffee-400 block uppercase">የአማርኛ ስም</label>
                    <input
                      type="text"
                      value={prod.nameAm}
                      onChange={(e) => handleUpdateField(index, 'nameAm', e.target.value)}
                      className="font-bold text-xs text-coffee-950 bg-transparent border-b border-cream-100 focus:border-berbere-600 outline-none w-full py-0.5"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px]">
                  <div className="flex items-center gap-1 text-coffee-600">
                    <Barcode className="w-3 h-3 text-coffee-400" />
                    <input
                      type="text"
                      placeholder="Barcode"
                      value={prod.barcode}
                      onChange={(e) => handleUpdateField(index, 'barcode', e.target.value)}
                      className="w-20 bg-transparent border-b border-cream-200 font-medium outline-none text-left"
                    />
                  </div>

                  <div className="flex items-center gap-1 text-coffee-600">
                    <span className="text-[9px] font-black text-coffee-400">SKU:</span>
                    <input
                      type="text"
                      placeholder="SKU Code"
                      value={prod.sku}
                      onChange={(e) => handleUpdateField(index, 'sku', e.target.value)}
                      className="w-16 bg-transparent border-b border-cream-200 font-medium outline-none text-left"
                    />
                  </div>

                  <div className="flex items-center gap-1 text-coffee-600">
                    <span className="text-[9px] font-black text-coffee-400">{isAm ? 'መለኪያ:' : 'Unit:'}</span>
                    <select
                      value={prod.unit_type}
                      onChange={(e) => handleUpdateField(index, 'unit_type', e.target.value)}
                      className="bg-transparent border-b border-cream-200 outline-none font-bold"
                    >
                      <option value="piece">{isAm ? 'ፍሬ (Pcs)' : 'Piece'}</option>
                      <option value="bottle">{isAm ? 'ጠርሙስ' : 'Bottle'}</option>
                      <option value="kg">{isAm ? 'ኪሎ' : 'KG'}</option>
                      <option value="liters">{isAm ? 'ሊትር' : 'Liters'}</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-1 cursor-pointer font-bold text-coffee-500">
                    <input
                      type="checkbox"
                      checked={prod.track_inventory}
                      onChange={(e) => handleUpdateField(index, 'track_inventory', e.target.checked)}
                      className="rounded border-cream-300 text-berbere-600 focus:ring-berbere-500 w-3 h-3"
                    />
                    <span>{isAm ? 'ክምችት ይቆጠር' : 'Track Stock'}</span>
                  </label>
                </div>

                <div className="text-[10px] text-coffee-400 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span>{isAm ? 'መነሻ መግዣ ዋጋ:' : 'Base Cost:'}</span>
                    <input
                      type="number"
                      value={prod.cost || 0}
                      onChange={(e) => handleUpdateField(index, 'cost', Number(e.target.value))}
                      className="w-14 bg-transparent border-b border-cream-200 font-black text-center text-coffee-700 outline-none"
                    />
                    <span>{isAm ? 'ብር' : 'ETB'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="px-2 py-0.5 rounded bg-coffee-100 text-coffee-700 font-black text-[10px] flex items-center gap-1">
                      <PackageCheck className="w-3 h-3 text-coffee-500" />
                      {isAm ? `አሁን ያለው ክምችት: ${prod.opening_count} ${prod.unit_type === 'piece' ? 'ፍሬ' : prod.unit_type}` : `Live Stock: ${prod.opening_count} ${prod.unit_type}`}
                    </span>
                    {isLowStock && (
                      <span className="text-red-600 animate-pulse flex items-center gap-0.5 text-[9px] font-black">
                        <AlertTriangle className="w-3 h-3" />
                        {isAm ? 'አልቋል!' : 'LOW!'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-dashed border-cream-100">
              <div>
                <label className="text-[8px] font-black text-coffee-400 uppercase tracking-wide block md:text-right">Alert Threshold</label>
                <div className="flex items-center gap-1 text-[10px] font-medium text-coffee-500">
                  <span>{isAm ? 'ከ' : 'Min:'}</span>
                  <input
                    type="number"
                    value={prod.low_stock_alert}
                    onChange={(e) => handleUpdateField(index, 'low_stock_alert', Number(e.target.value))}
                    className="w-8 bg-transparent border-b border-cream-200 text-center font-bold text-coffee-800 outline-none"
                  />
                  <span>{isAm ? 'በታች' : 'units'}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-black text-berbere-600 uppercase tracking-wide block">
                  {isAm ? 'መሸጫ ዋጋ' : 'Sell Price'}
                </span>
                <div className="relative flex items-center max-w-[95px] mt-0.5">
                  <input
                    type="number"
                    value={prod.sell || 0}
                    onChange={(e) => handleUpdateField(index, 'sell', Number(e.target.value))}
                    className="w-full text-right pr-6 pl-1.5 py-1 text-xs font-black bg-cream-50 text-coffee-950 rounded border border-cream-200 outline-none focus:border-berbere-600"
                  />
                  <span className="absolute right-1 text-[8px] font-bold text-coffee-400">{isAm ? 'ብር' : 'ETB'}</span>
                </div>
              </div>
            </div>

          </div>
        )
      })}
    </div>
  )
}
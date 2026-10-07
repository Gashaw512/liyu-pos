'use client'

export type PreparationStation = 'kitchen' | 'bar' | 'none'
export type ProductPreparationStation = PreparationStation | ''

type Props = {
  value: ProductPreparationStation
  onChange: (value: ProductPreparationStation) => void
  locale?: string
  allowInherit?: boolean
}

export function PreparationStationSelect({ value, onChange, locale = 'en', allowInherit = false }: Props) {
  const isAm = locale === 'am'
  return (
    <div className="rounded-2xl border bg-white p-4">
      <label htmlFor="preparation-station" className="mb-2 block text-[10px] font-black uppercase text-gray-500">
        {isAm ? 'የዝግጅት ቦታ' : 'Preparation station'}
      </label>
      <select
        id="preparation-station"
        value={value}
        onChange={(event) => onChange(event.target.value as ProductPreparationStation)}
        className="h-12 w-full rounded-xl border bg-gray-50 px-4 text-sm font-bold text-coffee-900 outline-none focus:border-berbere-500 focus:bg-white focus:ring-2 focus:ring-berbere-100"
      >
        {allowInherit && <option value="">{isAm ? 'የምድቡን ቦታ ተጠቀም' : 'Use category default'}</option>}
        <option value="kitchen">{isAm ? 'ኩሽና' : 'Kitchen'}</option>
        <option value="bar">{isAm ? 'ባር' : 'Bar'}</option>
        <option value="none">{isAm ? 'የዝግጅት ትኬት አትላክ' : 'No preparation ticket'}</option>
      </select>
    </div>
  )
}

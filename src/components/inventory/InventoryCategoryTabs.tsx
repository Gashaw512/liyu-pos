'use client'

interface Props {
  categories: string[]
  selected: string
  onSelect: (value: string) => void
  allLabel: string
}

export default function InventoryCategoryTabs({
  categories,
  selected,
  onSelect,
  allLabel,
}: Props) {
  return (
    <div className="w-full overflow-hidden">
      <div
        className="
          flex items-center gap-1.5
          overflow-x-auto
          pb-1
          scrollbar-none
          [-ms-overflow-style:none]
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {categories.map((category) => {
          const active = category === selected

          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelect(category)}
              className={`
                shrink-0
                h-8
                px-3
                rounded-lg
                text-[11px]
                font-semibold
                whitespace-nowrap
                transition-all
                active:scale-95
                ${
                  active
                    ? 'bg-[#8B2635] text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }
              `}
            >
              {category === 'All' ? allLabel : category}
            </button>
          )
        })}
      </div>
    </div>
  )
}
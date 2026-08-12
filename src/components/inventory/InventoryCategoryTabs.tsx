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
    <div
      className="
      flex
      gap-2
      overflow-x-auto
      pb-2
      scrollbar-none
    "
    >
      {categories.map((category) => {
        const active =
          category === selected

        return (
          <button
            key={category}
            onClick={() =>
              onSelect(category)
            }
            className={`
              shrink-0
              px-4
              py-2
              rounded-xl
              text-xs
              font-bold
              transition-all
              ${
                active
                  ? 'bg-[#8B2635] text-white'
                  : 'bg-white border border-slate-200 text-slate-600'
              }
            `}
          >
            {category === 'All'
              ? allLabel
              : category}
          </button>
        )
      })}
    </div>
  )
}
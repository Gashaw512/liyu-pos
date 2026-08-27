'use client'

import {
  LayoutGrid,
  Coffee,
  Utensils,
  Beer,
  CakeSlice,
} from 'lucide-react'

import type { POSCategory } from './types'

interface POSCategoriesProps {
  categories: POSCategory[]
  selectedCategoryId: string
  onSelectCategory: (categoryId: string) => void
  isAm: boolean
}

export default function POSCategories({
  categories,
  selectedCategoryId,
  onSelectCategory,
  isAm,
}: POSCategoriesProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-coffee-400">
          {isAm ? 'የእቃ ምድቦች' : 'Categories'}
        </h2>

        <span className="text-[10px] font-bold text-coffee-400">
          {categories.length}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 subtle-scrollbar">
        <CategoryButton
          active={selectedCategoryId === 'all'}
          onClick={() => onSelectCategory('all')}
          icon={<LayoutGrid className="h-4 w-4" />}
          label={isAm ? 'ሁሉም' : 'All'}
        />

        {categories.map((category, index) => (
          <CategoryButton
            key={category.id}
            active={selectedCategoryId === category.id}
            onClick={() => onSelectCategory(category.id)}
            icon={<CategoryIcon index={index} />}
            label={category.name}
          />
        ))}
      </div>
    </div>
  )
}

function CategoryButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex h-16 min-w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border px-3',
        'font-black transition-all active:scale-95',
        active
          ? 'border-berbere-500 bg-berbere-500 text-white shadow-card'
          : 'border-cream-300 bg-cream-50 text-coffee-600 hover:bg-cream-100',
      ].join(' ')}
    >
      {icon}

      <span className="max-w-[68px] truncate text-[10px]">
        {label}
      </span>
    </button>
  )
}

function CategoryIcon({ index }: { index: number }) {
  const icons = [
    Coffee,
    Utensils,
    Beer,
    CakeSlice,
  ]

  const Icon = icons[index % icons.length]

  return <Icon className="h-4 w-4" />
}
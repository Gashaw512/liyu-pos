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
    <div className="py-0.5">
      <div className="flex gap-1.5 overflow-x-auto py-0.5 subtle-scrollbar">
        <CategoryButton
          active={selectedCategoryId === 'all'}
          label={isAm ? 'ሁሉም' : 'All'}
          icon={<LayoutGrid />}
          onClick={() => onSelectCategory('all')}
        />

        {categories.map((category, index) => (
          <CategoryButton
            key={category.id}
            active={selectedCategoryId === category.id}
            label={category.name}
            icon={<CategoryIcon index={index} />}
            onClick={() => onSelectCategory(category.id)}
          />
        ))}
      </div>
    </div>
  )
}

function CategoryButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex h-11 min-w-[68px] shrink-0 items-center gap-1',
        'justify-center rounded-lg border px-2.5',
        'text-[11px] font-black transition active:scale-[0.97]',
        active
          ? 'border-berbere-500 bg-berbere-500 text-white shadow-card'
          : 'border-cream-300 bg-cream-50 text-coffee-700 hover:border-berbere-300',
      ].join(' ')}
    >
      <span className={active ? 'text-gold-300 [&>svg]:h-3.5 [&>svg]:w-3.5' : 'text-berbere-500 [&>svg]:h-3.5 [&>svg]:w-3.5'}>
        {icon}
      </span>

      <span className="max-w-[72px] truncate">
        {label}
      </span>
    </button>
  )
}

function CategoryIcon({ index }: { index: number }) {
  const icons = [Coffee, Utensils, Beer, CakeSlice]
  const Icon = icons[index % icons.length]

  return <Icon className="h-4 w-4" />
}

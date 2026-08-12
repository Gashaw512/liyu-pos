// InventoryFilters.tsx

interface Props {
  searchQuery: string
  setSearchQuery: (v: string) => void

  categories: string[]
  selectedCategory: string
  setSelectedCategory: (v: string) => void

  t: (
    en: string,
    am: string
  ) => string
}
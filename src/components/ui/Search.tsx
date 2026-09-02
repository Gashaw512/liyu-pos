'use client'

import { Search, X } from 'lucide-react'

interface POSSearchProps {
  value: string
  onChange: (value: string) => void
  resultCount?: number
  showResultCount?: boolean
  isAm: boolean
  placeholder?: string
  ariaLabel?: string
  className?: string
}

export default function POSSearch({
  value,
  onChange,
  resultCount = 0,
  showResultCount = true,
  isAm,
  placeholder,
  ariaLabel,
  className = '',
}: POSSearchProps) {
  const hasSearch = value.trim().length > 0

  return (
    <div className={`p-2.5 sm:p-3 ${className}`}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-400"
          aria-hidden="true"
        />

        <input
          type="search"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={
            placeholder ??
            (isAm
              ? 'ምርት ይፈልጉ...'
              : 'Search products...')
          }
          aria-label={
            ariaLabel ??
            (isAm
              ? 'ምርት ይፈልጉ'
              : 'Search products')
          }
          className="h-10 w-full rounded-xl border border-cream-300 bg-cream-100 pl-10 pr-10 text-sm font-bold text-coffee-800 outline-none transition placeholder:text-coffee-400 focus:border-berbere-400 focus:ring-2 focus:ring-berbere-100 sm:h-11"
        />

        {hasSearch && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-coffee-400 transition hover:bg-cream-200 hover:text-coffee-700"
            aria-label={
              isAm
                ? 'ፍለጋ አጽዳ'
                : 'Clear search'
            }
          >
            <X
              className="h-4 w-4"
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {hasSearch && showResultCount && (
        <div className="mt-1.5 px-1 text-[10px] font-bold text-coffee-400">
          {isAm
            ? `${resultCount} ምርቶች ተገኝተዋል`
            : `${resultCount} product${
                resultCount === 1 ? '' : 's'
              } found`}
        </div>
      )}
    </div>
  )
}
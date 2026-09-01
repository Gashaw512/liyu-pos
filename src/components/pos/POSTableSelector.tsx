
'use client'

import { Table2 } from 'lucide-react'

import type { POSTable } from './types'

interface POSTableSelectorProps {
  tables: POSTable[]
  selectedTable: POSTable | null
  isAm: boolean
  onSelectTable: (table: POSTable) => void
  onWalkIn: () => void
}

export default function POSTableSelector({
  tables,
  selectedTable,
  isAm,
  onSelectTable,
  onWalkIn,
}: POSTableSelectorProps) {
  /**
   * Table order:
   * 1. Currently selected table
   * 2. Tables with saved/open orders
   * 3. Empty tables
   *
   * This keeps active work easy to find without
   * making the selector unnecessarily large.
   */
  const orderedTables = [...tables].sort((a, b) => {
    const aSelected = selectedTable?.id === a.id
    const bSelected = selectedTable?.id === b.id

    if (aSelected !== bSelected) {
      return aSelected ? -1 : 1
    }

    const aOpen = Boolean(a.has_open_tab)
    const bOpen = Boolean(b.has_open_tab)

    if (aOpen !== bOpen) {
      return aOpen ? -1 : 1
    }

    return String(a.name).localeCompare(
      String(b.name),
      undefined,
      { numeric: true },
    )
  })

  return (
    <section className="w-full">
      {/* ============================================================
          COMPACT HEADER
      ============================================================ */}

      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Table2
            className="h-4 w-4 shrink-0 text-berbere-500"
            aria-hidden="true"
          />

          <span className="text-[10px] font-black uppercase tracking-wide text-coffee-600">
            {isAm ? 'ጠረጴዛ' : 'Table'}
          </span>

          <span className="rounded-full bg-cream-200 px-1.5 py-0.5 text-[8px] font-black text-coffee-500">
            {tables.length}
          </span>
        </div>

        {/* Simple explanation of occupied tables */}
        <div
          className="flex items-center gap-1"
          title={
            isAm
              ? 'የተከፈተ ትዕዛዝ ያለው ጠረጴዛ'
              : 'Table with an open order'
          }
        >
          <span
            className="h-1.5 w-1.5 rounded-full bg-warning"
            aria-hidden="true"
          />

          <span className="text-[8px] font-bold text-coffee-400">
            {isAm ? 'ትዕዛዝ አለ' : 'Has order'}
          </span>
        </div>
      </div>

      {/* ============================================================
          TABLES
      ============================================================ */}

      <div
        className="
          flex
          gap-1.5
          overflow-x-auto
          pb-0.5
          subtle-scrollbar

          sm:grid
          sm:grid-cols-6
          sm:overflow-visible

          lg:grid-cols-8
          xl:grid-cols-10
        "
      >
        {/* ==========================================================
            WALK-IN
        ========================================================== */}

        <button
          type="button"
          onClick={onWalkIn}
          aria-pressed={!selectedTable}
          title={
            isAm
              ? 'ቀጥታ ሽያጭ - ጠረጴዛ የለውም'
              : 'Walk-in sale - no table'
          }
          className={[
            `
              relative
              flex
              h-10
              min-w-[78px]
              shrink-0
              items-center
              justify-center
              rounded-lg
              border
              px-2
              text-[10px]
              font-black
              transition-all
              duration-150
              active:scale-[0.97]
              sm:min-w-0
            `,
            !selectedTable
              ? `
                border-berbere-500
                bg-berbere-500
                text-white
                shadow-sm
              `
              : `
                border-cream-300
                bg-white
                text-coffee-700
                hover:border-berbere-300
                hover:bg-cream-50
              `,
          ].join(' ')}
        >
          <span className="truncate">
            {isAm ? 'ቀጥታ ሽያጭ' : 'Walk-In'}
          </span>
        </button>

        {/* ==========================================================
            TABLE BUTTONS
        ========================================================== */}

        {orderedTables.map((table) => {
          const selected =
            selectedTable?.id === table.id

          const open =
            Boolean(table.has_open_tab)

          return (
            <button
              key={table.id}
              type="button"
              onClick={() => onSelectTable(table)}
              aria-pressed={selected}
              aria-label={
                open
                  ? `${table.name} - ${
                      isAm
                        ? 'ትዕዛዝ አለ'
                        : 'has open order'
                    }`
                  : table.name
              }
              title={
                open
                  ? `${table.name} — ${
                      isAm
                        ? 'ትዕዛዝ አለ'
                        : 'Open order'
                    }`
                  : `${table.name} — ${
                      isAm
                        ? 'ባዶ'
                        : 'Empty'
                    }`
              }
              className={[
                `
                  relative
                  flex
                  h-10
                  min-w-[78px]
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  px-2.5
                  text-[11px]
                  font-black
                  transition-all
                  duration-150
                  active:scale-[0.97]
                  sm:min-w-0
                `,
                selected
                  ? `
                    border-gold-400
                    bg-gold-400
                    text-coffee-900
                    shadow-sm
                  `
                  : open
                    ? `
                      border-warning/60
                      bg-warning-bg
                      text-warning
                      hover:brightness-95
                    `
                    : `
                      border-cream-300
                      bg-white
                      text-coffee-700
                      hover:border-berbere-300
                      hover:bg-cream-50
                    `,
              ].join(' ')}
            >
              <span className="truncate">
                {table.name}
              </span>

              {/* ====================================================
                  OPEN ORDER INDICATOR
              ==================================================== */}

              {open && (
                <span
                  className={[
                    `
                      absolute
                      right-1.5
                      top-1.5
                      h-1.5
                      w-1.5
                      rounded-full
                    `,
                    selected
                      ? 'bg-coffee-900'
                      : 'bg-warning',
                  ].join(' ')}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}


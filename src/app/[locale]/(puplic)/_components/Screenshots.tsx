import React from 'react'

type Language = 'en' | 'am'

const copy = {
  en: {
    title: 'See Liyu POS in action',
    description: 'A preview of the everyday work Liyu helps your team manage. Figures shown are examples.',
    sample: 'Illustrative preview · Sample data',
    dashboard: 'Owner dashboard',
    inventory: 'Inventory',
    sales: 'Sales register',
    today: "Today's sales",
    orders: 'Orders',
    attention: 'Needs attention',
    stock: 'Stock on hand',
    product: 'Product',
    quantity: 'Quantity',
    status: 'Status',
    low: 'Low stock',
    available: 'Available',
    search: 'Search products',
    cart: 'Current sale',
    total: 'Total',
    cash: 'Cash',
    demo: 'Demo Cafe',
    todayTag: 'Today',
    items: 'items',
    weeklySales: 'Sales this week',
    sampleLabel: 'Sample',
    productCount: '18 products',
    exampleStock: 'Stock levels shown here are examples.',
  },
  am: {
    title: 'የሊዩ POS በተግባር ይመልከቱ',
    description: 'ሊዩ ለዕለታዊ ሥራዎ የሚያግዝበትን መንገድ ይመልከቱ። የቁጥር ምሳሌዎች ናቸው።',
    sample: 'ምሳሌያዊ ቅድመ እይታ · የሙከራ መረጃ',
    dashboard: 'የባለቤት ዳሽቦርድ',
    inventory: 'የእቃ ክምችት',
    sales: 'የሽያጭ ማስመዝገቢያ',
    today: 'የዛሬ ሽያጭ',
    orders: 'ትዕዛዞች',
    attention: 'ትኩረት የሚፈልግ',
    stock: 'ያለ ክምችት',
    product: 'ምርት',
    quantity: 'ብዛት',
    status: 'ሁኔታ',
    low: 'እያለቀ ነው',
    available: 'ይገኛል',
    search: 'ምርት ይፈልጉ',
    cart: 'የአሁኑ ሽያጭ',
    total: 'ጠቅላላ',
    cash: 'ጥሬ ገንዘብ',
    demo: 'የሙከራ ካፌ',
    todayTag: 'ዛሬ',
    items: 'እቃዎች',
    weeklySales: 'የዚህ ሳምንት ሽያጭ',
    sampleLabel: 'ምሳሌ',
    productCount: '18 ምርቶች',
    exampleStock: 'የክምችት መጠኖች ምሳሌዎች ናቸው።',
  },
} satisfies Record<Language, Record<string, string>>

type CopyKey = keyof typeof copy.en

function PreviewFrame({
  title,
  sample,
  children,
}: {
  title: string
  sample: string
  children: React.ReactNode
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#E8DED8] bg-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3 border-b border-[#EFE8E3] px-4 py-3 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-[#2B1E1A] dark:text-zinc-100">{title}</h3>
        <span className="shrink-0 rounded-full bg-[#F7F1ED] px-2.5 py-1 text-[9px] font-semibold text-[#795B50] dark:bg-zinc-800 dark:text-zinc-300">
          {sample}
        </span>
      </div>
      <div className="min-h-[250px] bg-[#F8F6F4] p-3 sm:min-h-[270px] dark:bg-zinc-950">
        {children}
      </div>
    </article>
  )
}

function DashboardPreview({ t }: { t: (key: CopyKey) => string }) {
  return (
    <div className="space-y-3 rounded-xl border border-[#EAE3DE] bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-medium text-stone-500">{t('demo')}</p>
          <p className="text-xs font-bold text-[#2B1E1A] dark:text-white">{t('today')}</p>
        </div>
        <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{t('todayTag')}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-[#FAF6F3] p-2 dark:bg-zinc-800">
          <p className="text-[8px] text-stone-500">{t('today')}</p>
          <p className="mt-1 text-xs font-bold text-[#2B1E1A] dark:text-white">ETB 8,450</p>
        </div>
        <div className="rounded-lg bg-[#FAF6F3] p-2 dark:bg-zinc-800">
          <p className="text-[8px] text-stone-500">{t('orders')}</p>
          <p className="mt-1 text-xs font-bold text-[#2B1E1A] dark:text-white">24</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/50">
          <p className="text-[8px] text-amber-800 dark:text-amber-300">{t('attention')}</p>
          <p className="mt-1 text-xs font-bold text-amber-900 dark:text-amber-200">3 {t('items')}</p>
        </div>
      </div>
      <div className="rounded-lg border border-[#F0EAE6] p-2.5 dark:border-zinc-800">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9px] font-semibold text-[#4C3932] dark:text-zinc-200">{t('weeklySales')}</span>
          <span className="text-[8px] text-stone-500">{t('sampleLabel')}</span>
        </div>
        <div className="flex h-14 items-end gap-2" aria-label="Illustrative weekly sales chart">
          {[35, 52, 42, 76, 58, 90, 67].map((height, index) => (
            <div key={index} className="flex-1 rounded-t bg-[#8B2635]/75" style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function InventoryPreview({ t }: { t: (key: CopyKey) => string }) {
  const rows = [
    { name: 'Coffee beans', quantity: '12 kg', status: 'available' },
    { name: 'Bottled water', quantity: '8 cases', status: 'low' },
    { name: 'Cooking oil', quantity: '6 L', status: 'available' },
  ] as const

  return (
    <div className="overflow-hidden rounded-xl border border-[#EAE3DE] bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-[#F0EAE6] px-3 py-2.5 dark:border-zinc-800">
        <div>
          <p className="text-[9px] text-stone-500">{t('demo')}</p>
          <p className="text-xs font-bold text-[#2B1E1A] dark:text-white">{t('stock')}</p>
        </div>
        <span className="rounded-md bg-[#F7F1ED] px-2 py-1 text-[9px] font-medium text-[#795B50] dark:bg-zinc-800 dark:text-zinc-300">{t('productCount')}</span>
      </div>
      <div className="flex items-center gap-2 border-b border-[#F0EAE6] px-3 py-2 dark:border-zinc-800">
        <span className="h-2.5 w-2.5 rounded-full border border-stone-400" aria-hidden="true" />
        <span className="text-[9px] text-stone-400">{t('search')}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 bg-[#FAF8F6] px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-stone-500 dark:bg-zinc-800/70">
        <span>{t('product')}</span><span>{t('quantity')}</span><span>{t('status')}</span>
      </div>
      {rows.map((row) => (
        <div key={row.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-t border-[#F4EFEC] px-3 py-2.5 dark:border-zinc-800">
          <span className="text-[10px] font-medium text-[#342621] dark:text-zinc-200">{row.name}</span>
          <span className="text-[9px] text-stone-600 dark:text-zinc-400">{row.quantity}</span>
          <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${row.status === 'low' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
            {t(row.status)}
          </span>
        </div>
      ))}
      <div className="mx-3 my-2 rounded-md bg-[#F8F4F1] px-2.5 py-2 text-[9px] text-[#70584E] dark:bg-zinc-800 dark:text-zinc-300">
        {t('exampleStock')}
      </div>
    </div>
  )
}

function SalesPreview({ t }: { t: (key: CopyKey) => string }) {
  return (
    <div className="grid grid-cols-[1.1fr_0.9fr] gap-2 rounded-xl border border-[#EAE3DE] bg-white p-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-2">
        <div className="rounded-md bg-[#F8F4F1] px-2 py-1.5 text-[8px] text-stone-500 dark:bg-zinc-800">{t('search')}</div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            ['Tibs', 'ETB 420'],
            ['Coffee', 'ETB 65'],
            ['Mineral water', 'ETB 35'],
            ['Fresh juice', 'ETB 120'],
          ].map(([name, price]) => (
            <div key={name} className="rounded-lg border border-[#EFE8E3] p-2 dark:border-zinc-800">
              <div className="mb-2 flex h-7 items-center justify-center rounded bg-[#F8F4F1] text-[9px] font-bold text-[#8B2635] dark:bg-zinc-800">{name.slice(0, 1)}</div>
              <p className="truncate text-[8px] font-semibold text-[#342621] dark:text-zinc-200">{name}</p>
              <p className="text-[8px] text-stone-500">{price}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col rounded-lg bg-[#FAF8F6] p-2 dark:bg-zinc-800/70">
        <p className="mb-2 text-[9px] font-bold text-[#342621] dark:text-zinc-200">{t('cart')}</p>
        <div className="space-y-2 text-[8px] text-stone-600 dark:text-zinc-400">
          <div className="flex justify-between gap-1"><span>1 × Tibs</span><span>420</span></div>
          <div className="flex justify-between gap-1"><span>2 × Coffee</span><span>130</span></div>
          <div className="flex justify-between gap-1"><span>1 × Juice</span><span>120</span></div>
        </div>
        <div className="mt-auto border-t border-[#E9E0DB] pt-2 dark:border-zinc-700">
          <div className="mb-2 flex justify-between text-[8px] font-bold text-[#342621] dark:text-zinc-100"><span>{t('total')}</span><span>ETB 670</span></div>
          <div className="rounded-md bg-[#8B2635] px-2 py-1.5 text-center text-[9px] font-semibold text-white">{t('cash')}</div>
        </div>
      </div>
    </div>
  )
}

export function Screenshots({ lang }: { lang: Language }) {
  const t = (key: keyof typeof copy.en) => copy[lang][key]
  const sample = t('sample')

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-14 text-center antialiased sm:px-6 lg:py-18">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-[#2B1E1A] dark:text-white sm:text-3xl">
          {t('title')}
        </h2>
        <p className="mt-2.5 text-xs font-medium text-coffee-500 dark:text-zinc-400 sm:text-sm">
          {t('description')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 text-left md:grid-cols-3 md:gap-5">
        <PreviewFrame title={t('dashboard')} sample={sample}><DashboardPreview t={t} /></PreviewFrame>
        <PreviewFrame title={t('inventory')} sample={sample}><InventoryPreview t={t} /></PreviewFrame>
        <PreviewFrame title={t('sales')} sample={sample}><SalesPreview t={t} /></PreviewFrame>
      </div>
    </section>
  )
}

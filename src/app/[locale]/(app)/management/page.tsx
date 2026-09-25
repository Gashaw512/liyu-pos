// src/app/[locale]/(app)/management/page.tsx

'use client'

import { useParams } from 'next/navigation'
import ManagementCard from '@/components/management/ManagementCard'

interface ManagementItem {
  title: string
  description: string
  route: string
}

interface ManagementSection {
  title: string
  items: ManagementItem[]
}

export default function ManagementHubPage() {
  const params = useParams()

  const locale = String(params?.locale || 'am')
  const isAm = locale === 'am'

  const sections: ManagementSection[] = [
    {
      title: isAm ? 'ምርቶች እና ዋጋ' : 'Products & Pricing',
      items: [
        {
          title: isAm ? 'ምርቶች' : 'Products',
          description: isAm
            ? 'ምርቶችን ይፍጠሩ እና ያስተዳድሩ'
            : 'Create and manage your products',
          route: `/${locale}/management/products`,
        },
        {
          title: isAm ? 'ምድቦች' : 'Categories',
          description: isAm
            ? 'ምርቶችን በምድብ ያደራጁ'
            : 'Organize products into categories',
          route: `/${locale}/management/categories`,
        },
        {
          title: isAm ? 'የዋጋ ስርዓት' : 'Pricing',
          description: isAm
            ? 'ዋጋዎችን እና የዋጋ ቡድኖችን ያስተዳድሩ'
            : 'Manage prices and pricing groups',
          route: `/${locale}/management/price-groups`,
        },
      ],
    },

    {
      title: isAm ? 'ሰራተኞች እና ፈቃድ' : 'People & Access',
      items: [
        {
          title: isAm ? 'ሰራተኞች' : 'Staff',
          description: isAm
            ? 'የሰራተኞች መረጃን ያስተዳድሩ'
            : 'Manage staff and employee accounts',
          route: `/${locale}/management/staff`,
        },
        {
          title: isAm ? 'ሚናዎች እና ፈቃዶች' : 'Roles & Access',
          description: isAm
            ? 'የተጠቃሚ ሚናዎችን እና ፈቃዶችን ያስተዳድሩ'
            : 'Manage roles and access permissions',
          route: `/${locale}/management/roles`,
        },
        {
          title: isAm ? 'የስራ ፈረቃ' : 'Shifts',
          description: isAm
            ? 'የስራ ፈረቃዎችን ያዘጋጁ እና ይቆጣጠሩ'
            : 'Set up and manage work shifts',
          route: `/${locale}/management/shifts`,
        },
      ],
    },

    {
      title: isAm ? 'የንግድ ቅንብር' : 'Business Setup',
      items: [
        {
          title: isAm ? 'ጠረጴዛዎች' : 'Tables',
          description: isAm
            ? 'የጠረጴዛ እና የመቀመጫ አቀማመጥ'
            : 'Manage tables and seating',
          route: `/${locale}/management/tables`,
        },
        {
          title: isAm ? 'የንግድ መረጃ' : 'Business Profile',
          description: isAm
            ? 'የንግድዎን መረጃ ያስተዳድሩ'
            : 'Manage your business information',
          route: `/${locale}/management/profile`,
        },
        {
          title: isAm ? 'የሪፖርት መልዕክቶች' : 'Shift Report Messages',
          description: isAm
            ? 'የፈረቃ PDF ሪፖርትን በቴሌግራም ያዋቅሩ'
            : 'Configure Telegram shift report delivery',
          route: `/${locale}/management/notifications`,
        },
        {
          title: isAm ? 'ፕሪንተሮች' : 'Printers',
          description: isAm
            ? 'የህትመት እና ፕሪንተር ቅንብሮች'
            : 'Configure printers and printing',
          route: `/${locale}/management/printers`,
        },
      ],
    },

    {
      title: isAm ? 'ስርዓት' : 'System',
      items: [
        {
          title: isAm ? 'ቅንብሮች' : 'Settings',
          description: isAm
            ? 'የስርዓቱን አጠቃላይ ቅንብሮች ያስተዳድሩ'
            : 'Manage general system settings',
          route: `/${locale}/settings`,
        },
        {
          title: isAm ? 'የእንቅስቃሴ መዝገብ' : 'Activity Log',
          description: isAm
            ? 'የስርዓቱን እንቅስቃሴ ይመልከቱ'
            : 'Review system activity and history',
          route: `/${locale}/management/activity-log`,
        },
        {
          title: isAm ? 'ምትኬ እና ማመሳሰል' : 'Backup & Sync',
          description: isAm
            ? 'የውሂብ ምትኬ እና ማመሳሰልን ያስተዳድሩ'
            : 'Manage data backup and synchronization',
          route: `/${locale}/management/backup`,
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen w-full bg-cream-50 pb-24">
      <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-5 sm:py-6 lg:px-6">
        {/* HEADER */}
        <header className="mb-5 sm:mb-7">
          <div className="rounded-2xl border border-cream-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-berbere-50 text-berbere-700">
                <span className="text-sm font-black">M</span>
              </div>

              <div className="min-w-0">
                <h1 className="text-lg font-black tracking-tight text-coffee-900 sm:text-xl">
                  {isAm ? 'አስተዳደር' : 'Management'}
                </h1>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-coffee-500 sm:text-sm">
                  {isAm
                    ? 'የንግድዎን ምርቶች፣ ሰራተኞች እና የስርዓት ቅንብሮች ከዚህ ያስተዳድሩ።'
                    : 'Manage your products, staff, business setup, and system settings.'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* MANAGEMENT SECTIONS */}
        <div className="space-y-5 sm:space-y-6">
          {sections.map((section) => (
            <section key={section.title}>
              {/* SECTION LABEL */}
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className="h-1.5 w-1.5 rounded-full bg-berbere-500" />

                <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-coffee-500 sm:text-[11px]">
                  {section.title}
                </h2>
              </div>

              {/* CARD GROUP */}
              <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm">
                {section.items.map((item, index) => (
                  <div key={item.route}>
                    <ManagementCard
                      title={item.title}
                      description={item.description}
                      route={item.route}
                    />

                    {index < section.items.length - 1 && (
                      <div className="mx-4 border-b border-cream-100" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

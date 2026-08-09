'use client'

import { useParams } from 'next/navigation'
import ManagementCard from '@/components/management/ManagementCard'

export default function ManagementHubPage() {
  const params = useParams()
  const locale = String(params?.locale || 'am')
  const isAm = locale === 'am'

  const sections = [
    {
      title: isAm ? 'Menu & Products' : 'Menu & Products',
      items: [
        {
          title: isAm ? 'ምርቶች' : 'Products',
          description: isAm ? 'ምርቶችን ማስተዳደር' : 'Create and manage products',
          route: `/${locale}/management/products`,
        },
        {
          title: isAm ? 'ምድቦች' : 'Categories',
          description: isAm ? 'የምርት ምድቦች' : 'Organize product categories',
          route: `/${locale}/management/categories`,
        },
        {
          title: isAm ? 'ዋጋ ስርዓት' : 'Pricing',
          description: isAm ? 'የዋጋ እና ቦኖ ስርዓት' : 'Manage pricing system',
          route: `/${locale}/management/price-groups`,
        },
      ],
    },

    {
      title: isAm ? 'Staff & Access' : 'Staff & Access',
      items: [
        {
          title: isAm ? 'ሰራተኞች' : 'Staff',
          description: isAm ? 'ሰራተኞችን ማስተዳደር' : 'Manage employees',
          route: `/${locale}/management/staff`,
        },
        {
          title: isAm ? 'ፈቃዶች' : 'Roles',
          description: isAm ? 'የተጠቃሚ ፈቃዶች' : 'Access control',
          route: `/${locale}/management/roles`,
        },
        {
          title: isAm ? 'ፈረቃ' : 'Shifts',
          description: isAm ? 'የስራ ፈረቃ' : 'Shift scheduling',
          route: `/${locale}/management/shifts`,
        },
      ],
    },

    {
      title: isAm ? 'Restaurant' : 'Restaurant',
      items: [
        {
          title: isAm ? 'ጠረጴዛዎች' : 'Tables',
          description: isAm ? 'የጠረጴዛ አስተዳደር' : 'Table management',
          route: `/${locale}/management/tables`,
        },
        {
          title: isAm ? 'መረጃ' : 'Profile',
          description: isAm ? 'የንግድ መረጃ' : 'Business profile',
          route: `/${locale}/management/profile`,
        },
        {
          title: isAm ? 'ፕሪንተሮች' : 'Printers',
          description: isAm ? 'የህትመት ስርዓት' : 'Print configuration',
          route: `/${locale}/management/printers`,
        },
      ],
    },

    {
      title: isAm ? 'System' : 'System',
      items: [
        {
          title: isAm ? 'ቅንብሮች' : 'Settings',
          description: isAm ? 'የስርዓት ቅንብሮች' : 'System settings',
          route: `/${locale}/settings`,
        },
        {
          title: isAm ? 'መዝገብ' : 'Activity',
          description: isAm ? 'የእንቅስቃሴ መዝገብ' : 'Audit log history',
          route: `/${locale}/management/activity-log`,
        },
        {
          title: isAm ? 'Backup' : 'Backup',
          description: isAm ? 'ዳታ ጥበቃ እና ማመሳሰል' : 'Data backup & sync',
          route: `/${locale}/management/backup`,
        },
      ],
    },
  ]

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-cream-50 pb-24">

      {/* HEADER (HUMAN + CLEAN) */}
      <div className="sticky top-0 z-10 bg-cream-50/95 backdrop-blur border-b border-cream-200">

        <div className="px-4 py-4">

          <h1 className="text-xl font-black text-coffee-900 tracking-tight">
            {isAm ? 'የንግድ ማዕከል' : 'Business Hub'}
          </h1>

          <p className="text-[11px] font-bold text-coffee-400 uppercase tracking-wider mt-1">
            {isAm
              ? 'ሁሉንም የንግድ ስራ በአንድ ቦታ ያስተዳድሩ'
              : 'Manage your entire business from one place'}
          </p>

        </div>

      </div>

      {/* CONTENT */}
      <div className="space-y-6 px-4 py-4">

        {sections.map((section) => (
          <section key={section.title} className="space-y-2">

            {/* SECTION TITLE (CLEAN SYSTEM STYLE) */}
            <h2 className="text-[10px] font-black uppercase tracking-widest text-berbere-600 px-1">
              {section.title}
            </h2>

            {/* CARD GROUP */}
            <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">

              {section.items.map((item, idx) => (
                <div key={item.route}>

                  <ManagementCard
                    title={item.title}
                    description={item.description}
                    route={item.route}
                  />

                  {idx < section.items.length - 1 && (
                    <div className="border-b border-cream-100 mx-4" />
                  )}

                </div>
              ))}

            </div>

          </section>
        ))}

      </div>
    </div>
  )
}
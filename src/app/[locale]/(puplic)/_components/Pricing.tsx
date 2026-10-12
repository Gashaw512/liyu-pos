'use client'

import { CheckCircle } from 'lucide-react'
import { PlanInquiryAction } from '@/components/public/PlanInquiryAction'
import type { PublicInquiryPlanId } from '@/lib/public-inquiry'

const PLANS = (lang: 'en' | 'am') => [
  {
    id: 'demo',
    name: lang === 'en' ? 'Product demo' : 'የምርት ማሳያ',
    price: '0',
    period: lang === 'en' ? 'sample-data walkthrough' : 'የሙከራ መረጃ ማብራሪያ',
    desc: lang === 'en' ? 'A guided introduction to the current product.' : 'ስለአሁኑ ምርት በመመራት የሚሰጥ ማብራሪያ።',
    scope: lang === 'en' ? 'Uses sample data; no business records or payment required.' : 'የሙከራ መረጃ ብቻ ይጠቀማል፤ የንግድ መዝገብ ወይም ክፍያ አያስፈልግም።',
    highlight: false,
  },
  {
    id: 'starter',
    name: lang === 'en' ? 'Starter' : 'ጀማሪ',
    price: '499',
    period: lang === 'en' ? 'per outlet / month' : 'ለአንድ የንግድ ቦታ / በወር',
    desc: lang === 'en' ? 'For one cafe, bar, or restaurant beginning with digital sales and stock records.' : 'ዲጂታል ሽያጭና የክምችት መዝገብ ለሚጀምር አንድ ካፌ፣ ባር ወይም ሬስቶራንት።',
    scope: lang === 'en' ? 'Proposed monthly fee per outlet. Staff access, setup, support, taxes, and pilot terms are agreed in writing.' : 'በወር ለአንድ የንግድ ቦታ የታሰበ ክፍያ ነው። የሰራተኛ መዳረሻ፣ ማዋቀር፣ ድጋፍ፣ ግብርና የሙከራ ውሎች በጽሁፍ ይስማማሉ።',
    highlight: false,
  },
  {
    id: 'professional',
    name: lang === 'en' ? 'Professional' : 'ፕሮፌሽናል',
    price: '999',
    period: lang === 'en' ? 'per outlet / month' : 'ለአንድ የንግድ ቦታ / በወር',
    desc: lang === 'en' ? 'For one location using table orders, shifts, and configured Kitchen or Bar tickets.' : 'የጠረጴዛ ትዕዛዝ፣ ሺፍትና የኩሽና ወይም ባር ትዕዛዝ ለሚጠቀም አንድ ቦታ።',
    scope: lang === 'en' ? 'Proposed monthly fee per outlet. Features, staff access, setup, support, taxes, and pilot terms are agreed in writing.' : 'በወር ለአንድ የንግድ ቦታ የታሰበ ክፍያ ነው። ባህሪያት፣ የሰራተኛ መዳረሻ፣ ማዋቀር፣ ድጋፍ፣ ግብርና የሙከራ ውሎች በጽሁፍ ይስማማሉ።',
    highlight: true,
  },
  {
    id: 'business',
    name: lang === 'en' ? 'Business' : 'ቢዝነስ',
    price: '2,499',
    period: lang === 'en' ? 'per month' : 'በወር',
    desc: lang === 'en' ? 'A proposed option for operators managing more than one outlet.' : 'ከአንድ በላይ የንግድ ቦታ ለሚያስተዳድሩ የታሰበ አማራጭ።',
    scope: lang === 'en' ? 'Proposed monthly fee. The number of outlets, included services, setup, support, and taxes must be agreed in writing.' : 'በወር የታሰበ ክፍያ ነው። የቦታዎች ብዛት፣ የሚካተቱ አገልግሎቶች፣ ማዋቀር፣ ድጋፍና ግብር በጽሁፍ መስማማት አለባቸው።',
    highlight: false,
  },
  {
    id: 'enterprise',
    name: lang === 'en' ? 'Enterprise' : 'ኢንተርፕራይዝ',
    price: lang === 'en' ? 'From ETB 7,500' : 'ከ 7,500 ብር ጀምሮ',
    period: lang === 'en' ? 'per month' : 'በወር',
    desc: lang === 'en' ? 'For larger teams with specific onboarding or support needs.' : 'ልዩ የማስጀመር ወይም የድጋፍ ፍላጎት ላላቸው ትላልቅ ቡድኖች።',
    scope: lang === 'en' ? 'Custom monthly quote. Outlet coverage, setup, support, taxes, and service terms are agreed individually.' : 'በወር የተለየ ዋጋ ይቀርባል። የቦታ ሽፋን፣ ማዋቀር፣ ድጋፍ፣ ግብርና የአገልግሎት ውሎች በተናጠል ይስማማሉ።',
    highlight: false,
  },
]

export function Pricing({ lang }: { lang: 'en' | 'am' }) {
  const plans = PLANS(lang)
  return (
    <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 antialiased">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#2B1E1A] dark:text-white tracking-tight">
          {lang === 'en' ? 'Plans for discussion' : 'ለውይይት የቀረቡ እቅዶች'}
        </h2>
        <p className="text-coffee-500 dark:text-zinc-400 mt-3 text-sm font-medium">
          {lang === 'en' ? 'We are inviting a small number of Addis businesses to discuss a guided pilot. Any price and scope will be agreed before it begins.' : 'በአዲስ አበባ ያሉ ጥቂት ንግዶችን በመመራት ለሚካሄድ ሙከራ ውይይት እየጋበዝን ነው። ዋጋና ወሰን ሙከራው ከመጀመሩ በፊት ይስማማሉ።'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative transition-shadow duration-200
              ${plan.highlight
                ? 'bg-white dark:bg-zinc-900 border-2 border-[#8B2635] shadow-lg'
                : 'bg-white dark:bg-zinc-900 border border-coffee-700/10 dark:border-white/10 shadow-sm hover:shadow-md'
              }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#8B2635] text-white
                              text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                {lang === 'en' ? 'Suggested' : 'የተጠቆመ'}
              </div>
            )}

            <div>
              <h3 className="font-serif font-bold text-xl text-[#2B1E1A] dark:text-white">{plan.name}</h3>
              <p className="text-xs text-coffee-500 dark:text-zinc-400 mt-2 font-medium leading-relaxed">{plan.desc}</p>

              <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-coffee-700/5 dark:border-white/5 pb-4">
                <span className="text-3xl font-serif font-bold text-[#2B1E1A] dark:text-white tracking-tight">
                  {plan.price === '0' ? (lang === 'en' ? 'No charge' : 'ክፍያ የለም') : plan.price}
                </span>
                <span className="text-xs font-semibold text-coffee-400 dark:text-zinc-500">{plan.period}</span>
              </div>

              <div className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-coffee-500 dark:text-zinc-300">
                <CheckCircle className={`w-4 h-4 shrink-0 ${plan.highlight ? 'text-[#8B2635]' : 'text-amber-500'}`} />
                <span>{plan.scope}</span>
              </div>
            </div>

            <PlanInquiryAction
              planId={plan.id as PublicInquiryPlanId}
              planName={plan.name}
              price={plan.price === '0' ? (lang === 'en' ? 'No charge for the sample-data demo' : 'የሙከራ መረጃ ማሳያ ክፍያ የለውም') : `ETB ${plan.price} ${plan.period}`}
              lang={lang}
              className={`block text-center py-3 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-colors duration-200
                ${plan.highlight
                  ? 'bg-[#8B2635] hover:bg-[#8B2635]/90 text-white shadow-md'
                  : 'border border-coffee-700/15 dark:border-white/20 hover:bg-[#F7F4EB]/50 dark:hover:bg-zinc-800 text-[#2B1E1A] dark:text-white'
                }`}
            />
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] sm:text-xs text-coffee-400 dark:text-zinc-500 mt-8 font-medium leading-relaxed max-w-3xl mx-auto">
        {lang === 'en'
          ? 'Prices are proposals for discussion, not active subscriptions. Online subscription payments and plan limits are not available yet. Pilot terms, support, and any fee are confirmed in writing.'
          : 'ዋጋዎቹ ለውይይት የቀረቡ ናቸው፤ አሁን የሚሰሩ የደንበኝነት እቅዶች አይደሉም። የመስመር ላይ የደንበኝነት ክፍያና የእቅድ ገደብ ገና አልተዘጋጁም። የሙከራ ውሎች፣ ድጋፍና ክፍያ ካለ በጽሁፍ ይስማማሉ።'}
      </p>
    </section>
  )
}

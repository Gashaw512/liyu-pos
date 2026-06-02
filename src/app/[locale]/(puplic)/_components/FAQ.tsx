'use client'

interface Props { lang: 'en' | 'am' }

export function FAQ({ lang }: Props) {
  const isEn = lang === 'en'

  const faqs = [
    {
      q: isEn ? "Does it really work 100% offline?" : "በእርግጥ ኢንተርኔት በሌለበት ሙሉ በሙሉ ይሰራል?",
      a: isEn ? "Yes. Sales processing, ticket printing, and credit logging run locally on your hardware device storage entirely without drops." : "አዎ። ሽያጭ መመዝገብ፣ ደረሰኝ ማተም እና የዕዳ መዝገቦች ያለ ምንም የኢንተርኔት ግንኙነት በአገር ውስጥ ስልክዎ ላይ ይሰራሉ።"
    },
    {
      q: isEn ? "Can I track payments via Telebirr & CBE Birr?" : "በቴሌብር እና በሲቢኢ ብር (CBE Birr) የተደረጉ ክፍያዎችን መለየት ይቻላል?",
      a: isEn ? "Yes, you can isolate and categorize multi-option payment split modes natively for daily balancing clean operations." : "አዎ። የየቀኑን የሂሳብ ሚዛን በቀላሉ ለማረጋገጥ ሽያጮችን በጥሬ ገንዘብ፣ በቴሌብር ወይም በባንክ በየራሳቸው መለያ መመዝገብ ይችላሉ።"
    }
  ]

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-8">
      <h2 className="text-2xl sm:text-3xl font-serif font-bold text-center text-coffee-700">
        {isEn ? "Frequently Asked Questions" : "ተደጋግመው የሚጠየቁ ጥያቄዎች"}
      </h2>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-coffee-700/5">
            <h4 className="font-bold text-sm sm:text-base text-coffee-700">{faq.q}</h4>
            <p className="text-xs sm:text-sm text-coffee-500 mt-2 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
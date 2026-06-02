'use client'

import { BookOpen } from 'lucide-react'

export function CreditNotebook({ lang }: { lang: 'en' | 'am' }) {
  const isEn = lang === 'en'

  const mockDebts = [
    { name: "Abebe Chala", amount: "2,500 ETB", date: "2 days ago", active: true },
    { name: "Marta Hagos", amount: "1,300 ETB", date: "Yesterday", active: true },
    { name: "Ustaz Kedir", amount: "700 ETB", date: "Settled", active: false }
  ]

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Visual Mock of Traditional vs Digital Debtera */}
        <div className="order-2 lg:order-1 bg-white p-5 rounded-3xl border border-coffee-700/10 shadow-sm max-w-sm mx-auto w-full">
          <div className="flex items-center justify-between border-b border-coffee-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-berbere-500" />
              <span className="text-xs font-bold font-serif text-coffee-700">
                {isEn ? "Digital Credit Ledger (የብድር ደብተር)" : "ዲጂታል የዕዳ መቆጣጠሪያ"}
              </span>
            </div>
            <span className="text-[10px] text-coffee-300 font-medium">Live Balance</span>
          </div>

          <div className="space-y-2">
            {mockDebts.map((debt, idx) => (
              <div key={idx} className="flex items-center justify-between bg-cream-50 p-3 rounded-xl border border-coffee-700/5">
                <div>
                  <div className="text-xs font-bold text-coffee-700">{debt.name}</div>
                  <div className="text-[10px] text-coffee-300">{debt.date}</div>
                </div>
                <div className={`text-xs font-mono font-bold ${debt.active ? 'text-berbere-500' : 'text-success/80 line-through'}`}>
                  {debt.amount}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Value Text Copy */}
        <div className="order-1 lg:order-2">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-coffee-700">
            {isEn ? "Replace The Traditional Paper Credit Notebook" : "የድሮውን የወረቀት የብድር ደብተር በዲጂታል ይተኩ"}
          </h2>
          <p className="text-coffee-500 text-sm sm:text-base mt-4 leading-relaxed">
            {isEn 
              ? "Stop losing revenue to forgotten hand-written tracking lists. Store customer tabs securely profile-by-profile. Instantly know who owes money, your total business exposure, liability caps, and track payments seamlessly from cash or digital transfers directly inside their ledger histories."
              : "በወረቀት ላይ ተጽፈው የሚረሱ የደንበኛ እዳዎችን ያስቀሩ። ማን ምን ያህል እዳ እንዳለበት፣ መቼ እንደወሰደ እና ጠቅላላ ያለብዎትን የዱቤ መጠን በአንድ ቦታ በጥራት ይቆጣጠሩ።"}
          </p>
        </div>
      </div>
    </section>
  )
}
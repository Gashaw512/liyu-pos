'use client'

import React from 'react'
import { XCircle, CheckCircle2 } from 'lucide-react'

interface Props { lang: 'en' | 'am' }

export function Problems({ lang }: Props) {
  const isEn = lang === 'en'

  const content = {
    title: isEn ? "Still Tracking Your Business in a Paper Notebook?" : "እስካሁን በደብተር እና በእጅ ማስተካከያ ይደክማሉ?",
    sub: isEn ? "Manual ledgers hide massive losses. Switch to a digital framework built for real shifts." : "በወረቀት መስራት ያልታወቀ ዕለታዊ ኪሳራ ያስከትላል። አሰራርዎን ዛሬ ያዘምኑ።",
    badTitle: isEn ? "The Manual Headache" : "የቀድሞው አሰልቺ አሰራር",
    goodTitle: isEn ? "The Liyu POS Way" : "በሊዩ POS ሲቀየር",
    bad: [
      isEn ? "Missing crates & bottles with unknown Birr value" : "የሚጠፉ ጠርሙሶችና እቃዎች የብር መጠናቸው አይታወቅም",
      isEn ? "Hours spent on midnight manual shift calculations" : "ማታ ማታ ሂሳብ ለመያዝና ለመቁጠር የሚባክን ሰዓት",
      isEn ? "Forgotten customer debts (የደንበኛ ዕዳ)" : "የሚረሱና የሚቀሩ የደንበኞች የብድር ዕዳዎች",
      isEn ? "Sales grind to a halt the moment internet drops" : "ኢንተርኔት ሲቋረጥ የሽያጭ መዝገብ መቆም"
    ],
    good: [
      isEn ? "Instant stock variance and missing bottle tracking" : "የጎደሉ ዕቃዎች ዋጋ ወዲያውኑ በብር ተሰልቶ ይታያል",
      isEn ? "Automated profit calculation — zero calculation needed" : "ትርፍና ወጪን መተግበሪያው ራሱ በሰከንድ ያሰላል",
      isEn ? "Digital credit tracking with automatic payment alerts" : "የዕዳ መቆጣጠሪያ ማስታወሻ ከዲጂታል መዝገብ ጋር",
      isEn ? "100% offline functionality — never stops working" : "ያለ ኢንተርኔት ሙሉ በሙሉ ያለ ማቋረጥ ይሰራል"
    ]
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 bg-white rounded-3xl my-6 border border-coffee-700/5">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">{content.title}</h2>
        <p className="text-coffee-500 text-sm sm:text-base mt-2">{content.sub}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* The Bad Way */}
        <div className="bg-coffee-50 rounded-2xl p-6 border border-coffee-100">
          <h3 className="text-danger font-bold text-base mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 shrink-0" /> {content.badTitle}
          </h3>
          <ul className="space-y-3">
            {content.bad.map((item, i) => (
              <li key={i} className="text-coffee-500 text-sm flex items-start gap-2">
                <span className="text-danger mt-1 font-bold">·</span> {item}
              </li>
            ))}
          </ul>
        </div>

        {/* The Liyu Way */}
        <div className="bg-berbere-50/40 rounded-2xl p-6 border border-berbere-100">
          <h3 className="text-berbere-500 font-bold text-base mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" /> {content.goodTitle}
          </h3>
          <ul className="space-y-3">
            {content.good.map((item, i) => (
              <li key={i} className="text-coffee-700 font-medium text-sm flex items-start gap-2">
                <span className="text-success mt-1 font-bold">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
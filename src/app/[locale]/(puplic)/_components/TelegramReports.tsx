'use client'

import React from 'react'
import { Send } from 'lucide-react'

export function TelegramReports({ lang }: { lang: 'en' | 'am' }) {
  const isEn = lang === 'en'

  return (
    <section className="bg-sky-500/5 dark:bg-sky-500/5 border-y border-sky-500/10 py-16 lg:py-20 antialiased">
      {/* ─── Pure Horizontal Flex Layout System ────────────────────── */}
      {/* Converted grid to flex-row and flex-wrap for horizontal orientation across responsive break points */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-row flex-wrap items-center justify-between gap-12 w-full">
        
        {/* Copy Deck Block */}
        <div className="space-y-4 flex-1 min-w-[280px] max-w-full lg:max-w-[calc(60%-24px)]">
          <div className="inline-flex items-center gap-1.5 bg-[#179cde]/10 text-[#179cde] rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
            <Send className="w-3.5 h-3.5" />
            {isEn ? "Remote Ownership Engine" : "ርቀት ላይ ሆነው ይቆጣጠሩ"}
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2B1E1A] dark:text-white tracking-tight leading-[1.2]">
            {isEn ? "Get End-of-Shift Reports Directly on Telegram" : "የፈረቃ ማጠቃለያዎችን በቀጥታ በቴሌግራም ያግኙ"}
          </h2>
          <p className="text-coffee-500 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed font-medium">
            {isEn 
              ? "You don't need to be physically standing at your shop floor to watch operations. The exact instant a cashier closes a register session, a comprehensive audit summary drops into your messaging feed. Monitor real-time growth curves from anywhere."
              : "ሪፖርት ለማየት ሁልጊዜ ሱቅ ወይም ካፌ መገኘት የለብዎትም። ሰራተኛዎ ፈረቃ በዘጋ ቁጥር የዕለቱ ጠቅላላ ሽያጭ፣ ትርፍ እና የክፍያ ሁኔታዎች በቴሌግራምዎ ላይ ፈጣን መልዕክት ይደርስዎታል።"}
          </p>
        </div>

        {/* Telegram Responsive Chat Simulation Container */}
        <div className="flex-1 min-w-[280px] max-w-full lg:max-w-[calc(40%-24px)] flex justify-center">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-coffee-700/10 dark:border-white/10 overflow-hidden max-w-xs w-full shadow-md">
            {/* Mock App Header */}
            <div className="bg-[#179cde] p-3.5 flex items-center gap-3 text-white">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">L</div>
              <div>
                <div className="text-xs font-bold tracking-tight">Liyu POS Framework</div>
                <div className="text-[10px] text-white/70 font-medium">bot • active now</div>
              </div>
            </div>
            
            {/* Mock Chat Feed Canvas */}
            <div className="p-4 bg-[#f4f4f5] dark:bg-zinc-950 min-h-[190px] space-y-3 font-mono text-[11px] text-[#2B1E1A] dark:text-zinc-300">
              <div className="bg-white dark:bg-zinc-800 p-3.5 rounded-2xl rounded-tl-none border border-coffee-700/5 dark:border-white/5 shadow-sm max-w-[90%] space-y-2">
                <div className="font-bold text-[#8B2635] dark:text-rose-400 border-b border-coffee-700/5 dark:border-white/5 pb-1 mb-1.5 text-xs">
                  📊 {isEn ? "SHIFT AUDIT LOG" : "የፈረቃ ማጠቃለያ ሪፖርት"}
                </div>
                <div className="space-y-1 text-[11px] font-medium">
                  <div><strong>{isEn ? "Node" : "ቅርንጫፍ"}:</strong> Flamingo Bar, Bole</div>
                  <div><strong>{isEn ? "Gross Sales" : "ጠቅላላ ሽያጭ"}:</strong> 15,200 ETB</div>
                  <div className="pl-2 text-coffee-400 dark:text-zinc-500">• Cash: 8,300 ETB</div>
                  <div className="pl-2 text-coffee-400 dark:text-zinc-500">• Telebirr: 4,200 ETB</div>
                  <div className="pl-2 text-coffee-400 dark:text-zinc-500">• CBE Birr: 2,700 ETB</div>
                  <div className="text-emerald-600 dark:text-emerald-400 pt-1 font-bold">
                    <strong>{isEn ? "Net Profit" : "የተጣራ ትርፍ"}:</strong> +5,400 ETB
                  </div>
                </div>
              </div>
              <div className="text-[9px] text-coffee-300 dark:text-zinc-600 text-right pr-2">10:02 PM</div>
            </div>
          </div>
        </div>
        
      </div>
    </section>
  )
}
'use client'

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";
  const isAm = locale === "am";

  // Simple, clean mock data for context simulation
  const businessName = "Liyu Bakery & Cafe";
  const currentOperator = { name: "Abraham Kassa", role: "Manager" };

  // 🛠️ Simple actionable list matching system architecture requirements
  const menuGroups = [
    {
      title: isAm ? "የመደብር መዋቅር" : "Business Configuration",
      items: [
        { name: isAm ? "የንግድ መገለጫ" : "Business Profile", desc: isAm ? "ስም፣ አድራሻ እና ስልክ ቁጥር" : "Manage name, tax details, and branding", icon: "🏢", href: `/${locale}/settings/profile` },
        { name: isAm ? "የማተሚያ ማሽን (Printer)" : "Receipt Printer Settings", desc: isAm ? "የደረሰኝ ማተሚያ እና ብሉቱዝ" : "Setup Bluetooth/Network thermal printers", icon: "🖨️", href: `/${locale}/settings/printer` },
        { name: isAm ? "ግብር እና ቅናሾች" : "Taxes & Discounts", desc: isAm ? "ተጨማሪ እሴት ታክስ (VAT) እና ማስተዋወቂያዎች" : "Configure VAT (15%), Service charges, and discounts", icon: "🏷️", href: `/${locale}/settings/taxes` },
      ]
    },
    {
      title: isAm ? "የደህንነት ቁጥጥር" : "Account & Security",
      items: [
        { name: isAm ? "ቋንቋ መቀየሪያ" : "Switch Language", desc: isAm ? "ወደ አማርኛ / English ይቀይሩ" : "Toggle system interface language", icon: "🌐", href: locale === "am" ? "/en/settings" : "/am/settings", isLanguageToggle: true },
        { name: isAm ? "የይለፍ ቃል" : "Change Passcode", desc: isAm ? "ደህንነቱ የተጠበቀ መግቢያ ኮድ" : "Update your 4-digit quick terminal PIN", icon: "🔐", href: `/${locale}/settings/security` },
      ]
    }
  ];

  const handleLogout = () => {
    // Elegant, simple redirection mechanism for session ending
    router.push(`/${locale}/auth/login` as any);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12 animate-fadeIn">
      
      {/* 👑 Professional Minimal Header */}
      <div className="bg-white rounded-2xl p-5 border border-cream-200/60 shadow-[0_2px_8px_rgba(43,30,26,0.02)]">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 rounded-xl bg-berbere-50 flex items-center justify-center text-2xl border border-berbere-100">
            🏬
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-coffee-900 tracking-tight">{businessName}</h1>
            <p className="text-xs text-coffee-400 font-medium mt-0.5">
              {isAm ? "ኦፕሬተር" : "Active Operator"}: <span className="text-coffee-600 font-bold">{currentOperator.name}</span> ({currentOperator.role})
            </p>
          </div>
        </div>
      </div>

      {/* 🚀 Organized Navigation Grid Lists */}
      <div className="space-y-6">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-coffee-400 px-1">
              {group.title}
            </h3>
            
            <div className="bg-white rounded-2xl border border-cream-200/60 shadow-[0_2px_8px_rgba(43,30,26,0.02)] overflow-hidden divide-y divide-cream-100">
              {group.items.map((item, itemIdx) => (
                <Link
                  key={itemIdx}
                  href={item.href as any}
                  className="flex items-center space-x-4 p-4 hover:bg-cream-50/40 active:bg-cream-50 transition-colors duration-150 group"
                  onClick={(e) => {
                    if (item.isLanguageToggle) {
                      e.preventDefault();
                      router.replace(item.href as any);
                    }
                  }}
                >
                  <span className="text-2xl shrink-0 p-2 bg-cream-50 rounded-xl group-hover:scale-105 transition-transform duration-150">
                    {item.icon}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-coffee-800 tracking-tight group-hover:text-berbere-600 transition-colors duration-150">
                      {item.name}
                    </p>
                    <p className="text-xs text-coffee-400 truncate mt-0.5">
                      {item.desc}
                    </p>
                  </div>

                  {/* Clean Navigation Chevron Indicator */}
                  <span className="text-coffee-300 text-sm font-bold transition-transform duration-150 group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 🚪 System Sign Out Section */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="w-full h-12 bg-white hover:bg-berbere-50 text-berbere-600 active:bg-berbere-100 rounded-xl font-bold text-sm border border-berbere-200/60 transition-all duration-150 flex items-center justify-center space-x-2 shadow-sm"
        >
          <span>👋</span>
          <span>{isAm ? "ከሲስተሙ ውጣ (Logout)" : "Sign Out of Terminal"}</span>
        </button>
      </div>

    </div>
  );
}
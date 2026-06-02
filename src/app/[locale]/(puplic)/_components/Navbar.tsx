'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Globe, Menu, X, LogIn } from 'lucide-react'

interface NavbarProps {
  lang: 'en' | 'am'
  setLang: React.Dispatch<React.SetStateAction<'en' | 'am'>>
}

export function Navbar({ lang, setLang }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <nav 
      className={`sticky top-0 z-50 w-full transition-all duration-300 border-b ${
        scrolled 
          ? 'border-coffee-500/10 bg-cream-100/95 backdrop-blur-md shadow-card' 
          : 'border-transparent bg-cream-100/80 backdrop-blur-sm'
      }`}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo Group */}
          <div className="flex items-center shrink-0">
            <Link href="/" className="flex items-center gap-2 group select-none outline-none">
              <span className="text-xl sm:text-2xl font-bold font-sans text-berbere-500 tracking-tight">
                ሊዩ <span className="text-gold-400 font-display italic">POS</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden min-[768px]:flex items-center justify-center gap-2 text-[14px] font-medium text-coffee-500">
            <a href="#features" className="hover:text-berbere-500 rounded-lg px-3 py-2 transition-colors duration-200">
              {lang === 'en' ? 'Features' : 'ባህሪያት'}
            </a>
            <a href="#segments" className="hover:text-berbere-500 rounded-lg px-3 py-2 transition-colors duration-200">
              {lang === 'en' ? 'Industries' : 'የንግድ ዓይነቶች'}
            </a>
            <a href="#pricing" className="hover:text-berbere-500 rounded-lg px-3 py-2 transition-colors duration-200">
              {lang === 'en' ? 'Pricing' : 'ዋጋ'}
            </a>
            <a href="#faq" className="hover:text-berbere-500 rounded-lg px-3 py-2 transition-colors duration-200">
              {lang === 'en' ? 'FAQ' : 'ጥያቄዎች'}
            </a>
          </div>

          {/* Desktop Actions Section Center */}
          <div className="hidden min-[768px]:flex items-center gap-4 shrink-0">
            {/* Language Selector */}
            <button
              onClick={() => setLang((prev) => (prev === 'en' ? 'am' : 'en'))}
              className="flex items-center gap-1.5 text-xs font-semibold text-coffee-600 hover:text-berbere-500 transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4 text-berbere-500 shrink-0" />
              <span>{lang === 'en' ? 'አማርኛ' : 'English'}</span>
            </button>

            {/* Login Link */}
            <Link 
              href="/login" 
              className="text-sm font-semibold text-coffee-600 hover:text-berbere-500 transition-colors px-2 py-1"
            >
              {lang === 'en' ? 'Sign In' : 'ግባ'}
            </Link>

            {/* Registration System Access Trigger Link */}
            <Link
              href="/register"
              className="group flex items-center gap-2 bg-berbere-500 hover:bg-berbere-600 text-white text-sm font-semibold px-5 h-11 rounded-xl shadow-md transition-all duration-150"
            >
              <span>{lang === 'en' ? 'Start Free Trial' : 'በነፃ ይጀምሩ'}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>

          {/* Mobile Actions Control Viewport Blocks */}
          <div className="flex min-[768px]:hidden items-center gap-2 shrink-0">
            <button
              onClick={() => setLang((prev) => (prev === 'en' ? 'am' : 'en'))}
              className="flex items-center justify-center border border-coffee-400/15 rounded-xl w-11 h-11 bg-white"
              aria-label="Switch Language"
            >
              <Globe className="w-4 h-4 text-berbere-500" />
            </button>
            
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-center text-coffee-700 bg-white border border-coffee-400/15 rounded-xl w-11 h-11 cursor-pointer"
              aria-expanded={isOpen}
              aria-label="Toggle Navigation Menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Dropdown Drawer Section Container for Mobile clients */}
      <div 
        className={`absolute top-16 left-0 w-full bg-cream-100 border-b border-coffee-500/15 transition-all duration-300 ease-in-out min-[768px]:hidden ${
          isOpen 
            ? 'opacity-100 translate-y-0 block shadow-modal' 
            : 'opacity-0 -translate-y-2 hidden pointer-events-none'
        }`}
      >
        <div className="px-4 py-6 space-y-5">
          <div className="flex flex-col gap-1 text-base font-medium text-coffee-600">
            <a onClick={() => setIsOpen(false)} href="#features" className="flex items-center min-h-[44px] px-4 rounded-xl hover:bg-coffee-50 hover:text-berbere-500">
              {lang === 'en' ? 'Features' : 'ባህሪያት'}
            </a>
            <a onClick={() => setIsOpen(false)} href="#segments" className="flex items-center min-h-[44px] px-4 rounded-xl hover:bg-coffee-50 hover:text-berbere-500">
              {lang === 'en' ? 'Industries' : 'የንግድ ዓይነቶች'}
            </a>
            <a onClick={() => setIsOpen(false)} href="#pricing" className="flex items-center min-h-[44px] px-4 rounded-xl hover:bg-coffee-50 hover:text-berbere-500">
              {lang === 'en' ? 'Pricing' : 'ዋጋ'}
            </a>
            <a onClick={() => setIsOpen(false)} href="#faq" className="flex items-center min-h-[44px] px-4 rounded-xl hover:bg-coffee-50 hover:text-berbere-500">
              {lang === 'en' ? 'FAQ' : 'ጥያቄዎች'}
            </a>
            
            {/* Mobile Sign In Option */}
            <Link 
              onClick={() => setIsOpen(false)} 
              href="/login" 
              className="flex items-center gap-2 min-h-[44px] px-4 rounded-xl hover:bg-coffee-50 hover:text-berbere-500 border-t border-coffee-500/5 mt-1 pt-2 font-semibold"
            >
              <LogIn className="w-4 h-4 text-berbere-500" />
              {lang === 'en' ? 'Sign In' : 'ግባ'}
            </Link>
          </div>
          
          <div className="pt-2">
            <Link
              href="/register"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 bg-berbere-500 text-white w-full font-semibold min-h-[48px] rounded-xl shadow-md"
            >
              <span>{lang === 'en' ? 'Start Free Trial' : 'በነፃ ይጀምሩ'}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
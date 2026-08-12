'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Route } from 'next';

interface ManagementCardProps {
  title: string;
  description: string;
  // emoji: string;
  route: string;
}

export default function ManagementCard({ title, description,  route }: ManagementCardProps) {
  return (
    <Link 
      href={route as Route}
      className="flex items-center justify-between p-4 hover:bg-cream-50/40 active:bg-cream-50 transition-colors group w-full text-left"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="text-2xl select-none shrink-0 group-hover:scale-110 transition-transform duration-200">
    
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-black text-xs text-coffee-900 tracking-tight">
            {title}
          </span>
          <span className="text-[10px] font-medium text-coffee-400 truncate mt-0.5">
            {description}
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-coffee-300 group-hover:text-berbere-600 group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  )
}
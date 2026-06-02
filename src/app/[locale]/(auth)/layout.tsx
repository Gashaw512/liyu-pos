'use client'

import React from 'react'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="">
      {/* You can put shared structural items here, 
        like a common background mesh, footer elements, or wrappers.
      */}
      {children}
    </div>
  )
}
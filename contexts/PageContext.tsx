"use client"
import React, { createContext, useContext, useState } from 'react'

interface PageContextType {
  currentPage: string
  setCurrentPage: (page: string) => void
}

const PageContext = createContext<PageContextType | undefined>(undefined)

export function PageProvider({ children }: { children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useState("home")

  return (
    <PageContext.Provider value={{ currentPage, setCurrentPage }}>
      <div data-current-page={currentPage}>
        {children}
      </div>
    </PageContext.Provider>
  )
}

export function usePage() {
  const context = useContext(PageContext)
  if (context === undefined) {
    throw new Error('usePage must be used within a PageProvider')
  }
  return context
} 
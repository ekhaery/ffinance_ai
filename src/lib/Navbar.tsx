'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const chevron = (open: boolean) => (
  <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
  </svg>
)

export default function Navbar() {
  const pathname = usePathname()
  const [settingOpen, setSettingOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const settingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingRef.current && !settingRef.current.contains(e.target as Node)) setSettingOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); setSettingOpen(false) }, [pathname])

  const isActive = (path: string) => pathname === path

  const linkClass = (path: string) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive(path) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`

  return (
    <nav className="bg-white border-b border-gray-200">
      {/* Desktop bar */}
      <div className="max-w-4xl mx-auto px-4 flex items-center h-14 gap-1">
        <span className="font-semibold text-gray-900 mr-4 text-sm tracking-tight">ffinance</span>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          <Link href="/expenses/create" className={linkClass('/expenses/create')}>Create Expense</Link>
          <Link href="/expenses" className={linkClass('/expenses')}>Expenses</Link>
          <Link href="/income" className={linkClass('/income')}>Income</Link>
          <Link href="/monthly-check" className={linkClass('/monthly-check')}>Monthly Check</Link>

          {/* Setting dropdown */}
          <div className="relative" ref={settingRef}>
            <button
              onClick={() => setSettingOpen((o) => !o)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith('/settings') || pathname.startsWith('/templates')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Setting {chevron(settingOpen)}
            </button>
            {settingOpen && (
              <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
                <Link href="/templates" onClick={() => setSettingOpen(false)} className={`block px-4 py-2 text-sm ${pathname.startsWith('/templates') ? 'text-blue-700 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                  Templates
                </Link>
                <Link href="/settings/categories" onClick={() => setSettingOpen(false)} className={`block px-4 py-2 text-sm ${pathname.startsWith('/settings/categories') ? 'text-blue-700 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                  Category
                </Link>
                <Link href="/settings/subcategories" onClick={() => setSettingOpen(false)} className={`block px-4 py-2 text-sm ${pathname.startsWith('/settings/subcategories') ? 'text-blue-700 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                  Subcategory
                </Link>
                <Link href="/settings/accounts" onClick={() => setSettingOpen(false)} className={`block px-4 py-2 text-sm ${pathname.startsWith('/settings/accounts') ? 'text-blue-700 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                  Account
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto p-2 rounded-md text-gray-600 hover:bg-gray-100"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          <Link href="/expenses/create" className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/expenses/create') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            Create Expense
          </Link>
          <Link href="/expenses" className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/expenses') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            Expenses
          </Link>
          <Link href="/income" className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/income') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            Income
          </Link>
          <Link href="/monthly-check" className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/monthly-check') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            Monthly Check
          </Link>
          <div className="pt-1 border-t border-gray-100">
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Setting</p>
            <Link href="/templates" className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname.startsWith('/templates') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              Templates
            </Link>
            <Link href="/settings/categories" className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname.startsWith('/settings/categories') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              Category
            </Link>
            <Link href="/settings/subcategories" className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname.startsWith('/settings/subcategories') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              Subcategory
            </Link>
            <Link href="/settings/accounts" className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname.startsWith('/settings/accounts') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              Account
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

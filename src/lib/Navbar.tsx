'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const chevron = (open: boolean) => (
  <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
  </svg>
)

export default function Navbar() {
  const pathname = usePathname()
  const [settingOpen, setSettingOpen] = useState(false)
  const settingRef = useRef<HTMLDivElement>(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingRef.current && !settingRef.current.contains(e.target as Node)) setSettingOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => { setSettingOpen(false) }, [pathname])

  // Fetch pending (no-amount) expense count
  useEffect(() => {
    async function fetchPending() {
      const { count } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .or('amount.is.null,amount.eq.0')
      setPendingCount(count ?? 0)
    }
    fetchPending()
  }, [pathname])

  const isActive = (path: string) => pathname === path

  const linkClass = (path: string) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive(path) ? 'bg-white/20 text-[#ffffff]' : 'text-[#ffffff]/90 hover:bg-white/10 hover:text-[#ffffff]'
    }`

  return (
    <nav className="bg-[#121358] border-b border-[#121358]">
      <div className="max-w-4xl mx-auto px-4 flex items-center h-14 gap-1">
        <Link href="/outflow" className="font-bold text-[#ffffff] mr-4 text-lg tracking-tight hover:opacity-75 transition-opacity">FinFadel</Link>

        {/* Links — always visible */}
        <div className="flex items-center gap-1 flex-1 justify-end">
          <Link href="/accounts" className={linkClass('/accounts')}><i className="fa-solid fa-credit-card" /></Link>
          <Link href="/expenses" className={linkClass('/expenses')}><i className="fa-solid fa-arrow-rotate-left" /></Link>

          {/* Update Me! */}
          <Link
            href="/update-me"
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname.startsWith('/update-me') ? 'bg-white/20 text-[#ffffff]' : 'text-[#ffffff]/90 hover:bg-white/10 hover:text-[#ffffff]'
            }`}
          >
            <i className="fa-solid fa-circle-exclamation" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#FA6781] text-white text-[10px] font-bold px-1 leading-none">
                {pendingCount}
              </span>
            )}
          </Link>

          {/* Setting dropdown */}
          <div className="relative" ref={settingRef}>
            <button
              onClick={() => setSettingOpen((o) => !o)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith('/settings') || pathname.startsWith('/templates')
                  ? 'bg-white/20 text-[#ffffff]'
                  : 'text-[#ffffff]/90 hover:bg-white/10 hover:text-[#ffffff]'
              }`}
            >
              <i className="fa-solid fa-gear" /> {chevron(settingOpen)}
            </button>
            {settingOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
                <Link href="/templates" onClick={() => setSettingOpen(false)} className={`block px-4 py-2 text-sm ${pathname.startsWith('/templates') ? 'text-[#121358] bg-[#121358]/10' : 'text-gray-700 hover:bg-gray-50'}`}>Templates</Link>
                <Link href="/settings/categories" onClick={() => setSettingOpen(false)} className={`block px-4 py-2 text-sm ${pathname.startsWith('/settings/categories') ? 'text-[#121358] bg-[#121358]/10' : 'text-gray-700 hover:bg-gray-50'}`}>Category</Link>
                <Link href="/settings/subcategories" onClick={() => setSettingOpen(false)} className={`block px-4 py-2 text-sm ${pathname.startsWith('/settings/subcategories') ? 'text-[#121358] bg-[#121358]/10' : 'text-gray-700 hover:bg-gray-50'}`}>Subcategory</Link>
                <Link href="/settings/accounts" onClick={() => setSettingOpen(false)} className={`block px-4 py-2 text-sm ${pathname.startsWith('/settings/accounts') ? 'text-[#121358] bg-[#121358]/10' : 'text-gray-700 hover:bg-gray-50'}`}>Account</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

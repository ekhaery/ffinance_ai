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
  const settingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingRef.current && !settingRef.current.contains(e.target as Node)) setSettingOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => { setSettingOpen(false) }, [pathname])

  const isActive = (path: string) => pathname === path

  const linkClass = (path: string) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive(path) ? 'bg-white/20 text-[#FFFDE1]' : 'text-[#FFFDE1]/90 hover:bg-white/10 hover:text-[#FFFDE1]'
    }`

  return (
    <nav className="bg-[#F96E5B] border-b border-[#F96E5B]">
      <div className="max-w-4xl mx-auto px-4 flex items-center h-14 gap-1">
        <Link href="/outflow" className="font-bold text-[#FFFDE1] mr-4 text-lg tracking-tight hover:opacity-75 transition-opacity">FinFadel</Link>

        {/* Links — always visible */}
        <div className="flex items-center gap-1 flex-1">
          <Link href="/balance" className={linkClass('/balance')}>Balance</Link>

          {/* Setting dropdown */}
          <div className="relative" ref={settingRef}>
            <button
              onClick={() => setSettingOpen((o) => !o)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith('/settings') || pathname.startsWith('/templates')
                  ? 'bg-white/20 text-[#FFFDE1]'
                  : 'text-[#FFFDE1]/90 hover:bg-white/10 hover:text-[#FFFDE1]'
              }`}
            >
              <i className="fa-solid fa-gear" /> {chevron(settingOpen)}
            </button>
            {settingOpen && (
              <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
                <Link href="/templates" onClick={() => setSettingOpen(false)} className={`block px-4 py-2 text-sm ${pathname.startsWith('/templates') ? 'text-[#3F9AAE] bg-[#3F9AAE]/10' : 'text-gray-700 hover:bg-gray-50'}`}>Templates</Link>
                <Link href="/settings/categories" onClick={() => setSettingOpen(false)} className={`block px-4 py-2 text-sm ${pathname.startsWith('/settings/categories') ? 'text-[#3F9AAE] bg-[#3F9AAE]/10' : 'text-gray-700 hover:bg-gray-50'}`}>Category</Link>
                <Link href="/settings/subcategories" onClick={() => setSettingOpen(false)} className={`block px-4 py-2 text-sm ${pathname.startsWith('/settings/subcategories') ? 'text-[#3F9AAE] bg-[#3F9AAE]/10' : 'text-gray-700 hover:bg-gray-50'}`}>Subcategory</Link>
                <Link href="/settings/accounts" onClick={() => setSettingOpen(false)} className={`block px-4 py-2 text-sm ${pathname.startsWith('/settings/accounts') ? 'text-[#3F9AAE] bg-[#3F9AAE]/10' : 'text-gray-700 hover:bg-gray-50'}`}>Account</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Category = { id: number; name: string; color: string }
type Expense = {
  id: number
  expense_name: string
  amount: number
  date: string
  subcategory_id: number
  subcategories: { name: string; categories: { name: string } }
}

export default function ExpenseReportPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [hideTotal, setHideTotal] = useState(true)

  async function load(start?: string, end?: string) {
    let query = supabase
      .from('expenses')
      .select('id, expense_name, amount, date, subcategory_id, subcategories(name, categories(name))')
      .order('date', { ascending: false })
    if (start) query = query.gte('date', start)
    if (end) query = query.lte('date', end)
    const { data } = await query
    setExpenses((data as unknown as Expense[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('categories').select('id, name, color').order('name').then(({ data }) => setCategories(data ?? []))
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const start = `${y}-${m}-01`
    const end = `${y}-${m}-${String(new Date(y, now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
    supabase.from('balance').select('amount, type').gte('date', start).lte('date', end)
      .then(({ data }) => {
        const income = (data ?? []).filter((r: { type: string }) => r.type === 'income' || r.type === 'transfer_in')
          .reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0)
        setMonthlyIncome(income)
      })
  }, [])

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  const categoryTotals = categories.map((cat) => {
    const catExpenses = expenses.filter((e) => e.subcategories?.categories?.name === cat.name)
    const catTotal = catExpenses.reduce((s, e) => s + Number(e.amount), 0)
    const pct = total > 0 ? Math.round((catTotal / total) * 100) : 0
    const top = [...catExpenses].sort((a, b) => Number(b.amount) - Number(a.amount))[0] ?? null
    return { ...cat, catTotal, pct, top }
  }).filter((c) => c.catTotal > 0)

  return (
    <main className="min-h-screen bg-[#ffffff] px-4 py-8">
      <div className="max-w-3xl mx-auto">

        {/* Back + title */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/expenses"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-xs" />
            Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Report</h1>
        </div>

        {/* Date range filter */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 shrink-0">Date</span>
          <input
            type="date"
            value={filterStart}
            onChange={(e) => { setFilterStart(e.target.value); setLoading(true); load(e.target.value || undefined, filterEnd || undefined) }}
            className="rounded-xl border border-[#F4B342] px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#F4B342] bg-white"
          />
          <span className="text-xs text-gray-400">–</span>
          <input
            type="date"
            value={filterEnd}
            onChange={(e) => { setFilterEnd(e.target.value); setLoading(true); load(filterStart || undefined, e.target.value || undefined) }}
            className="rounded-xl border border-[#F4B342] px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#F4B342] bg-white"
          />
          {(filterStart || filterEnd) && (
            <button
              onClick={() => { setFilterStart(''); setFilterEnd(''); setLoading(true); load() }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Summary card */}
        {!loading && expenses.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Total row */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-[#121358]">
              <span className="text-sm font-bold text-[#F4B342]">Total Expenses</span>
              <span className="text-xs text-white/60">| {expenses.length} record{expenses.length !== 1 ? 's' : ''}</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#F4B342] text-xs font-semibold text-[#121358]">
                {hideTotal ? '*****' : total.toLocaleString('id-ID')}
                {!hideTotal && monthlyIncome > 0 && <span className="ml-1 opacity-70">({Math.round((total / monthlyIncome) * 100)}%)</span>}
              </span>
              <button
                onClick={() => setHideTotal(h => !h)}
                className="ml-auto text-white/60 hover:text-white transition-colors"
              >
                <i className={`fa-solid ${hideTotal ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
              </button>
            </div>

            {/* Left / Right panels */}
            <div className="grid grid-cols-[2fr_3fr] divide-x divide-gray-100">
              {/* Left: category percentages */}
              <div className="px-4 py-3 space-y-2 bg-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">By Category</p>
                {categoryTotals.map((cat) => (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium" style={{ color: cat.color ?? '#6668a8' }}>{cat.name}</span>
                      <span className="text-xs font-semibold text-gray-700">{cat.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-300 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, backgroundColor: cat.color ?? '#6668a8' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: top expense per category */}
              <div className="py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-4">Top per Category</p>
                {categoryTotals.map((cat, idx) => (
                  cat.top ? (
                    <div key={cat.id} className={`flex items-start justify-between gap-2 px-4 py-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-100/60'}`}>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-700 truncate">{cat.top.expense_name}</p>
                        <p className="text-xs font-bold truncate" style={{ color: cat.color ?? '#6668a8' }}>{cat.name}</p>
                      </div>
                      <span className="text-xs font-semibold text-gray-900 shrink-0">
                        {hideTotal && idx === 0 ? '*****' : Number(cat.top.amount).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && <p className="text-sm text-gray-400 text-center py-8">Loading…</p>}
        {!loading && expenses.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <p className="text-gray-400 text-sm">No expenses found.</p>
          </div>
        )}

      </div>
    </main>
  )
}

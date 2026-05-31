'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BALANCE_TYPES } from '@/lib/constants'

type Account   = { id: number; name: string; description: string | null }
type Category  = { id: number; name: string }

type BalanceRecord = {
  id: number
  amount: number
  date: string
  type: string
  expenses: { expense_name: string; subcategories: { categories: { name: string } | null } | null } | null
}

type EnrichedRecord = BalanceRecord & { balanceAfter: number }

type ExpenseRow = {
  amount: number
  subcategories: { categories: { name: string } | null } | null
}

type RangeKey = 'today' | 'this_week' | 'this_month' | 'custom'

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function getRange(key: RangeKey, customStart: string, customEnd: string): { start: string; end: string } {
  const now = new Date()
  if (key === 'today') { const t = ymd(now); return { start: t, end: t } }
  if (key === 'this_week') {
    const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { start: ymd(mon), end: ymd(sun) }
  }
  if (key === 'this_month') {
    const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
    const end = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    return { start, end }
  }
  return { start: customStart, end: customEnd }
}

function getLabel(r: BalanceRecord): string {
  if (r.type === BALANCE_TYPES.EXPENSE)      return r.expenses?.expense_name ?? 'Expense'
  if (r.type === BALANCE_TYPES.INCOME)       return 'Income'
  if (r.type === BALANCE_TYPES.TRANSFER_IN)  return 'Transfer In'
  if (r.type === BALANCE_TYPES.TRANSFER_OUT) return 'Transfer Out'
  return r.type
}

function getTypeLabel(type: string): string {
  if (type === BALANCE_TYPES.EXPENSE)      return 'Expense'
  if (type === BALANCE_TYPES.INCOME)       return 'Income'
  if (type === BALANCE_TYPES.TRANSFER_IN)  return 'Transfer In'
  if (type === BALANCE_TYPES.TRANSFER_OUT) return 'Transfer Out'
  return type
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmt(n: number) { return Math.abs(n).toLocaleString('id-ID') }

export default function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const router = useRouter()

  const [account, setAccount]           = useState<Account | null>(null)
  const [categories, setCategories]     = useState<Category[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)
  const [allRecords, setAllRecords]     = useState<BalanceRecord[]>([])
  const [catTotals, setCatTotals]       = useState<Record<string, number>>({})
  const [loading, setLoading]           = useState(true)

  const [rangeKey, setRangeKey]         = useState<RangeKey>('this_month')
  const [customStart, setCustomStart]   = useState('')
  const [customEnd, setCustomEnd]       = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Load account, full balance history, and categories (once)
  useEffect(() => {
    async function load() {
      const [{ data: acc }, { data: bals }, { data: cats }] = await Promise.all([
        supabase.from('accounts').select('id, name, description').eq('id', accountId).single(),
        supabase.from('balance')
          .select('id, amount, date, type, expenses(expense_name, subcategories(categories(name)))')
          .eq('account_id', accountId)
          .order('date', { ascending: true })
          .order('id', { ascending: true }),
        supabase.from('categories').select('id, name').order('name'),
      ])
      setAccount(acc)
      setCategories(cats ?? [])
      const rows = (bals as unknown as BalanceRecord[]) ?? []
      setCurrentBalance(rows.reduce((s, r) => s + Number(r.amount), 0))
      setAllRecords(rows)
      setLoading(false)
    }
    load()
  }, [accountId])

  // Re-fetch expense category breakdown whenever range changes
  useEffect(() => {
    const { start, end } = getRange(rangeKey, customStart, customEnd)
    if (!start || !end) return

    supabase
      .from('expenses')
      .select('amount, subcategories(categories(name))')
      .eq('account_id', accountId)
      .gte('date', start)
      .lte('date', end)
      .then(({ data }) => {
        const totals: Record<string, number> = {}
        ;(data as unknown as ExpenseRow[] ?? []).forEach((e) => {
          const cat = e.subcategories?.categories?.name
          if (!cat) return
          totals[cat] = (totals[cat] ?? 0) + Number(e.amount)
        })
        setCatTotals(totals)
      })
  }, [accountId, rangeKey, customStart, customEnd])

  // Running balance enrichment + range filter
  const enriched: EnrichedRecord[] = (() => {
    let running = 0
    return allRecords.map((r) => { running += Number(r.amount); return { ...r, balanceAfter: running } })
  })()

  const { start, end } = getRange(rangeKey, customStart, customEnd)
  const filtered = (start && end) ? enriched.filter((r) => r.date >= start && r.date <= end).reverse() : []

  const displayRecords = selectedCategory
    ? filtered.filter((r) => r.expenses?.subcategories?.categories?.name === selectedCategory)
    : filtered

  // Summary metrics derived from filtered balance records
  const income      = filtered.filter(r => r.type === BALANCE_TYPES.INCOME || r.type === BALANCE_TYPES.TRANSFER_IN).reduce((s, r) => s + Number(r.amount), 0)
  const transferOut = filtered.filter(r => r.type === BALANCE_TYPES.TRANSFER_OUT).reduce((s, r) => s + Math.abs(Number(r.amount)), 0)
  const used        = filtered
    .filter(r => r.type === BALANCE_TYPES.EXPENSE || r.type === BALANCE_TYPES.TRANSFER_OUT)
    .reduce((s, r) => s + Math.abs(Number(r.amount)), 0)


  const rangeOptions: { key: RangeKey; label: string }[] = [
    { key: 'today',      label: 'Today' },
    { key: 'this_week',  label: 'This Week' },
    { key: 'this_month', label: 'This Month' },
    { key: 'custom',     label: 'Custom' },
  ]

  return (
    <main className="min-h-screen bg-[#FFF5E5] px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Back + account name */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/balance')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-xs" />
            Back
          </button>
          <div className="text-right">
            <p className="text-base font-semibold text-gray-900">{account?.name ?? '…'}</p>
            {account?.description && <p className="text-xs text-gray-400">{account.description}</p>}
          </div>
        </div>

        {/* Time range filter */}
        {/* Time Range + Category — single card */}
        <div className="bg-[#FFE2AF] rounded-2xl border border-[#FFE2AF] shadow-sm overflow-hidden">
          {/* Time Range */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm font-bold text-[#3F9AAE]">Time Range</p>
            <div className="flex flex-wrap gap-2">
              {rangeOptions.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setRangeKey(o.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    rangeKey === o.key
                      ? 'bg-[#3F9AAE] border-[#3F9AAE] text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-[#3F9AAE] hover:text-[#3F9AAE]'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {rangeKey === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-1 bg-[#FFF5E5] rounded-2xl p-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3F9AAE] mb-1">Start Date</label>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full rounded-full border border-[#3F9AAE] px-4 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-[#3F9AAE]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3F9AAE] mb-1">End Date</label>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full rounded-full border border-[#3F9AAE] px-4 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-[#3F9AAE]" />
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          {categories.length > 0 && <div className="border-t-2 border-[#FFF5E5] mx-5" />}

          {/* Category */}
          {categories.length > 0 && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-3">
              <p className="text-sm font-bold text-[#3F9AAE] shrink-0">Category</p>
              <select
                value={selectedCategory ?? ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="w-full rounded-full border border-[#3F9AAE] px-4 py-1.5 text-sm text-gray-700 bg-white outline-none focus:ring-2 focus:ring-[#3F9AAE]"
              >
                <option value="">All</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              </div>
            </div>
          )}
        </div>

        {/* Summary section */}
        {!loading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 space-y-4">
            {/* Current Balance + Used + Income */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Current Balance</p>
                <p className={`text-lg font-bold mt-1 ${currentBalance < 0 ? 'text-[#FA6781]' : 'text-[#3F9AAE]'}`}>
                  {currentBalance < 0 ? '-' : ''}{fmt(currentBalance)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Used</p>
                <p className="text-lg font-bold text-[#FA6781] mt-1">{fmt(used)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Income</p>
                <p className="text-lg font-bold text-[#3F9AAE] mt-1">{fmt(income)}</p>
              </div>
            </div>

            {/* Category breakdown */}
            {categories.length > 0 && (
              <div className="pt-3 border-t border-gray-100 space-y-2">
                {categories.map((cat) => {
                  const amount = catTotals[cat.name] ?? 0
                  const pct = income > 0 ? Math.round((amount / income) * 100) : 0
                  return (
                    <div key={cat.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-600 w-36 shrink-0">{cat.name}</span>
                      <span className="text-xs font-semibold text-gray-500 w-10 text-right shrink-0">{pct}%</span>
                      <span className="text-sm text-gray-700 text-right flex-1">{fmt(amount)}</span>
                    </div>
                  )
                })}
                {/* Other = Transfer Out */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-600 w-36 shrink-0">Other</span>
                  <span className="text-xs font-semibold text-gray-500 w-10 text-right shrink-0">
                    {income > 0 ? Math.round((transferOut / income) * 100) : 0}%
                  </span>
                  <span className="text-sm text-gray-700 text-right flex-1">{fmt(transferOut)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transaction list */}
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
        ) : displayRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">No transactions in this period.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-[#FFF5E5]/50">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {displayRecords.length} transaction{displayRecords.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 text-xs uppercase text-gray-400 bg-[#FFF5E5]/50">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-medium">Date</th>
                    <th className="px-5 py-2.5 text-left font-medium">Type</th>
                    <th className="px-5 py-2.5 text-left font-medium">Description</th>
                    <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                    <th className="px-5 py-2.5 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayRecords.map((r) => {
                    const isNeg = Number(r.amount) < 0
                    return (
                      <tr key={r.id}>
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(r.date)}</td>
                        <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{getTypeLabel(r.type)}</td>
                        <td className="px-5 py-3 text-gray-800 max-w-[180px] truncate">{getLabel(r)}</td>
                        <td className={`px-5 py-3 text-right font-semibold whitespace-nowrap ${isNeg ? 'text-[#FA6781]' : 'text-[#3F9AAE]'}`}>
                          {isNeg ? '−' : '+'}{fmt(Number(r.amount))}
                        </td>
                        <td className={`px-5 py-3 text-right whitespace-nowrap ${r.balanceAfter < 0 ? 'text-[#FA6781]' : 'text-gray-700'}`}>
                          {r.balanceAfter < 0 ? '-' : ''}{fmt(r.balanceAfter)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile rows */}
            <div className="sm:hidden divide-y divide-gray-50">
              {displayRecords.map((r) => {
                const isNeg = Number(r.amount) < 0
                return (
                  <div key={r.id} className="px-5 py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
                      <span className={`text-sm font-semibold ${isNeg ? 'text-[#FA6781]' : 'text-[#3F9AAE]'}`}>
                        {isNeg ? '−' : '+'}{fmt(Number(r.amount))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{getLabel(r)}</p>
                        <p className="text-xs text-gray-400">{getTypeLabel(r.type)}</p>
                      </div>
                      <p className={`text-xs ${r.balanceAfter < 0 ? 'text-[#FA6781]' : 'text-gray-400'}`}>
                        bal: {r.balanceAfter < 0 ? '-' : ''}{fmt(r.balanceAfter)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

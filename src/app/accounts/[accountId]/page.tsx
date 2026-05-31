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
    const from = new Date(now); from.setDate(now.getDate() - 7)
    return { start: ymd(from), end: ymd(now) }
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
  const [hideAmounts, setHideAmounts] = useState(true)
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().slice(0, 10))
  const [incomeSaving, setIncomeSaving] = useState(false)

  async function handleAddIncome() {
    const amount = Number(incomeAmount)
    if (!amount || amount <= 0) return
    setIncomeSaving(true)
    await supabase.from('balance').insert({
      account_id: Number(accountId),
      amount,
      type: BALANCE_TYPES.INCOME,
      date: incomeDate,
    })
    setIncomeSaving(false)
    setShowIncomeModal(false)
    setIncomeAmount('')
    setIncomeDate(new Date().toISOString().slice(0, 10))
    // Reload
    const { data: bals } = await supabase
      .from('balance')
      .select('id, amount, date, type, expenses(expense_name, subcategories(categories(name)))')
      .eq('account_id', accountId)
      .order('date', { ascending: true })
      .order('id', { ascending: true })
    const rows = (bals as unknown as BalanceRecord[]) ?? []
    setCurrentBalance(rows.reduce((s, r) => s + Number(r.amount), 0))
    setAllRecords(rows)
  }

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
    { key: 'this_week',  label: '7d ago' },
    { key: 'this_month', label: 'This Month' },
    { key: 'custom',     label: 'Custom' },
  ]

  return (
    <main className="min-h-screen bg-[#ffffff] px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Back + title */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/accounts')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-xs" />
            Back
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Account Detail</h1>
        </div>

        {/* Time range filter */}
        {/* Time Range + Category — single card */}
        <div className="bg-[#F4B342] rounded-2xl shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="bg-[#121358] px-5 py-3">
            <p className="text-base font-semibold text-white uppercase">{account?.name ?? '…'}</p>
            {account?.description && <p className="text-xs text-white/60 lowercase"><span className="font-bold">|</span> {account.description}</p>}
          </div>

          {/* Time Range */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm font-bold text-[#121358]">Time Range</p>
            <div className="flex flex-wrap gap-2">
              {rangeOptions.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setRangeKey(o.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    rangeKey === o.key
                      ? 'bg-[#121358] border-[#121358] text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-[#121358] hover:text-[#121358]'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {rangeKey === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 bg-[#FFFDE1] rounded-2xl p-3">
                <div>
                  <label className="block text-xs font-semibold text-[#121358] mb-1">Start Date</label>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full rounded-full border border-[#121358] px-2 py-0.5 text-xs bg-white outline-none focus:ring-2 focus:ring-[#121358]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#121358] mb-1">End Date</label>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full rounded-full border border-[#121358] px-2 py-0.5 text-xs bg-white outline-none focus:ring-2 focus:ring-[#121358]" />
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          {categories.length > 0 && <div className="border-t-2 border-[#ffffff] mx-5" />}

          {/* Category */}
          {categories.length > 0 && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-3">
              <p className="text-sm font-bold text-[#121358] shrink-0">Category</p>
              <select
                value={selectedCategory ?? ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="w-full rounded-full border border-[#121358] px-4 py-1.5 text-sm text-gray-700 bg-white outline-none focus:ring-2 focus:ring-[#121358]"
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

        {/* Summary section — two cards side by side */}
        {!loading && (
          <div className="grid grid-cols-5 gap-3">

            {/* Left card: Balance / Used / Income */}
            <div className="col-span-2 bg-[#121358] rounded-2xl shadow-sm px-4 py-4 space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/70 uppercase tracking-wide font-medium">Balance</p>
                  <button onClick={() => setHideAmounts(h => !h)} className="text-white/60 hover:text-white transition-colors">
                    <i className={`fa-solid ${hideAmounts ? 'fa-eye' : 'fa-eye-slash'} text-xs`} />
                  </button>
                </div>
                <p className={`text-base font-bold mt-0.5 ${currentBalance < 0 ? 'text-[#FA6781]' : 'text-white'}`}>
                  {hideAmounts ? '****' : `${currentBalance < 0 ? '-' : ''}${fmt(currentBalance)}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/70 uppercase tracking-wide font-medium">Used</p>
                <p className="text-base font-bold text-[#F4B342] mt-0.5">{hideAmounts ? '****' : fmt(used)}</p>
              </div>
              <div>
                <p className="text-xs text-white/70 uppercase tracking-wide font-medium">Income</p>
                <p className="text-base font-bold text-white mt-0.5">{hideAmounts ? '****' : fmt(income)}</p>
              </div>
            </div>

            {/* Right card: Category % */}
            <div className="col-span-3 bg-gray-200 rounded-2xl shadow-sm px-4 py-4 space-y-2">
              {categories.map((cat) => {
                const amount = catTotals[cat.name] ?? 0
                const pct = income > 0 ? Math.round((amount / income) * 100) : 0
                return (
                  <div key={cat.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#121358] truncate">{cat.name}</span>
                    <span className="text-xs font-bold text-[#121358] shrink-0">{pct}% <span className="font-normal text-gray-500">| {amount.toLocaleString('id-ID')}</span></span>
                  </div>
                )
              })}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#121358] truncate">Other</span>
                <span className="text-xs font-bold text-[#121358] shrink-0">
                  {income > 0 ? Math.round((transferOut / income) * 100) : 0}% <span className="font-normal text-gray-500">| {transferOut.toLocaleString('id-ID')}</span>
                </span>
              </div>
            </div>

          </div>
        )}

        {/* Income button */}
        {!loading && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowIncomeModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#121358] text-white text-sm font-semibold hover:bg-[#6668a8] transition-colors"
            >
              <i className="fa-solid fa-plus text-xs" />
              Add Income
            </button>
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
            <div className="px-5 py-3 border-b border-gray-100 bg-[#ffffff]/50">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {displayRecords.length} transaction{displayRecords.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 text-xs uppercase text-gray-400 bg-[#ffffff]/50">
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
                        <td className={`px-5 py-3 text-right font-semibold whitespace-nowrap ${isNeg ? 'text-[#FA6781]' : 'text-[#121358]'}`}>
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
                      <span className={`text-sm font-semibold ${isNeg ? 'text-[#FA6781]' : 'text-[#121358]'}`}>
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

      {/* Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-[#121358]">Add Income</h2>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Amount</label>
              <input
                type="number"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-2xl border border-[#F4B342] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#F4B342]"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                className="w-full rounded-2xl border border-[#F4B342] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#F4B342]"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowIncomeModal(false); setIncomeAmount('') }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIncome}
                disabled={incomeSaving || !incomeAmount}
                className="flex-1 rounded-lg bg-[#121358] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6668a8] disabled:opacity-50 transition-colors"
              >
                {incomeSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Account = { id: number; name: string; description: string | null }
type Expense = { id: number; expense_name: string; amount: number; date: string }

type RangeKey = 'today' | 'this_month' | 'last_month' | 'custom'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function getRange(key: RangeKey, customStart: string, customEnd: string): { start: string; end: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (key === 'today') {
    const t = today()
    return { start: t, end: t }
  }
  if (key === 'this_month') {
    const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
    const end = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    return { start, end }
  }
  if (key === 'last_month') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const start = ymd(d)
    const end = ymd(new Date(now.getFullYear(), now.getMonth(), 0))
    return { start, end }
  }
  return { start: customStart, end: customEnd }
}

function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const router = useRouter()

  const [account, setAccount] = useState<Account | null>(null)
  const [balance, setBalance] = useState(0)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const [rangeKey, setRangeKey] = useState<RangeKey>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Load account + current balance
  useEffect(() => {
    async function loadAccount() {
      const [{ data: acc }, { data: bals }] = await Promise.all([
        supabase.from('accounts').select('id, name, description').eq('id', accountId).single(),
        supabase.from('balance').select('amount').eq('account_id', accountId),
      ])
      setAccount(acc)
      const total = (bals ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0)
      setBalance(total)
    }
    loadAccount()
  }, [accountId])

  // Load expenses when range changes
  useEffect(() => {
    const { start, end } = getRange(rangeKey, customStart, customEnd)
    if (!start || !end) return

    setLoading(true)
    supabase
      .from('expenses')
      .select('id, expense_name, amount, date')
      .eq('account_id', accountId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .then(({ data }) => {
        setExpenses((data as Expense[]) ?? [])
        setLoading(false)
      })
  }, [accountId, rangeKey, customStart, customEnd])

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  const rangeOptions: { key: RangeKey; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'this_month', label: 'This Month' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'custom', label: 'Custom' },
  ]

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Back */}
        <button
          onClick={() => router.push('/balance')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <i className="fa-solid fa-arrow-left text-xs" />
          Back
        </button>

        {/* Account header card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <p className="text-lg font-semibold text-gray-900">{account?.name ?? '…'}</p>
          {account?.description && (
            <p className="text-xs text-gray-400 mt-0.5">{account.description}</p>
          )}
          <p className={`text-2xl font-bold mt-2 ${balance < 0 ? 'text-red-600' : 'text-green-700'}`}>
            {balance < 0 ? '-' : ''}{Math.abs(balance).toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Current balance</p>
        </div>

        {/* Time range filter */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Time Range</p>
          <div className="flex flex-wrap gap-2">
            {rangeOptions.map((o) => (
              <button
                key={o.key}
                onClick={() => setRangeKey(o.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  rangeKey === o.key
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {rangeKey === 'custom' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Transaction list */}
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
        ) : expenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">No transactions in this period.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs font-semibold text-gray-700">
                {total.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="shrink-0 w-20 text-xs text-gray-400">
                    {formatDisplayDate(e.date)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{e.expense_name}</p>
                  </div>
                  <div className="shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {Number(e.amount).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

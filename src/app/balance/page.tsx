'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Account = { id: number; name: string; description: string | null }
type Category = { id: number; name: string }
type BalanceRow = { account_id: number; amount: number; type: string }
type ExpenseRow = {
  account_id: number
  amount: number
  subcategories: { categories: { name: string } | null } | null
}

// account_id → category → total amount
type SpendingMap = Record<number, Record<string, number>>

function currentMonthRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${String(lastDay).padStart(2, '0')}` }
}

export default function BalancePage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [balanceMap, setBalanceMap] = useState<Record<number, number>>({})
  const [incomeMap, setIncomeMap] = useState<Record<number, number>>({})
  const [transferOutMap, setTransferOutMap] = useState<Record<number, number>>({})
  const [spendingMap, setSpendingMap] = useState<SpendingMap>({})
  const [loading, setLoading] = useState(true)
  const [hiddenCards, setHiddenCards] = useState<Record<number, boolean>>({})

  function toggleHide(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    setHiddenCards((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // By default all cards are hidden — treat undefined as hidden
  function isHidden(id: number) { return hiddenCards[id] !== false }

  useEffect(() => {
    async function load() {
      const { start, end } = currentMonthRange()

      const [{ data: accs }, { data: cats }, { data: bals }, { data: monthBals }, { data: exps }] = await Promise.all([
        supabase.from('accounts').select('id, name, description').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('balance').select('account_id, amount, type'),
        supabase.from('balance').select('account_id, amount, type').gte('date', start).lte('date', end),
        supabase.from('expenses')
          .select('account_id, amount, subcategories(categories(name))')
          .not('account_id', 'is', null)
          .gte('date', start)
          .lte('date', end),
      ])

      // Overall balance map (all time)
      const bMap: Record<number, number> = {}
      ;(bals as BalanceRow[] ?? []).forEach((r) => {
        bMap[r.account_id] = (bMap[r.account_id] ?? 0) + Number(r.amount)
      })

      // Income map: current month income + transfer_in per account
      const iMap: Record<number, number> = {}
      ;(monthBals as BalanceRow[] ?? []).filter(r => r.type === 'income' || r.type === 'transfer_in').forEach((r) => {
        iMap[r.account_id] = (iMap[r.account_id] ?? 0) + Number(r.amount)
      })

      // Transfer out map: current month per account
      const toMap: Record<number, number> = {}
      ;(monthBals as BalanceRow[] ?? []).filter(r => r.type === 'transfer_out').forEach((r) => {
        toMap[r.account_id] = (toMap[r.account_id] ?? 0) + Math.abs(Number(r.amount))
      })

      // Spending map: per account, per category
      const sMap: SpendingMap = {}
      ;(exps as unknown as ExpenseRow[] ?? []).forEach((e) => {
        const cat = e.subcategories?.categories?.name
        if (!cat) return
        if (!sMap[e.account_id]) sMap[e.account_id] = {}
        sMap[e.account_id][cat] = (sMap[e.account_id][cat] ?? 0) + Number(e.amount)
      })

      setBalanceMap(bMap)
      setIncomeMap(iMap)
      setTransferOutMap(toMap)
      setSpendingMap(sMap)
      setAccounts(accs ?? [])
      setCategories(cats ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#ffffff] px-4 py-8">
        <p className="text-sm text-gray-400 text-center mt-16">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#ffffff] px-4 py-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Balance</h1>
          <Link href="/expenses" className="inline-flex items-center gap-1.5 mr-2 mt-1.5 px-3 py-1 rounded-full border border-[#121358] bg-[#121358] text-white text-xs font-semibold hover:bg-[#79C9C5] hover:border-[#79C9C5] transition-colors">All History</Link>
          <Link href="/monthly-check" className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full border border-[#121358] bg-[#121358] text-white text-xs font-semibold hover:bg-[#79C9C5] hover:border-[#79C9C5] transition-colors">Monthly Checklist</Link>
        </div>

        {accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <p className="text-gray-400 text-sm">No accounts yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => {
              const bal = balanceMap[a.id] ?? 0
              const catTotals = spendingMap[a.id] ?? {}
              const monthIncome = incomeMap[a.id] ?? 0
              const transferOut = transferOutMap[a.id] ?? 0

              return (
                <div
                  key={a.id}
                  onClick={() => router.push(`/balance/${a.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 border-t-4 border-t-[#FFC94D] shadow-sm px-4 py-3 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all"
                >
                  {/* Account name + balance */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-semibold text-gray-900 uppercase">{a.name}</p>
                      {a.description && (
                        <p className="text-xs text-gray-400 lowercase tracking-wide"><span className="font-bold">|</span> {a.description}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => toggleHide(e, a.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5 ml-2 shrink-0"
                    >
                      <i className={`fa-solid ${isHidden(a.id) ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                    </button>
                  </div>
                  <p className={`text-base font-bold mt-2 ${bal < 0 ? 'text-[#FA6781]' : 'text-[#121358]'}`}>
                    {isHidden(a.id) ? '****' : `${bal < 0 ? '-' : ''}${Math.abs(bal).toLocaleString('id-ID')}`}
                  </p>

                  {/* Category spending percentages */}
                  <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {categories.map((cat) => {
                      const amount = catTotals[cat.name] ?? 0
                      const pct = monthIncome > 0 ? Math.round((amount / monthIncome) * 100) : 0
                      return (
                        <div key={cat.id} className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 truncate mr-1">{cat.name}</span>
                          <span className="text-xs font-semibold text-gray-700 shrink-0">{pct}%</span>
                        </div>
                      )
                    })}
                    {/* Other = Transfer Out */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 truncate mr-1">Other</span>
                      <span className="text-xs font-semibold text-gray-700 shrink-0">
                        {monthIncome > 0 ? Math.round((transferOut / monthIncome) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

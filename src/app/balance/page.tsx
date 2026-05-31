'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Account = { id: number; name: string; description: string | null }
type BalanceRow = { account_id: number; amount: number }
type RecentExpense = { id: number; expense_name: string; amount: number; date: string; account_id: number }

export default function BalancePage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [balanceMap, setBalanceMap] = useState<Record<number, number>>({})
  const [expensesMap, setExpensesMap] = useState<Record<number, RecentExpense[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: accs }, { data: bals }, { data: exps }] = await Promise.all([
        supabase.from('accounts').select('id, name, description').order('name'),
        supabase.from('balance').select('account_id, amount'),
        supabase.from('expenses')
          .select('id, expense_name, amount, date, account_id')
          .not('account_id', 'is', null)
          .order('date', { ascending: false })
          .order('id', { ascending: false }),
      ])

      // Build balance map
      const bMap: Record<number, number> = {}
      ;(bals as BalanceRow[] ?? []).forEach((r) => {
        bMap[r.account_id] = (bMap[r.account_id] ?? 0) + Number(r.amount)
      })
      setBalanceMap(bMap)

      // Build recent expenses map (latest 10 per account)
      const eMap: Record<number, RecentExpense[]> = {}
      ;(exps as RecentExpense[] ?? []).forEach((e) => {
        if (!eMap[e.account_id]) eMap[e.account_id] = []
        if (eMap[e.account_id].length < 10) eMap[e.account_id].push(e)
      })
      setExpensesMap(eMap)

      setAccounts(accs ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <p className="text-sm text-gray-400 text-center mt-16">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Balance</h1>

        {/* Account summary strip */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            {accounts.map((a) => {
              const bal = balanceMap[a.id] ?? 0
              return (
                <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col justify-between min-h-[80px]">
                  <p className="text-sm font-semibold text-gray-800 truncate">{a.name}</p>
                  <p className={`text-base font-bold mt-2 ${bal < 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {bal < 0 ? '-' : ''}{Math.abs(bal).toLocaleString('id-ID')}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <p className="text-gray-400 text-sm">No accounts yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((a) => {
              const balance = balanceMap[a.id] ?? 0
              const recentExpenses = expensesMap[a.id] ?? []
              return (
                <div
                  key={a.id}
                  onClick={() => router.push(`/balance/${a.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-gray-200 transition-all"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                      <p className="text-base font-semibold text-gray-900">{a.name}</p>
                      {a.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{a.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${balance < 0 ? 'text-red-600' : 'text-green-700'}`}>
                        {balance < 0 ? '-' : ''}{Math.abs(balance).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  {/* Recent expenses */}
                  {recentExpenses.length === 0 ? (
                    <div className="px-5 py-4">
                      <p className="text-xs text-gray-400">No expense transactions yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {recentExpenses.map((e) => (
                        <div key={e.id} className="flex items-center justify-between px-5 py-2.5">
                          <p className="text-sm text-gray-700 truncate mr-4">{e.expense_name}</p>
                          <p className="text-sm font-medium text-gray-900 shrink-0">
                            {Number(e.amount).toLocaleString('id-ID')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer hint */}
                  <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {recentExpenses.length > 0 ? `Latest ${recentExpenses.length} expense${recentExpenses.length > 1 ? 's' : ''}` : ''}
                    </p>
                    <p className="text-xs text-blue-500 font-medium">View all →</p>
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

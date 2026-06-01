'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BALANCE_TYPES } from '@/lib/constants'

type Expense = {
  id: number
  expense_name: string
  amount: number | null
  date: string
  account_id: number | null
  family_member: string | null
  subcategory_id: number | null
  subcategories: { name: string; categories: { name: string } } | null
}

type CardState = {
  amount: string
  saving: boolean
  error: string
  saved: boolean
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function UpdateMePage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [accountMap, setAccountMap] = useState<Record<number, string>>({})
  const [cardState, setCardState] = useState<Record<number, CardState>>({})

  useEffect(() => {
    async function fetchData() {
      const [{ data: expData }, { data: accData }] = await Promise.all([
        supabase
          .from('expenses')
          .select('id, expense_name, amount, date, account_id, family_member, subcategory_id, subcategories(name, categories(name))')
          .or('amount.is.null,amount.eq.0')
          .order('date', { ascending: false }),
        supabase.from('accounts').select('id, name'),
      ])

      const exps = (expData ?? []) as Expense[]
      setExpenses(exps)

      const map: Record<number, string> = {}
      for (const acc of accData ?? []) map[acc.id] = acc.name
      setAccountMap(map)

      const states: Record<number, CardState> = {}
      for (const e of exps) states[e.id] = { amount: '', saving: false, error: '', saved: false }
      setCardState(states)

      setLoading(false)
    }
    fetchData()
  }, [])

  const updateCard = (id: number, patch: Partial<CardState>) =>
    setCardState(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const handleSave = async (expense: Expense) => {
    const state = cardState[expense.id]
    const amt = parseFloat(state.amount)

    if (!state.amount || isNaN(amt) || amt <= 0) {
      updateCard(expense.id, { error: 'Please enter a valid amount' })
      return
    }

    updateCard(expense.id, { saving: true, error: '' })

    const { error: updateError } = await supabase
      .from('expenses')
      .update({ amount: amt })
      .eq('id', expense.id)

    if (updateError) {
      updateCard(expense.id, { saving: false, error: 'Failed to save. Try again.' })
      return
    }

    if (expense.account_id) {
      const { error: balanceError } = await supabase.from('balance').insert({
        account_id: expense.account_id,
        amount: -amt,
        type: BALANCE_TYPES.EXPENSE,
        date: expense.date,
        expense_id: expense.id,
      })
      if (balanceError) {
        updateCard(expense.id, { saving: false, error: 'Expense saved but balance update failed.' })
        return
      }
    }

    updateCard(expense.id, { saving: false, saved: true })
    setTimeout(() => {
      setExpenses(prev => prev.filter(e => e.id !== expense.id))
    }, 600)
  }

  const CARD_COLORS = ['#121358', '#F4B342']

  return (
    <div className="min-h-screen bg-white px-4 py-8 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/expenses"
          className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"
        >
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-[#121358]">Update Me!</h1>
        {!loading && expenses.length > 0 && (
          <span className="ml-1 bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            {expenses.length} pending
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center text-gray-400 py-16 text-sm">Loading…</div>
      )}

      {/* Empty state */}
      {!loading && expenses.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl px-6 py-14 flex flex-col items-center gap-2 text-center">
          <span className="text-3xl">🎉</span>
          <p className="font-semibold text-gray-700">All caught up!</p>
          <p className="text-xs text-gray-400">No expenses are missing an amount.</p>
        </div>
      )}

      {/* Expense cards */}
      {!loading && expenses.map((expense, idx) => {
        const cs = cardState[expense.id] ?? { amount: '', saving: false, error: '', saved: false }
        const headerColor = CARD_COLORS[idx % 2]
        const headerText = headerColor === '#F4B342' ? '#121358' : '#ffffff'
        const subcatName = expense.subcategories?.name
        const catName = expense.subcategories?.categories?.name
        const accountName = expense.account_id ? accountMap[expense.account_id] : null

        return (
          <div
            key={expense.id}
            className={`mb-4 rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 ${cs.saved ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          >
            {/* Card header */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: headerColor }}
            >
              <span className="font-semibold text-sm" style={{ color: headerText }}>
                {expense.expense_name}
              </span>
              <span className="text-xs opacity-80" style={{ color: headerText }}>
                {formatDate(expense.date)}
              </span>
            </div>

            {/* Card body */}
            <div className="bg-white px-4 py-4">
              {/* Subcategory / category */}
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                {subcatName && <span>{subcatName}</span>}
                {subcatName && catName && <span>·</span>}
                {catName && <span>{catName}</span>}
              </div>

              {/* Family member + account */}
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                {expense.family_member && (
                  <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                    {expense.family_member}
                  </span>
                )}
                {accountName && (
                  <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                    {accountName}
                  </span>
                )}
              </div>

              {/* Amount input + save */}
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-1">
                  <span className="px-2 text-gray-400 text-sm select-none">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0"
                    value={cs.amount}
                    disabled={cs.saving || cs.saved}
                    onChange={e => updateCard(expense.id, { amount: e.target.value, error: '' })}
                    onKeyDown={e => e.key === 'Enter' && handleSave(expense)}
                    className="flex-1 py-2 pr-3 text-sm outline-none bg-transparent"
                  />
                </div>
                <button
                  onClick={() => handleSave(expense)}
                  disabled={cs.saving || cs.saved}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    cs.saved
                      ? 'bg-green-500 text-white'
                      : 'bg-[#121358] text-white hover:bg-[#6668a8] disabled:opacity-60'
                  }`}
                >
                  {cs.saved ? '✓ Saved' : cs.saving ? 'Saving…' : 'Save'}
                </button>
              </div>

              {/* Per-card error */}
              {cs.error && (
                <p className="text-xs text-red-500 mt-2">{cs.error}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

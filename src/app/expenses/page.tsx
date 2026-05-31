'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { FAMILY_MEMBERS, BALANCE_TYPES } from '@/lib/constants'

type Subcategory = { id: number; name: string; category_id: number }
type Category = { id: number; name: string }

type Expense = {
  id: number
  expense_name: string
  amount: number
  date: string
  family_member: string | null
  subcategory_id: number
  account_id: number | null
  balance_recorded: boolean
  subcategories: { name: string; categories: { name: string } }
  accounts: { name: string } | null
}

type EditForm = {
  expense_name: string
  amount: string
  subcategory_id: string
  family_member: string
  account_id: string
  date: string
}

function formatCardDate(dateStr: string) {
  // dateStr is YYYY-MM-DD; parse as local date to avoid timezone shift
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [accounts, setAccounts] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<Expense | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  async function load() {
    const { data } = await supabase
      .from('expenses')
      .select('id, expense_name, amount, date, family_member, subcategory_id, account_id, balance_recorded, subcategories(name, categories(name)), accounts(name)')
      .order('date', { ascending: false })
      .order('id', { ascending: false })
    setExpenses((data as unknown as Expense[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('categories').select('id, name').order('name').then(({ data }) => setCategories(data ?? []))
    supabase.from('subcategories').select('id, name, category_id').order('name').then(({ data }) => setSubcategories(data ?? []))
    supabase.from('accounts').select('id, name').order('name').then(({ data }) => setAccounts(data ?? []))
  }, [])

  function openEdit(e: Expense) {
    setEditTarget(e)
    setEditForm({
      expense_name: e.expense_name,
      amount: String(e.amount),
      subcategory_id: String(e.subcategory_id),
      family_member: e.family_member ?? '',
      account_id: e.account_id ? String(e.account_id) : '',
      date: e.date,
    })
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this expense?')) return
    setDeleting(id)
    const expense = expenses.find((e) => e.id === id)
    await supabase.from('expenses').delete().eq('id', id)
    // Restore balance only if this expense had its balance recorded
    if (expense?.account_id && expense.balance_recorded) {
      await supabase.from('balance').insert({
        account_id: expense.account_id,
        amount: Number(expense.amount),
        type: BALANCE_TYPES.EXPENSE,
        date: new Date().toISOString().slice(0, 10),
      })
    }
    setDeleting(null)
    load()
  }

  async function handleSave() {
    if (!editTarget || !editForm) return
    setSaving(true)

    const oldAmount = Number(editTarget.amount)
    const newAmount = Number(editForm.amount)
    const oldAccountId = editTarget.account_id ?? null
    const newAccountId = editForm.account_id ? Number(editForm.account_id) : null
    const wasRecorded = editTarget.balance_recorded
    const today = new Date().toISOString().slice(0, 10)

    await supabase.from('expenses').update({
      expense_name: editForm.expense_name.trim(),
      amount: newAmount,
      subcategory_id: Number(editForm.subcategory_id),
      family_member: editForm.family_member || null,
      account_id: newAccountId,
      date: editForm.date,
      updated_at: new Date().toISOString(),
      balance_recorded: newAccountId ? true : false,
    }).eq('id', editTarget.id)

    if (!wasRecorded) {
      // Old expense with no prior balance entry — apply full deduction to new account
      if (newAccountId) {
        await supabase.from('balance').insert({ account_id: newAccountId, amount: -newAmount, type: BALANCE_TYPES.EXPENSE, date: today })
      }
    } else if (oldAccountId !== newAccountId) {
      // Account changed: fully reverse old, fully deduct new
      if (oldAccountId) {
        await supabase.from('balance').insert({ account_id: oldAccountId, amount: oldAmount, type: BALANCE_TYPES.EXPENSE, date: today })
      }
      if (newAccountId) {
        await supabase.from('balance').insert({ account_id: newAccountId, amount: -newAmount, type: BALANCE_TYPES.EXPENSE, date: today })
      }
    } else if (newAccountId && oldAmount !== newAmount) {
      // Same account, amount changed: apply the difference only
      await supabase.from('balance').insert({ account_id: newAccountId, amount: -(newAmount - oldAmount), type: BALANCE_TYPES.EXPENSE, date: today })
    }

    setSaving(false)
    setEditTarget(null)
    setEditForm(null)
    load()
  }

  const editCategoryId = subcategories.find((s) => s.id === Number(editForm?.subcategory_id))?.category_id ?? 0

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  // Group expenses by date (YYYY-MM-DD)
  const grouped = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <main className="min-h-screen bg-[#FFFDE1] px-4 py-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Expenses</h1>
            <Link href="/monthly-check" className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full border border-[#3F9AAE] bg-[#3F9AAE] text-white text-xs font-semibold hover:bg-[#79C9C5] hover:border-[#79C9C5] transition-colors">Monthly Checklist</Link>
          </div>
          {!loading && expenses.length > 0 && (
            <span className="text-xs text-gray-500 text-right leading-snug">
              {expenses.length} record{expenses.length !== 1 ? 's' : ''}<br />
              <span className="font-semibold text-gray-800">{total.toLocaleString('id-ID')}</span>
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : expenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <p className="text-gray-400 text-sm">No expenses yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => {
              const rows = grouped[date]
              const dayTotal = rows.reduce((s, e) => s + Number(e.amount), 0)
              return (
                <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[#FFFDE1]/50">
                    <span className="text-sm font-semibold text-gray-700 capitalize">
                      {formatCardDate(date)}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">
                      {dayTotal.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Expense rows */}
                  <div className="divide-y divide-gray-50">
                    {rows.map((e) => (
                      <div
                        key={e.id}
                        className={`flex items-center gap-3 px-4 py-3 transition-opacity ${deleting === e.id ? 'opacity-40' : ''}`}
                      >
                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{e.expense_name}</p>
                            {e.family_member && (
                              <span className="shrink-0 inline-flex items-center rounded-full bg-[#3F9AAE]/10 px-2 py-0.5 text-xs font-medium text-[#3F9AAE]">
                                {e.family_member}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {e.subcategories?.name ?? '—'}
                            <span className="text-gray-300"> ({e.subcategories?.categories?.name ?? '—'})</span>
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="shrink-0 w-24 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {Number(e.amount).toLocaleString('id-ID')}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="shrink-0 flex items-center gap-3">
                          <button
                            onClick={() => openEdit(e)}
                            title="Edit"
                            className="text-amber-500 hover:text-amber-600 transition-colors"
                          >
                            <i className="fa-solid fa-pen-to-square text-sm" />
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            disabled={deleting === e.id}
                            title="Delete"
                            className="text-[#FA6781] hover:text-[#e85570] transition-colors disabled:opacity-40"
                          >
                            {deleting === e.id
                              ? <i className="fa-solid fa-spinner fa-spin text-sm" />
                              : <i className="fa-solid fa-trash text-sm" />
                            }
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Grand total */}
            <div className="flex justify-between items-center bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-sm font-bold text-gray-900">{total.toLocaleString('id-ID')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editTarget && editForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900">Edit Expense</h2>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expense Name</label>
              <input
                type="text"
                value={editForm.expense_name}
                onChange={(e) => setEditForm({ ...editForm, expense_name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3F9AAE]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <input
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3F9AAE]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                value={editCategoryId || ''}
                onChange={(e) => {
                  const firstSub = subcategories.find((s) => s.category_id === Number(e.target.value))
                  setEditForm({ ...editForm, subcategory_id: firstSub ? String(firstSub.id) : '' })
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#3F9AAE]"
              >
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subcategory</label>
              <select
                value={editForm.subcategory_id}
                onChange={(e) => setEditForm({ ...editForm, subcategory_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#3F9AAE]"
              >
                <option value="">Select subcategory</option>
                {subcategories
                  .filter((s) => s.category_id === editCategoryId)
                  .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
              <select
                value={editForm.account_id}
                onChange={(e) => setEditForm({ ...editForm, account_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#3F9AAE]"
              >
                <option value="">—</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Family Member</label>
                <select
                  value={editForm.family_member}
                  onChange={(e) => setEditForm({ ...editForm, family_member: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#3F9AAE]"
                >
                  <option value="">—</option>
                  {FAMILY_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3F9AAE]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-[#3F9AAE] py-2.5 text-sm font-medium text-white hover:bg-[#4a9d81] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditTarget(null); setEditForm(null) }}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* FAB */}
      <Link href="/outflow" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-14 h-14 rounded-full bg-[#FFC94D] text-white text-3xl shadow-xl hover:bg-[#f0b93d] active:scale-95 transition-all flex items-center justify-center select-none">
        +
      </Link>
    </main>
  )
}

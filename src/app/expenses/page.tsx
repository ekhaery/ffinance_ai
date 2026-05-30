'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const FAMILY_MEMBERS = ['Husband', 'Wife', 'Kid']

type Subcategory = { id: number; name: string; category_id: number }
type Category = { id: number; name: string }

type Expense = {
  id: number
  expense_name: string
  amount: number
  date: string
  family_member: string | null
  subcategory_id: number
  subcategories: { name: string; categories: { name: string } }
}

type EditForm = {
  expense_name: string
  amount: string
  subcategory_id: string
  family_member: string
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
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<Expense | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  async function load() {
    const { data } = await supabase
      .from('expenses')
      .select('id, expense_name, amount, date, family_member, subcategory_id, subcategories(name, categories(name))')
      .order('date', { ascending: false })
      .order('id', { ascending: false })
    setExpenses((data as unknown as Expense[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('categories').select('id, name').order('name').then(({ data }) => setCategories(data ?? []))
    supabase.from('subcategories').select('id, name, category_id').order('name').then(({ data }) => setSubcategories(data ?? []))
  }, [])

  function openEdit(e: Expense) {
    setEditTarget(e)
    setEditForm({
      expense_name: e.expense_name,
      amount: String(e.amount),
      subcategory_id: String(e.subcategory_id),
      family_member: e.family_member ?? '',
      date: e.date,
    })
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this expense?')) return
    setDeleting(id)
    await supabase.from('expenses').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  async function handleSave() {
    if (!editTarget || !editForm) return
    setSaving(true)
    await supabase.from('expenses').update({
      expense_name: editForm.expense_name.trim(),
      amount: Number(editForm.amount),
      subcategory_id: Number(editForm.subcategory_id),
      family_member: editForm.family_member || null,
      date: editForm.date,
      updated_at: new Date().toISOString(),
    }).eq('id', editTarget.id)
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
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Expenses</h1>
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
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
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
                              <span className="shrink-0 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
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
                            className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <input
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select subcategory</option>
                {subcategories
                  .filter((s) => s.category_id === editCategoryId)
                  .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Family Member</label>
                <select
                  value={editForm.family_member}
                  onChange={(e) => setEditForm({ ...editForm, family_member: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Account = { id: number; name: string }

type Income = {
  id: number
  amount: number
  date: string
  account_id: number
  accounts: { name: string }
}

type EditForm = {
  amount: string
  account_id: string
  date: string
}

function formatCardDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function IncomePage() {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  // Create form
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ amount: '', account_id: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Edit modal
  const [editTarget, setEditTarget] = useState<Income | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState<number | null>(null)

  async function load() {
    const { data } = await supabase
      .from('income')
      .select('id, amount, date, account_id, accounts(name)')
      .order('date', { ascending: false })
      .order('id', { ascending: false })
    setIncomes((data as unknown as Income[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('accounts').select('id, name').order('name').then(({ data }) => setAccounts(data ?? []))
  }, [])

  // Create
  function validateForm() {
    const e: Record<string, string> = {}
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Amount must be greater than 0.'
    if (!form.account_id) e.account_id = 'Account is required.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateForm()
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setFormErrors({})
    setSubmitting(true)
    await supabase.from('income').insert({
      amount: Number(form.amount),
      account_id: Number(form.account_id),
      date: new Date().toISOString().slice(0, 10),
    })
    setSubmitting(false)
    setForm({ amount: '', account_id: '' })
    setFormOpen(false)
    load()
  }

  // Edit
  function openEdit(inc: Income) {
    setEditTarget(inc)
    setEditForm({
      amount: String(inc.amount),
      account_id: String(inc.account_id),
      date: inc.date,
    })
  }

  async function handleSave() {
    if (!editTarget || !editForm) return
    setSaving(true)
    await supabase.from('income').update({
      amount: Number(editForm.amount),
      account_id: Number(editForm.account_id),
      date: editForm.date,
      updated_at: new Date().toISOString(),
    }).eq('id', editTarget.id)
    setSaving(false)
    setEditTarget(null)
    setEditForm(null)
    load()
  }

  // Delete
  async function handleDelete(id: number) {
    if (!confirm('Delete this income record?')) return
    setDeleting(id)
    await supabase.from('income').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  const total = incomes.reduce((s, i) => s + Number(i.amount), 0)

  // Group by date
  const grouped = incomes.reduce<Record<string, Income[]>>((acc, i) => {
    if (!acc[i.date]) acc[i.date] = []
    acc[i.date].push(i)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Income</h1>
            {!loading && incomes.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {incomes.length} record{incomes.length !== 1 ? 's' : ''} ·{' '}
                <span className="font-semibold text-gray-700">{total.toLocaleString('id-ID')}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => setFormOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Add Income
          </button>
        </div>

        {/* List */}
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : incomes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <p className="text-gray-400 text-sm">No income records yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => {
              const rows = grouped[date]
              const dayTotal = rows.reduce((s, i) => s + Number(i.amount), 0)
              return (
                <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <span className="text-sm font-semibold text-gray-700 capitalize">{formatCardDate(date)}</span>
                    <span className="text-xs font-semibold text-gray-500">{dayTotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {rows.map((inc) => (
                      <div key={inc.id} className={`flex items-center gap-3 px-4 py-3 transition-opacity ${deleting === inc.id ? 'opacity-40' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{inc.accounts?.name ?? '—'}</p>
                        </div>
                        <div className="shrink-0">
                          <span className="text-sm font-semibold text-green-700">
                            {Number(inc.amount).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center gap-3">
                          <button onClick={() => openEdit(inc)} title="Edit" className="text-amber-500 hover:text-amber-600 transition-colors">
                            <i className="fa-solid fa-pen-to-square text-sm" />
                          </button>
                          <button
                            onClick={() => handleDelete(inc.id)}
                            disabled={deleting === inc.id}
                            title="Delete"
                            className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                          >
                            {deleting === inc.id
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
              <span className="text-sm font-bold text-green-700">{total.toLocaleString('id-ID')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Add Income</h2>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Income Amount <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.amount ? 'border-red-400' : 'border-gray-300'}`}
              />
              {formErrors.amount && <p className="mt-1 text-xs text-red-500">{formErrors.amount}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account <span className="text-red-500">*</span></label>
              <select
                value={form.account_id}
                onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                className={`w-full rounded-lg border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.account_id ? 'border-red-400' : 'border-gray-300'}`}
              >
                <option value="">Select account</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {formErrors.account_id && <p className="mt-1 text-xs text-red-500">{formErrors.account_id}</p>}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Saving…' : 'Submit'}
              </button>
              <button
                onClick={() => { setFormOpen(false); setFormErrors({}) }}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && editForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Edit Income</h2>

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
              <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
              <select
                value={editForm.account_id}
                onChange={(e) => setEditForm({ ...editForm, account_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select account</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
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

            <div className="flex gap-3 pt-1">
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

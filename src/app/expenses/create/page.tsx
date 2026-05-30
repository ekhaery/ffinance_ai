'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FAMILY_MEMBERS } from '@/lib/constants'

type Subcategory = { id: number; name: string }
type Account = { id: number; name: string }

export default function CreateExpensePage() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [form, setForm] = useState({
    expense_name: '',
    amount: '',
    subcategory_id: '',
    family_member: '',
    account_id: '',
  })
  const [subQuery, setSubQuery] = useState('')
  const [subOpen, setSubOpen] = useState(false)
  const subRef = useRef<HTMLDivElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.from('subcategories').select('id, name').order('name').then(({ data }) => setSubcategories(data ?? []))
    supabase.from('accounts').select('id, name').order('name').then(({ data }) => setAccounts(data ?? []))
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (subRef.current && !subRef.current.contains(e.target as Node)) setSubOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredSubs = subcategories.filter((s) =>
    s.name.toLowerCase().includes(subQuery.toLowerCase())
  )

  function selectSub(s: Subcategory) {
    setForm({ ...form, subcategory_id: String(s.id) })
    setSubQuery(s.name)
    setSubOpen(false)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.expense_name.trim()) e.expense_name = 'Expense name is required.'
    else if (form.expense_name.length > 255) e.expense_name = 'Maximum 255 characters.'
    if (!form.amount) e.amount = 'Amount is required.'
    else if (Number(form.amount) <= 0) e.amount = 'Amount must be greater than 0.'
    if (!form.subcategory_id) e.subcategory_id = 'Subcategory is required.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSubmitting(true)
    const { error } = await supabase.from('expenses').insert({
      expense_name: form.expense_name.trim(),
      amount: Number(form.amount),
      subcategory_id: Number(form.subcategory_id),
      family_member: form.family_member || null,
      account_id: form.account_id ? Number(form.account_id) : null,
    })
    setSubmitting(false)
    if (error) { setErrors({ submit: error.message }); return }
    setSuccess(true)
    setForm({ expense_name: '', amount: '', subcategory_id: '', family_member: '', account_id: '' })
    setSubQuery('')
    setTimeout(() => setSuccess(false), 4000)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Create Expense</h1>

        {success && (
          <div className="mb-5 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Expense saved successfully!
          </div>
        )}

        {errors.submit && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expense Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={255}
              value={form.expense_name}
              onChange={(e) => setForm({ ...form, expense_name: e.target.value })}
              placeholder="e.g. Monthly Netflix"
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.expense_name ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.expense_name && <p className="mt-1 text-xs text-red-500">{errors.expense_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0"
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.amount ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
          </div>

          {/* Subcategory combobox */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subcategory <span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={subRef}>
              <input
                type="text"
                value={subQuery}
                onChange={(e) => {
                  setSubQuery(e.target.value)
                  setForm({ ...form, subcategory_id: '' })
                  setSubOpen(true)
                }}
                onFocus={() => setSubOpen(true)}
                placeholder="Type or select subcategory…"
                autoComplete="off"
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.subcategory_id ? 'border-red-400' : 'border-gray-300'}`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setSubOpen((o) => !o)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <svg className={`w-4 h-4 transition-transform ${subOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {subOpen && (
                <ul className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
                  {filteredSubs.length === 0 ? (
                    <li className="px-3 py-2 text-gray-400">No results</li>
                  ) : (
                    filteredSubs.map((s) => (
                      <li
                        key={s.id}
                        onMouseDown={() => selectSub(s)}
                        className={`px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-700 ${form.subcategory_id === String(s.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                      >
                        {s.name}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
            {errors.subcategory_id && <p className="mt-1 text-xs text-red-500">{errors.subcategory_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            <select
              value={form.account_id}
              onChange={(e) => setForm({ ...form, account_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">—</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Family Member</label>
            <select
              value={form.family_member}
              onChange={(e) => setForm({ ...form, family_member: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">—</option>
              {FAMILY_MEMBERS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving…' : 'Submit'}
          </button>
        </form>
      </div>
    </main>
  )
}

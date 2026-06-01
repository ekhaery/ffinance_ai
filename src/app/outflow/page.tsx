'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { FAMILY_MEMBERS, BALANCE_TYPES } from '@/lib/constants'

type Subcategory = { id: number; name: string; categories: { name: string } | null }
type Account = { id: number; name: string }

type Tab = 'expense' | 'transfer'

// ─── Shared data ────────────────────────────────────────────────────────────

function useSharedData() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [balances, setBalances] = useState<Record<number, number>>({})

  useEffect(() => {
    supabase.from('subcategories').select('id, name, categories(name)').order('name')
      .then(({ data }) => setSubcategories((data as unknown as Subcategory[]) ?? []))
    supabase.from('accounts').select('id, name').order('name')
      .then(({ data }) => setAccounts(data ?? []))
    supabase.from('balance').select('account_id, amount')
      .then(({ data }) => {
        const map: Record<number, number> = {}
        ;(data ?? []).forEach((r: { account_id: number; amount: number }) => {
          map[r.account_id] = (map[r.account_id] ?? 0) + Number(r.amount)
        })
        setBalances(map)
      })
  }, [])

  return { subcategories, accounts, balances }
}

// ─── Create Expense form ─────────────────────────────────────────────────────

function ExpenseForm({ subcategories, accounts }: { subcategories: Subcategory[]; accounts: Account[] }) {
  const [form, setForm] = useState({ expense_name: '', amount: '', subcategory_id: '', family_member: '', account_id: '' })
  const [subQuery, setSubQuery] = useState('')
  const [subOpen, setSubOpen] = useState(false)
  const subRef = useRef<HTMLDivElement>(null)
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([])
  const [nameOpen, setNameOpen] = useState(false)
  const nameRef = useRef<HTMLDivElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (subRef.current && !subRef.current.contains(e.target as Node)) setSubOpen(false)
      if (nameRef.current && !nameRef.current.contains(e.target as Node)) setNameOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const q = form.expense_name.trim()
    if (q.length < 1) { setNameSuggestions([]); setNameOpen(false); return }
    supabase.from('expenses').select('expense_name').ilike('expense_name', `%${q}%`).order('id', { ascending: false }).limit(30)
      .then(({ data }) => {
        if (!data) return
        const seen = new Set<string>(); const exact: string[] = []; const others: string[] = []
        data.forEach((r: { expense_name: string }) => {
          if (seen.has(r.expense_name)) return; seen.add(r.expense_name)
          r.expense_name.toLowerCase() === q.toLowerCase() ? exact.push(r.expense_name) : others.push(r.expense_name)
        })
        others.sort((a, b) => a.localeCompare(b))
        const suggestions = [...exact, ...others].slice(0, 8)
        setNameSuggestions(suggestions); setNameOpen(suggestions.length > 0)
      })
  }, [form.expense_name])

  async function autofill(name: string) {
    setForm((prev) => ({ ...prev, expense_name: name })); setNameOpen(false)
    const { data } = await supabase.from('expenses').select('expense_name, amount, subcategory_id, account_id, family_member')
      .eq('expense_name', name).order('id', { ascending: false }).limit(1).single()
    if (!data) return
    const sub = subcategories.find((s) => s.id === data.subcategory_id)
    setForm((prev) => ({ ...prev, amount: String(data.amount ?? ''), subcategory_id: data.subcategory_id ? String(data.subcategory_id) : '', account_id: data.account_id ? String(data.account_id) : '', family_member: data.family_member ?? '' }))
    if (sub) setSubQuery(sub.name)
  }

  const filteredSubs = subcategories.filter((s) => s.name.toLowerCase().includes(subQuery.toLowerCase()))
  function selectSub(s: Subcategory) { setForm((prev) => ({ ...prev, subcategory_id: String(s.id) })); setSubQuery(s.name); setSubOpen(false) }

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
    setErrors({}); setSubmitting(true)
    const { data: newExpense, error } = await supabase.from('expenses').insert({
      expense_name: form.expense_name.trim(), amount: Number(form.amount),
      subcategory_id: Number(form.subcategory_id), family_member: form.family_member || null,
      account_id: form.account_id ? Number(form.account_id) : null,
      balance_recorded: !!form.account_id,
    }).select('id').single()
    setSubmitting(false)
    if (error) { setErrors({ submit: error.message }); return }
    if (form.account_id) {
      await supabase.from('balance').insert({ account_id: Number(form.account_id), amount: -Number(form.amount), type: BALANCE_TYPES.EXPENSE, date: new Date().toISOString().slice(0, 10), expense_id: newExpense?.id ?? null })
    }
    setSuccess(true)
    setForm({ expense_name: '', amount: '', subcategory_id: '', family_member: '', account_id: '' }); setSubQuery('')
    setTimeout(() => setSuccess(false), 4000)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {success && <div className="rounded-lg bg-[#121358]/10 border border-[#121358]/30 px-4 py-3 text-sm text-[#121358]">Expense saved successfully!</div>}
      {errors.submit && <div className="rounded-lg bg-[#FA6781]/10 border border-[#FA6781]/30 px-4 py-3 text-sm text-[#FA6781]">{errors.submit}</div>}

      {/* Expense Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Expense Name <span className="text-[#FA6781]">*</span></label>
        <div className="relative" ref={nameRef}>
          <input type="text" maxLength={255} value={form.expense_name} onChange={(e) => setForm({ ...form, expense_name: e.target.value })}
            onFocus={() => nameSuggestions.length > 0 && setNameOpen(true)} placeholder="e.g. Monthly Netflix" autoComplete="off"
            className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#F4B342] ${errors.expense_name ? 'border-[#FA6781]' : 'border-[#F4B342]'}`} />
          {nameOpen && nameSuggestions.length > 0 && (
            <ul className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto text-sm">
              {nameSuggestions.map((name) => (
                <li key={name} onMouseDown={() => autofill(name)} className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#121358]/10 hover:text-[#121358] text-gray-700">
                  <span>{name}</span><span className="text-xs text-gray-400 ml-2">autofill</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {errors.expense_name && <p className="mt-1 text-xs text-[#FA6781]">{errors.expense_name}</p>}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount <span className="text-[#FA6781]">*</span></label>
        <input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0"
          className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#F4B342] ${errors.amount ? 'border-[#FA6781]' : 'border-[#F4B342]'}`} />
        {errors.amount && <p className="mt-1 text-xs text-[#FA6781]">{errors.amount}</p>}
      </div>

      {/* Subcategory */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory <span className="text-[#FA6781]">*</span></label>
        <div className="relative" ref={subRef}>
          <input type="text" value={subQuery} onChange={(e) => { setSubQuery(e.target.value); setForm((prev) => ({ ...prev, subcategory_id: '' })); setSubOpen(true) }}
            onFocus={() => setSubOpen(true)} placeholder="Type or select subcategory…" autoComplete="off"
            className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#F4B342] ${errors.subcategory_id ? 'border-[#FA6781]' : 'border-[#F4B342]'}`} />
          <button type="button" tabIndex={-1} onClick={() => setSubOpen((o) => !o)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className={`w-4 h-4 transition-transform ${subOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
          {subOpen && (
            <ul className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
              {filteredSubs.length === 0 ? <li className="px-3 py-2 text-gray-400">No results</li> : filteredSubs.map((s) => (
                <li key={s.id} onMouseDown={() => selectSub(s)}
                  className={`px-3 py-2 cursor-pointer hover:bg-[#121358]/10 hover:text-[#121358] ${form.subcategory_id === String(s.id) ? 'bg-[#121358]/10 text-[#121358] font-medium' : 'text-gray-700'}`}>
                  {s.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        {errors.subcategory_id && <p className="mt-1 text-xs text-[#FA6781]">{errors.subcategory_id}</p>}
        {form.subcategory_id && (() => {
          const cat = subcategories.find((s) => s.id === Number(form.subcategory_id))?.categories?.name
          return cat ? <p className="mt-1 text-xs text-gray-400">Category: <span className="font-medium text-gray-500">{cat}</span></p> : null
        })()}
      </div>

      {/* Account chips */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Account</label>
        <div className="flex flex-wrap gap-2">
          {accounts.map((a) => (
            <button key={a.id} type="button" onClick={() => setForm((prev) => ({ ...prev, account_id: prev.account_id === String(a.id) ? '' : String(a.id) }))}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${form.account_id === String(a.id) ? 'bg-[#F4B342] border-[#F4B342] text-white' : 'bg-white border-[#F4B342] text-gray-700 hover:border-[#F4B342] hover:text-[#F4B342]'}`}>
              {a.name.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Family Member chips */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Family Member</label>
        <div className="flex flex-wrap gap-2">
          {FAMILY_MEMBERS.map((m) => (
            <button key={m} type="button" onClick={() => setForm((prev) => ({ ...prev, family_member: prev.family_member === m ? '' : m }))}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${form.family_member === m ? 'bg-[#F4B342] border-[#F4B342] text-white' : 'bg-white border-[#F4B342] text-gray-700 hover:border-[#F4B342] hover:text-[#F4B342]'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={submitting}
        className="w-full rounded-lg bg-[#121358] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6668a8] disabled:opacity-50 transition-colors">
        {submitting ? 'Saving…' : 'Submit'}
      </button>
    </form>
  )
}

// ─── Pemindahan Dana form ────────────────────────────────────────────────────

function TransferForm({ accounts, balances }: { accounts: Account[]; balances: Record<number, number> }) {
  const [amount, setAmount] = useState('')
  const [fromId, setFromId] = useState<number | null>(null)
  const [toId, setToId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [localBalances, setLocalBalances] = useState(balances)

  useEffect(() => { setLocalBalances(balances) }, [balances])

  function validate() {
    const e: Record<string, string> = {}
    const amt = Number(amount)
    if (!amount || amt <= 0) e.amount = 'Amount must be greater than 0.'
    if (!fromId) e.from = 'Source account is required.'
    if (!toId) e.to = 'Destination account is required.'
    if (fromId && toId && fromId === toId) e.to = 'Source and destination accounts must be different.'
    if (fromId && amt > 0 && (localBalances[fromId] ?? 0) < amt) e.amount = 'Insufficient balance.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({}); setSubmitting(true)
    const amt = Number(amount); const today = new Date().toISOString().slice(0, 10)
    await supabase.from('balance').insert([
      { account_id: fromId, amount: -amt, type: BALANCE_TYPES.TRANSFER_OUT, date: today },
      { account_id: toId, amount: amt, type: BALANCE_TYPES.TRANSFER_IN, date: today },
    ])
    // Refresh balances
    supabase.from('balance').select('account_id, amount').then(({ data }) => {
      const map: Record<number, number> = {}
      ;(data ?? []).forEach((r: { account_id: number; amount: number }) => { map[r.account_id] = (map[r.account_id] ?? 0) + Number(r.amount) })
      setLocalBalances(map)
    })
    setSubmitting(false); setSuccess(true)
    setAmount(''); setFromId(null); setToId(null)
    setTimeout(() => setSuccess(false), 4000)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {success && <div className="rounded-lg bg-[#121358]/10 border border-[#121358]/30 px-4 py-3 text-sm text-[#121358]">Transfer berhasil!</div>}

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount <span className="text-[#FA6781]">*</span></label>
        <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
          className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#F4B342] ${errors.amount ? 'border-[#FA6781]' : 'border-[#F4B342]'}`} />
        {errors.amount && <p className="mt-1 text-xs text-[#FA6781]">{errors.amount}</p>}
      </div>

      {/* From Account */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">From Account <span className="text-[#FA6781]">*</span></label>
        <div className="flex flex-wrap gap-2">
          {accounts.map((a) => (
            <button key={a.id} type="button" onClick={() => setFromId(fromId === a.id ? null : a.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${fromId === a.id ? 'bg-[#F4B342] border-[#F4B342] text-white' : 'bg-white border-[#F4B342] text-gray-700 hover:border-[#F4B342] hover:text-[#F4B342]'}`}>
              {a.name.toUpperCase()}
            </button>
          ))}
        </div>
        {errors.from && <p className="mt-1 text-xs text-[#FA6781]">{errors.from}</p>}
      </div>

      {/* To Account */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">To Account <span className="text-[#FA6781]">*</span></label>
        <div className="flex flex-wrap gap-2">
          {accounts.map((a) => (
            <button key={a.id} type="button" onClick={() => setToId(toId === a.id ? null : a.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${toId === a.id ? 'bg-[#F4B342] border-[#F4B342] text-white' : 'bg-white border-[#F4B342] text-gray-700 hover:border-[#F4B342] hover:text-[#F4B342]'}`}>
              {a.name.toUpperCase()}
            </button>
          ))}
        </div>
        {errors.to && <p className="mt-1 text-xs text-[#FA6781]">{errors.to}</p>}
      </div>

      {/* Preview */}
      {fromId && toId && fromId !== toId && Number(amount) > 0 && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm space-y-1">
          <p className="font-medium text-gray-700 mb-2">Preview</p>
          <div className="flex justify-between text-gray-600">
            <span>{accounts.find(a => a.id === fromId)?.name}</span>
            <span className="text-[#FA6781] font-medium">{(localBalances[fromId] ?? 0).toLocaleString('id-ID')} → {((localBalances[fromId] ?? 0) - Number(amount)).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>{accounts.find(a => a.id === toId)?.name}</span>
            <span className="text-[#121358] font-medium">{(localBalances[toId] ?? 0).toLocaleString('id-ID')} → {((localBalances[toId] ?? 0) + Number(amount)).toLocaleString('id-ID')}</span>
          </div>
        </div>
      )}

      <button type="submit" disabled={submitting}
        className="w-full rounded-lg bg-[#121358] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6668a8] disabled:opacity-50 transition-colors">
        {submitting ? 'Memproses…' : 'Submit'}
      </button>
    </form>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function OutflowPage() {
  const [activeTab, setActiveTab] = useState<Tab>('expense')
  const { subcategories, accounts, balances } = useSharedData()

  const tabs: { key: Tab; label: string }[] = [
    { key: 'expense', label: 'Create Expense' },
    { key: 'transfer', label: 'Pemindahan Dana' },
  ]

  return (
    <main className="min-h-screen bg-[#ffffff] flex items-start justify-center pt-12 px-4 pb-16">
      <div className="w-full max-w-md">
        {/* Segmented control */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1 mb-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${
                activeTab === t.key
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* See Monthly Checklist shortcut */}
        {activeTab === 'expense' && (
          <Link href="/monthly-check" className="flex items-center justify-center gap-1.5 mb-3 w-full py-2 rounded-lg bg-[#F4B342] text-[#121358] text-sm font-semibold hover:bg-[#f0b93d] transition-colors">
            <i className="fa-solid fa-calendar-check text-xs" /> See Monthly Checklist
          </Link>
        )}

        {/* Form content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {activeTab === 'expense'
            ? <ExpenseForm subcategories={subcategories} accounts={accounts} />
            : <TransferForm accounts={accounts} balances={balances} />
          }
        </div>
      </div>
    </main>
  )
}

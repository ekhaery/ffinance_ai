'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type DetailRow = {
  id: number
  name: string | null
  amount: number
  subcategory_id: number
  categories: { name: string }
  subcategories: { name: string }
}

type Template = {
  id: number
  template_name: string
  created_at: string
  template_details: DetailRow[]
}

type MonthExpense = {
  expense_name: string
  subcategory_id: number
}

// Returns YYYY-MM string for current month
function currentYearMonth() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

export default function MonthlyCheckPage() {
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState<number | null>(null)

  // Load template once
  useEffect(() => {
    supabase
      .from('templates')
      .select('id, template_name, created_at, template_details(id, name, amount, subcategory_id, categories(name), subcategories(name))')
      .eq('is_used', true)
      .single()
      .then(({ data }) => {
        setTemplate(data as unknown as Template)
        setLoading(false)
      })
  }, [])

  // Validate against expenses whenever template or selectedMonth changes
  useEffect(() => {
    if (!template) return

    const [y, m] = selectedMonth.split('-')
    const firstDay = `${y}-${m}-01`
    const lastDay = new Date(Number(y), Number(m), 0).toISOString().slice(0, 10) // last day of month

    supabase
      .from('expenses')
      .select('expense_name, subcategory_id')
      .gte('date', firstDay)
      .lte('date', lastDay)
      .then(({ data }) => {
        const monthExpenses: MonthExpense[] = (data as unknown as MonthExpense[]) ?? []
        const matchedIds = new Set<number>()

        template.template_details.forEach((detail) => {
          const detailName = detail.name ?? detail.subcategories?.name ?? ''
          const match = monthExpenses.some(
            (exp) =>
              exp.expense_name === detailName &&
              exp.subcategory_id === detail.subcategory_id
          )
          if (match) matchedIds.add(detail.id)
        })

        setChecked(matchedIds)
      })
  }, [template, selectedMonth])

  async function handleCheck(row: DetailRow) {
    if (checked.has(row.id)) return
    setSaving(row.id)
    await supabase.from('expenses').insert({
      expense_name: row.name ?? row.subcategories?.name,
      subcategory_id: row.subcategory_id,
      amount: Number(row.amount),
      date: new Date().toISOString().slice(0, 10), // today's date
    })
    setSaving(null)
    setChecked((prev) => new Set([...prev, row.id]))
  }

  if (loading) return <main className="p-12 text-sm text-gray-500">Loading…</main>

  if (!template) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 text-sm">No default template set yet.</p>
          <Link href="/templates" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Go to Templates to mark one as default
          </Link>
        </div>
      </main>
    )
  }

  const total = template.template_details.reduce((s, d) => s + Number(d.amount), 0)
  const checkedTotal = template.template_details
    .filter((d) => checked.has(d.id))
    .reduce((s, d) => s + Number(d.amount), 0)

  const grouped = template.template_details.reduce<Record<string, DetailRow[]>>((acc, d) => {
    const cat = d.categories?.name ?? 'Uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(d)
    return acc
  }, {})

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-blue-600 mb-1">Monthly Check</p>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">{template.template_name}</h1>
          </div>
          {/* Edit button hidden for now */}
        </div>

        {/* Month picker */}
        <div className="mb-5 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 shrink-0">Month</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <span className="text-sm text-gray-500">{monthLabel(selectedMonth)}</span>
        </div>

        {/* Progress bar */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${total > 0 ? (checkedTotal / total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {checked.size} / {template.template_details.length} checked
          </span>
        </div>

        {/* Groups */}
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, rows]) => {
            const subtotal = rows.reduce((s, r) => s + Number(r.amount), 0)
            return (
              <div key={category} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{category}</span>
                  <span className="text-xs font-semibold text-gray-700">{subtotal.toLocaleString('id-ID')}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((d) => {
                      const isChecked = checked.has(d.id)
                      const isSaving = saving === d.id
                      return (
                        <tr
                          key={d.id}
                          className={`border-b border-gray-50 transition-colors ${isChecked ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-5 py-3">
                            {d.name ? (
                              <span className={isChecked ? 'text-green-700 line-through' : 'text-gray-700'}>
                                {d.name} <span className="font-normal opacity-60">· {d.subcategories?.name}</span>
                              </span>
                            ) : (
                              <span className={isChecked ? 'text-green-700 line-through' : 'text-gray-700'}>
                                {d.subcategories?.name}
                              </span>
                            )}
                          </td>
                          <td className={`px-5 py-3 text-right font-medium ${isChecked ? 'text-green-700' : 'text-gray-900'}`}>
                            {Number(d.amount).toLocaleString('id-ID')}
                          </td>
                          <td className="px-5 py-3 text-right w-12">
                            <button
                              onClick={() => handleCheck(d)}
                              disabled={isChecked || isSaving}
                              title={isChecked ? 'Already recorded' : 'Mark as done'}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ml-auto ${
                                isChecked
                                  ? 'border-green-500 bg-green-500 cursor-default'
                                  : isSaving
                                  ? 'border-gray-300 opacity-50'
                                  : 'border-gray-300 hover:border-blue-400'
                              }`}
                            >
                              {isChecked && (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                              {isSaving && <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>

        {/* Totals */}
        <div className="mt-4 flex justify-end gap-3">
          {checked.size > 0 && (
            <div className="rounded-xl bg-green-600 px-6 py-3 text-right">
              <p className="text-xs text-green-200 mb-0.5">Posted</p>
              <p className="text-lg font-bold text-white">{checkedTotal.toLocaleString('id-ID')}</p>
            </div>
          )}
          <div className="rounded-xl bg-blue-600 px-6 py-3 text-right">
            <p className="text-xs text-blue-200 mb-0.5">Total Budget</p>
            <p className="text-lg font-bold text-white">{total.toLocaleString('id-ID')}</p>
          </div>
        </div>

      </div>
    </main>
  )
}

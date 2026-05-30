'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Category, Subcategory, TemplateDetail } from '@/lib/types'

type Props = {
  initialName?: string
  initialRows?: TemplateDetail[]
  initialIsUsed?: boolean
  templateId?: number
}

const emptyRow = (): TemplateDetail => ({ name: '', category_id: 0, subcategory_id: 0, amount: '' })

export default function TemplateForm({ initialName = '', initialRows, initialIsUsed = false, templateId }: Props) {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [name, setName] = useState(initialName)
  const [isUsed, setIsUsed] = useState(initialIsUsed)
  const [rows, setRows] = useState<TemplateDetail[]>(initialRows ?? [emptyRow()])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase.from('categories').select('id, name').order('name').then(({ data }) => setCategories(data ?? []))
    supabase.from('subcategories').select('id, category_id, name').order('name').then(({ data }) => setSubcategories(data ?? []))
  }, [])

  useEffect(() => { if (initialName) setName(initialName) }, [initialName])
  useEffect(() => { if (initialRows) setRows(initialRows) }, [initialRows])
  useEffect(() => { setIsUsed(initialIsUsed) }, [initialIsUsed])

  function subcategoriesFor(category_id: number) {
    return subcategories.filter((s) => s.category_id === category_id)
  }

  function updateRow(i: number, patch: Partial<TemplateDetail>) {
    setRows((prev) => prev.map((r, idx) => {
      if (idx !== i) return r
      const updated = { ...r, ...patch }
      if ('category_id' in patch) updated.subcategory_id = 0
      return updated
    }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Template name is required.'
    else if (name.length > 255) e.name = 'Maximum 255 characters.'
    if (rows.length === 0) e.rows = 'Add at least one row.'
    rows.forEach((r, i) => {
      if (!r.category_id) e[`cat_${i}`] = 'Required.'
      if (!r.subcategory_id) e[`sub_${i}`] = 'Required.'
      if (!r.amount || Number(r.amount) <= 0) e[`amt_${i}`] = 'Must be > 0.'
    })
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSubmitting(true)

    const detailRows = rows.map((r) => ({
      category_id: r.category_id,
      subcategory_id: r.subcategory_id,
      amount: Number(r.amount),
      name: r.name.trim() || null,
    }))

    if (templateId) {
      await supabase.from('templates').update({ template_name: name.trim(), is_used: isUsed, updated_at: new Date().toISOString() }).eq('id', templateId)
      await supabase.from('template_details').delete().eq('template_id', templateId)
      await supabase.from('template_details').insert(detailRows.map((r) => ({ ...r, template_id: templateId })))
    } else {
      const { data: tmpl, error } = await supabase
        .from('templates')
        .insert({ template_name: name.trim(), is_used: isUsed })
        .select('id')
        .single()
      if (error || !tmpl) { setErrors({ submit: error?.message ?? 'Failed to save.' }); setSubmitting(false); return }
      await supabase.from('template_details').insert(detailRows.map((r) => ({ ...r, template_id: tmpl.id })))
    }

    setSubmitting(false)
    setSuccess(true)
    setTimeout(() => router.push('/templates'), 1200)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Saved! Redirecting…
        </div>
      )}
      {errors.submit && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{errors.submit}</div>
      )}

      {/* Template Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Template Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          maxLength={255}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Monthly Budget"
          className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>

      {/* Detail Rows */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Items</span>
          <button
            type="button"
            onClick={() => setRows((r) => [...r, emptyRow()])}
            className="text-xs text-blue-600 hover:underline"
          >
            + Add Row
          </button>
        </div>

        {errors.rows && <p className="mb-2 text-xs text-red-500">{errors.rows}</p>}

        {/* Column headers — desktop only */}
        <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 mb-1 px-0.5">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Name</span>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Category</span>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Subcategory</span>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Amount</span>
          <span />
        </div>

        <div className="space-y-4">
          {rows.map((row, i) => (
            <div key={i} className="relative bg-gray-50 md:bg-transparent rounded-xl md:rounded-none p-3 md:p-0 border border-gray-100 md:border-0 md:grid md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-start">
              {/* Remove button — top-right on mobile */}
              <button
                type="button"
                onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
                className="absolute top-2 right-2 md:static md:mt-1.5 text-gray-400 hover:text-red-500 text-lg leading-none"
                title="Remove row"
              >
                ×
              </button>

              {/* Mobile: 2-col grid for fields */}
              <div className="grid grid-cols-2 gap-2 md:contents">
                {/* Name */}
                <div className="col-span-2 md:col-auto">
                  <label className="md:hidden block text-xs text-gray-400 mb-0.5">Name</label>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(i, { name: e.target.value })}
                    placeholder="e.g. Home loan"
                    className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="md:hidden block text-xs text-gray-400 mb-0.5">Category</label>
                  <select
                    value={row.category_id || ''}
                    onChange={(e) => updateRow(i, { category_id: Number(e.target.value) })}
                    className={`w-full rounded-lg border px-2 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 ${errors[`cat_${i}`] ? 'border-red-400' : 'border-gray-300'}`}
                  >
                    <option value="">Select</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {errors[`cat_${i}`] && <p className="mt-0.5 text-xs text-red-500">{errors[`cat_${i}`]}</p>}
                </div>

                {/* Subcategory */}
                <div>
                  <label className="md:hidden block text-xs text-gray-400 mb-0.5">Subcategory</label>
                  <select
                    value={row.subcategory_id || ''}
                    onChange={(e) => updateRow(i, { subcategory_id: Number(e.target.value) })}
                    disabled={!row.category_id}
                    className={`w-full rounded-lg border px-2 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 ${errors[`sub_${i}`] ? 'border-red-400' : 'border-gray-300'}`}
                  >
                    <option value="">Select</option>
                    {subcategoriesFor(row.category_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {errors[`sub_${i}`] && <p className="mt-0.5 text-xs text-red-500">{errors[`sub_${i}`]}</p>}
                </div>

                {/* Amount */}
                <div className="col-span-2 md:col-auto">
                  <label className="md:hidden block text-xs text-gray-400 mb-0.5">Amount</label>
                  <input
                    type="number"
                    min={0}
                    value={row.amount}
                    onChange={(e) => updateRow(i, { amount: e.target.value })}
                    placeholder="0"
                    className={`w-full rounded-lg border px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white ${errors[`amt_${i}`] ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {errors[`amt_${i}`] && <p className="mt-0.5 text-xs text-red-500">{errors[`amt_${i}`]}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      {rows.length > 0 && (
        <div className="flex justify-end text-sm text-gray-600">
          Total:{' '}
          <span className="ml-2 font-semibold text-gray-900">
            {rows.reduce((s, r) => s + (Number(r.amount) || 0), 0).toLocaleString('id-ID')}
          </span>
        </div>
      )}

      {/* Default toggle */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-800">Mark as my go-to budget plan</p>
          <p className="text-xs text-gray-500 mt-0.5">This template will be used as your active budget plan</p>
        </div>
        <button
          type="button"
          onClick={() => setIsUsed((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isUsed ? 'bg-blue-600' : 'bg-gray-300'}`}
          role="switch"
          aria-checked={isUsed}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${isUsed ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Saving…' : 'Save Template'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/templates')}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type DetailRow = {
  id: number
  name: string | null
  amount: number
  categories: { name: string; color: string }
  subcategories: { name: string }
}

type TemplateData = {
  template_name: string
  created_at: string
  template_details: DetailRow[]
}

export default function ViewTemplatePage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<TemplateData | null>(null)

  useEffect(() => {
    supabase
      .from('templates')
      .select('template_name, created_at, template_details(id, name, amount, categories(name, color), subcategories(name))')
      .eq('id', id)
      .single()
      .then(({ data }) => setData(data as unknown as TemplateData))
  }, [id])

  if (!data) return <main className="p-12 text-sm text-gray-500">Loading…</main>

  const total = data.template_details.reduce((s, d) => s + Number(d.amount), 0)

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <div className="mb-4">
          <Link
            href="/templates"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-xs" />
            Back
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{data.template_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Created {new Date(data.created_at).toLocaleDateString('id-ID')}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/templates/${id}/edit`}
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            >
              Edit
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left hidden md:table-cell">Category</th>
                <th className="px-5 py-3 text-left">Subcategory</th>
                <th className="px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.template_details.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium" style={{ color: d.categories?.color ?? '#6668a8' }}>
                    {d.name ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-700 hidden md:table-cell">{d.categories?.name}</td>
                  <td className="px-5 py-3 text-gray-700">{d.subcategories?.name}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {Number(d.amount).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={2} className="px-5 py-3 text-sm font-semibold text-gray-700 md:hidden">Total Budget</td>
                <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-gray-700 hidden md:table-cell">Total Budget</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-gray-900">{total.toLocaleString('id-ID')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </main>
  )
}

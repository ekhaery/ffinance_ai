'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Template } from '@/lib/types'

export default function TemplateListPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  async function load() {
    const { data } = await supabase
      .from('templates')
      .select('id, template_name, is_used, created_at, template_details(amount)')
      .order('created_at', { ascending: false })
    setTemplates((data as Template[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: number) {
    if (!confirm('Delete this template?')) return
    setDeleting(id)
    await supabase.from('templates').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  const totalBudget = (t: Template) =>
    t.template_details.reduce((sum, d) => sum + Number(d.amount), 0)

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Templates</h1>
          <Link
            href="/templates/create"
            className="rounded-lg bg-blue-600 px-3 py-2 md:px-4 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + New
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <p className="text-gray-500 text-sm">No templates yet.</p>
            <Link href="/templates/create" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
              Create your first template
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Template Name</th>
                    <th className="px-5 py-3 text-right">Total Budget</th>
                    <th className="px-5 py-3 text-left">Created</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {templates.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 font-medium text-gray-900">
                        <span>{t.template_name}</span>
                        {t.is_used && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                            Default
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right text-gray-700">
                        {totalBudget(t).toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {new Date(t.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-5 py-4 text-right space-x-3">
                        <Link href={`/templates/${t.id}`} className="text-blue-600 hover:underline">View</Link>
                        <Link href={`/templates/${t.id}/edit`} className="text-amber-600 hover:underline">Edit</Link>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deleting === t.id}
                          className="text-red-500 hover:underline disabled:opacity-40"
                        >
                          {deleting === t.id ? '…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {templates.map((t) => (
                <div key={t.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 transition-opacity ${deleting === t.id ? 'opacity-40' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{t.template_name}</span>
                        {t.is_used && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(t.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 whitespace-nowrap shrink-0">
                      {totalBudget(t).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-2 justify-end">
                    <Link href={`/templates/${t.id}`} className="text-sm font-medium text-blue-600">View</Link>
                    <Link href={`/templates/${t.id}/edit`} className="text-sm font-medium text-amber-600">Edit</Link>
                    <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id} className="text-sm font-medium text-red-500 disabled:opacity-40">
                      {deleting === t.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Template } from '@/lib/types'

export default function TemplateListPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [copyTarget, setCopyTarget] = useState<Template | null>(null)
  const [copying, setCopying] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('templates')
      .select('id, template_name, is_used, created_at, template_details(amount)')
      .order('created_at', { ascending: true })
    setTemplates((data as unknown as Template[]) ?? [])
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

  async function handleCopy(t: Template) {
    setCopying(true)
    // Fetch full details of the template
    const { data: details } = await supabase
      .from('template_details')
      .select('name, category_id, subcategory_id, amount')
      .eq('template_id', t.id)

    // Insert new template
    const { data: newTemplate } = await supabase
      .from('templates')
      .insert({ template_name: `${t.template_name} - copy`, is_used: false })
      .select('id')
      .single()

    if (newTemplate && details) {
      await supabase.from('template_details').insert(
        details.map((d) => ({ ...d, template_id: newTemplate.id }))
      )
    }

    setCopying(false)
    setCopyTarget(null)
    load()
  }

  const totalBudget = (t: Template) =>
    t.template_details.reduce((sum, d) => sum + Number(d.amount), 0)

  return (
    <main className="min-h-screen bg-[#ffffff] px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Templates</h1>
          <Link
            href="/templates/create"
            className="rounded-lg bg-[#121358] px-3 py-2 md:px-4 text-sm font-medium text-white hover:bg-[#6668a8] transition-colors"
          >
            + New
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <p className="text-gray-500 text-sm">No templates yet.</p>
            <Link href="/templates/create" className="mt-3 inline-block text-sm text-[#121358] hover:underline">
              Create your first template
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-[#ffffff]/50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Template Name</th>
                    <th className="px-5 py-3 text-right">Total Budget</th>
                    <th className="px-5 py-3 text-left">Created</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {templates.map((t) => (
                    <tr key={t.id} onClick={() => router.push(`/templates/${t.id}`)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                      <td className="px-5 py-4 font-medium text-gray-900">
                        <span>{t.template_name}</span>
                        {t.is_used && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-[#121358]/10 px-2 py-0.5 text-xs font-medium text-[#121358] ring-1 ring-inset ring-[#121358]/20">
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
                      <td className="px-5 py-4 text-right space-x-5">
                        <button onClick={(e) => { e.stopPropagation(); setCopyTarget(t) }} className="text-[#121358] hover:opacity-70 transition-opacity"><i className="fa-solid fa-copy"></i></button>
                        <Link href={`/templates/${t.id}/edit`} onClick={(e) => e.stopPropagation()} className="text-amber-600 hover:underline"><i className="fa-solid fa-pen"></i></Link>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(t.id) }}
                          disabled={deleting === t.id}
                          className="text-[#FA6781] hover:underline disabled:opacity-40"
                        >
                          <i className={`fa-solid fa-trash ${deleting === t.id ? 'opacity-40' : ''}`}></i>
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
                <div key={t.id} onClick={() => router.push(`/templates/${t.id}`)} className={`bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 transition-opacity cursor-pointer ${deleting === t.id ? 'opacity-40' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{t.template_name}</span>
                        {t.is_used && (
                          <span className="inline-flex items-center rounded-full bg-[#121358]/10 px-2 py-0.5 text-xs font-medium text-[#121358] ring-1 ring-inset ring-[#121358]/20">
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
                  <div className="flex gap-5 mt-2 justify-end">
                    <button onClick={(e) => { e.stopPropagation(); setCopyTarget(t) }} className="text-sm font-medium text-[#121358]"><i className="fa-solid fa-copy"></i></button>
                    <Link href={`/templates/${t.id}/edit`} onClick={(e) => e.stopPropagation()} className="text-sm font-medium text-amber-600"><i className="fa-solid fa-pen"></i></Link>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id) }} disabled={deleting === t.id} className="text-sm font-medium text-[#FA6781] disabled:opacity-40">
                      <i className={`fa-solid fa-trash ${deleting === t.id ? 'opacity-40' : ''}`}></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Copy confirmation modal */}
      {copyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Copy Template?</h2>
            <p className="text-sm text-gray-600">
              A copy of <span className="font-medium text-gray-900">{copyTarget.template_name}</span> will be created as <span className="font-medium text-gray-900">{copyTarget.template_name} - copy</span>.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => handleCopy(copyTarget)}
                disabled={copying}
                className="flex-1 rounded-lg bg-[#121358] py-2.5 text-sm font-medium text-white hover:bg-[#6668a8] disabled:opacity-50 transition-colors"
              >
                {copying ? 'Copying…' : 'Yes, Copy'}
              </button>
              <button
                onClick={() => setCopyTarget(null)}
                disabled={copying}
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

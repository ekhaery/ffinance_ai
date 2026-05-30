'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TemplateDetail } from '@/lib/types'
import TemplateForm from '@/lib/TemplateForm'

export default function EditTemplatePage() {
  const { id } = useParams<{ id: string }>()
  const [name, setName] = useState('')
  const [rows, setRows] = useState<TemplateDetail[]>([])
  const [isUsed, setIsUsed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('templates')
      .select('template_name, is_used, template_details(id, name, category_id, subcategory_id, amount)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) return
        setName(data.template_name)
        setIsUsed(data.is_used ?? false)
        setRows(
          (data.template_details as { id: number; name: string | null; category_id: number; subcategory_id: number; amount: number }[]).map(
            (d) => ({ id: d.id, name: d.name ?? '', category_id: d.category_id, subcategory_id: d.subcategory_id, amount: String(d.amount) })
          )
        )
        setLoading(false)
      })
  }, [id])

  if (loading) return <main className="p-12 text-sm text-gray-500">Loading…</main>

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Template</h1>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <TemplateForm initialName={name} initialRows={rows} initialIsUsed={isUsed} templateId={Number(id)} />
        </div>
      </div>
    </main>
  )
}

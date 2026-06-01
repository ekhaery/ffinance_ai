'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Template } from '@/lib/types'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Sortable mobile card ────────────────────────────────────────────────────

function SortableCard({
  t,
  deleting,
  onView,
  onCopy,
  onDelete,
}: {
  t: Template
  deleting: number | null
  onView: (id: number) => void
  onCopy: (t: Template) => void
  onDelete: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  const totalBudget = t.template_details.reduce((sum, d) => sum + Number(d.amount), 0)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 transition-opacity ${deleting === t.id ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 text-gray-300 hover:text-gray-500 touch-none shrink-0 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <i className="fa-solid fa-grip-vertical text-sm" />
        </button>

        {/* Card content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(t.id)}>
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
              {totalBudget.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="flex gap-5 mt-2 justify-end">
            <button onClick={(e) => { e.stopPropagation(); onCopy(t) }} className="text-sm font-medium text-[#121358]"><i className="fa-solid fa-copy" /></button>
            <Link href={`/templates/${t.id}/edit`} onClick={(e) => e.stopPropagation()} className="text-sm font-medium text-amber-600"><i className="fa-solid fa-pen" /></Link>
            <button onClick={(e) => { e.stopPropagation(); onDelete(t.id) }} disabled={deleting === t.id} className="text-sm font-medium text-[#FA6781] disabled:opacity-40">
              <i className={`fa-solid fa-trash ${deleting === t.id ? 'opacity-40' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function TemplateListPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [copyTarget, setCopyTarget] = useState<Template | null>(null)
  const [copying, setCopying] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  async function load() {
    const { data } = await supabase
      .from('templates')
      .select('id, template_name, is_used, created_at, order, template_details(amount)')
      .order('order', { ascending: true, nullsFirst: false })
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
    const { data: details } = await supabase
      .from('template_details')
      .select('name, category_id, subcategory_id, amount')
      .eq('template_id', t.id)

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = templates.findIndex((t) => t.id === active.id)
    const newIndex = templates.findIndex((t) => t.id === over.id)
    const reordered = arrayMove(templates, oldIndex, newIndex)
    setTemplates(reordered)

    // Persist new order to DB
    await Promise.all(
      reordered.map((t, idx) =>
        supabase.from('templates').update({ order: idx + 1 }).eq('id', t.id)
      )
    )
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
                        <button onClick={(e) => { e.stopPropagation(); setCopyTarget(t) }} className="text-[#121358] hover:opacity-70 transition-opacity"><i className="fa-solid fa-copy" /></button>
                        <Link href={`/templates/${t.id}/edit`} onClick={(e) => e.stopPropagation()} className="text-amber-600 hover:underline"><i className="fa-solid fa-pen" /></Link>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(t.id) }}
                          disabled={deleting === t.id}
                          className="text-[#FA6781] hover:underline disabled:opacity-40"
                        >
                          <i className={`fa-solid fa-trash ${deleting === t.id ? 'opacity-40' : ''}`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards — drag to reorder */}
            <div className="md:hidden">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                <i className="fa-solid fa-grip-vertical" /> Drag to reorder
              </p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={templates.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {templates.map((t) => (
                      <SortableCard
                        key={t.id}
                        t={t}
                        deleting={deleting}
                        onView={(id) => router.push(`/templates/${id}`)}
                        onCopy={(t) => setCopyTarget(t)}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
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

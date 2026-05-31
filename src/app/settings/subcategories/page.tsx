'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Category = { id: number; name: string }
type Subcategory = { id: number; name: string; category_id: number; categories: { name: string } }

export default function SubcategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [newName, setNewName] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  async function load() {
    const [{ data: cats }, { data: subs }] = await Promise.all([
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('subcategories').select('id, name, category_id, categories(name)').order('category_id').order('name'),
    ])
    setCategories(cats ?? [])
    setSubcategories((subs as unknown as Subcategory[]) ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!newName.trim()) errs.name = 'Name is required.'
    if (!newCategoryId) errs.category = 'Category is required.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    const { error } = await supabase.from('subcategories').insert({ name: newName.trim(), category_id: Number(newCategoryId) })
    setSaving(false)
    if (error) { setErrors({ name: error.message }); return }
    setNewName('')
    setNewCategoryId('')
    setErrors({})
    load()
  }

  async function handleUpdate(id: number) {
    const errs: Record<string, string> = {}
    if (!editName.trim()) errs.name = 'Name is required.'
    if (!editCategoryId) errs.category = 'Category is required.'
    if (Object.keys(errs).length) { setEditErrors(errs); return }
    setSaving(true)
    await supabase.from('subcategories').update({ name: editName.trim(), category_id: Number(editCategoryId) }).eq('id', id)
    setSaving(false)
    setEditId(null)
    setEditErrors({})
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this subcategory?')) return
    setDeleting(id)
    await supabase.from('subcategories').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  function startEdit(sub: Subcategory) {
    setEditId(sub.id)
    setEditName(sub.name)
    setEditCategoryId(String(sub.category_id))
    setEditErrors({})
  }

  return (
    <main className="min-h-screen bg-[#ffffff] px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Subcategories</h1>

        {/* Create form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Add Subcategory</h2>
          <form onSubmit={handleCreate} className="flex gap-2 items-start">
            <div className="w-44">
              <select
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#121358] ${errors.category ? 'border-[#FA6781]' : 'border-gray-300'}`}
              >
                <option value="">Category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.category && <p className="mt-1 text-xs text-[#FA6781]">{errors.category}</p>}
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Subcategory name"
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#121358] ${errors.name ? 'border-[#FA6781]' : 'border-gray-300'}`}
              />
              {errors.name && <p className="mt-1 text-xs text-[#FA6781]">{errors.name}</p>}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#121358] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a9d81] disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {subcategories.length === 0 ? (
            <p className="px-6 py-8 text-sm text-center text-gray-400">No subcategories yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-[#ffffff]/50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 text-left w-10">#</th>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subcategories.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-400">{sub.id}</td>
                    <td className="px-5 py-3">
                      {editId === sub.id ? (
                        <div>
                          <select
                            value={editCategoryId}
                            onChange={(e) => setEditCategoryId(e.target.value)}
                            className={`rounded-lg border px-2 py-1 text-sm bg-white outline-none focus:ring-2 focus:ring-[#121358] ${editErrors.category ? 'border-[#FA6781]' : 'border-gray-300'}`}
                          >
                            <option value="">Select</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          {editErrors.category && <p className="mt-0.5 text-xs text-[#FA6781]">{editErrors.category}</p>}
                        </div>
                      ) : (
                        <span className="text-gray-600">{sub.categories?.name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {editId === sub.id ? (
                        <div>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdate(sub.id)}
                            autoFocus
                            className={`rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[#121358] ${editErrors.name ? 'border-[#FA6781]' : 'border-gray-300'}`}
                          />
                          {editErrors.name && <p className="mt-0.5 text-xs text-[#FA6781]">{editErrors.name}</p>}
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900">{sub.name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right space-x-3">
                      {editId === sub.id ? (
                        <>
                          <button onClick={() => handleUpdate(sub.id)} disabled={saving} className="text-[#121358] hover:underline disabled:opacity-40">Save</button>
                          <button onClick={() => setEditId(null)} className="text-gray-400 hover:underline">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(sub)} className="text-amber-600 hover:underline"><i className="fa-solid fa-pen"></i></button>
                          <button onClick={() => handleDelete(sub.id)} disabled={deleting === sub.id} className="text-[#FA6781] hover:underline disabled:opacity-40">
                            <i className={`fa-solid fa-trash ${deleting === sub.id ? 'opacity-40' : ''}`}></i>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  )
}

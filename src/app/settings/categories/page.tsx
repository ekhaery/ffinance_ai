'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Category = { id: number; name: string }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  async function load() {
    const { data } = await supabase.from('categories').select('id, name').order('id')
    setCategories(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) { setError('Name is required.'); return }
    setSaving(true)
    const { error } = await supabase.from('categories').insert({ name: newName.trim() })
    setSaving(false)
    if (error) { setError(error.message); return }
    setNewName('')
    setError('')
    load()
  }

  async function handleUpdate(id: number) {
    if (!editName.trim()) { setEditError('Name is required.'); return }
    setSaving(true)
    await supabase.from('categories').update({ name: editName.trim() }).eq('id', id)
    setSaving(false)
    setEditId(null)
    setEditName('')
    setEditError('')
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this category? This will also remove its subcategories.')) return
    setDeleting(id)
    await supabase.from('categories').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  function startEdit(cat: Category) {
    setEditId(cat.id)
    setEditName(cat.name)
    setEditError('')
  }

  return (
    <main className="min-h-screen bg-[#FFFDE1] px-4 py-12">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>

        {/* Create form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Add Category</h2>
          <form onSubmit={handleCreate} className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name"
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3F9AAE] ${error ? 'border-[#FA6781]' : 'border-gray-300'}`}
              />
              {error && <p className="mt-1 text-xs text-[#FA6781]">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#3F9AAE] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a9d81] disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {categories.length === 0 ? (
            <p className="px-6 py-8 text-sm text-center text-gray-400">No categories yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-[#FFFDE1]/50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 text-left w-10">#</th>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-400">{cat.id}</td>
                    <td className="px-5 py-3">
                      {editId === cat.id ? (
                        <div>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                            autoFocus
                            className={`rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[#3F9AAE] ${editError ? 'border-[#FA6781]' : 'border-gray-300'}`}
                          />
                          {editError && <p className="mt-0.5 text-xs text-[#FA6781]">{editError}</p>}
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900">{cat.name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right space-x-3">
                      {editId === cat.id ? (
                        <>
                          <button onClick={() => handleUpdate(cat.id)} disabled={saving} className="text-[#3F9AAE] hover:underline disabled:opacity-40">Save</button>
                          <button onClick={() => setEditId(null)} className="text-gray-400 hover:underline">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(cat)} className="text-amber-600 hover:underline"><i className="fa-solid fa-pen"></i></button>
                          <button onClick={() => handleDelete(cat.id)} disabled={deleting === cat.id} className="text-[#FA6781] hover:underline disabled:opacity-40">
                            <i className={`fa-solid fa-trash ${deleting === cat.id ? 'opacity-40' : ''}`}></i>
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

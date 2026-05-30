'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Account = { id: number; name: string; description: string | null }

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  async function load() {
    const { data } = await supabase.from('accounts').select('id, name, description').order('id')
    setAccounts((data as Account[]) ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) { setErrors({ create: 'Account name is required.' }); return }
    setSaving(true)
    await supabase.from('accounts').insert({ name: newName.trim(), description: newDesc.trim() || null })
    setSaving(false)
    setNewName('')
    setNewDesc('')
    setErrors({})
    load()
  }

  async function handleUpdate(id: number) {
    if (!editName.trim()) { setErrors({ edit: 'Account name is required.' }); return }
    setSaving(true)
    await supabase.from('accounts').update({
      name: editName.trim(),
      description: editDesc.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setSaving(false)
    setEditId(null)
    setErrors({})
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this account?')) return
    setDeleting(id)
    // Check if used by any income record
    const { count } = await supabase
      .from('income')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id)
    if (count && count > 0) {
      setDeleting(null)
      alert(`Cannot delete — this account is used by ${count} income record${count > 1 ? 's' : ''}.`)
      return
    }
    await supabase.from('accounts').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  function startEdit(a: Account) {
    setEditId(a.id)
    setEditName(a.name)
    setEditDesc(a.description ?? '')
    setErrors({})
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:py-12">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Accounts</h1>

        {/* Create form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Add Account</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Account name *"
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.create ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.create && <p className="mt-1 text-xs text-red-500">{errors.create}</p>}
            </div>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
          </form>
        </div>

        {/* Account list */}
        {accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">No accounts yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Account Name</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {accounts.map((a) => (
                  <tr key={a.id} className={`transition-opacity ${deleting === a.id ? 'opacity-40' : ''}`}>
                    {editId === a.id ? (
                      <>
                        <td className="px-4 py-2" colSpan={2}>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className={`w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.edit ? 'border-red-400' : 'border-gray-300'}`}
                            />
                            {errors.edit && <p className="text-xs text-red-500">{errors.edit}</p>}
                            <textarea
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              rows={2}
                              placeholder="Description (optional)"
                              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap align-top">
                          <button onClick={() => handleUpdate(a.id)} disabled={saving} className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-40 mr-3">
                            {saving ? '…' : 'Save'}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-sm font-medium text-gray-500 hover:underline">
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {a.name}
                          {a.description && (
                            <p className="text-xs text-gray-400 font-normal mt-0.5 sm:hidden">{a.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{a.description ?? <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                          <button onClick={() => startEdit(a)} className="text-sm font-medium text-amber-600 hover:underline">Edit</button>
                          <button
                            onClick={() => handleDelete(a.id)}
                            disabled={deleting === a.id}
                            className="text-sm font-medium text-red-500 hover:underline disabled:opacity-40"
                          >
                            {deleting === a.id ? '…' : 'Delete'}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

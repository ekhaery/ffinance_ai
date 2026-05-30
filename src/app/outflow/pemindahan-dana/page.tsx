'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Account = { id: number; name: string }

export default function PemindahanDanaPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [balances, setBalances] = useState<Record<number, number>>({})
  const [amount, setAmount] = useState('')
  const [fromId, setFromId] = useState<number | null>(null)
  const [toId, setToId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase.from('accounts').select('id, name').order('name').then(({ data }) => {
      setAccounts(data ?? [])
    })
    supabase.from('balance').select('account_id, amount').then(({ data }) => {
      if (!data) return
      const map: Record<number, number> = {}
      data.forEach((r: { account_id: number; amount: number }) => {
        map[r.account_id] = (map[r.account_id] ?? 0) + Number(r.amount)
      })
      setBalances(map)
    })
  }, [])

  function validate() {
    const e: Record<string, string> = {}
    const amt = Number(amount)
    if (!amount || amt <= 0) e.amount = 'Amount must be greater than 0.'
    if (!fromId) e.from = 'Source account is required.'
    if (!toId) e.to = 'Destination account is required.'
    if (fromId && toId && fromId === toId) e.to = 'Source and destination accounts must be different.'
    if (fromId && amt > 0 && (balances[fromId] ?? 0) < amt) e.amount = 'Insufficient balance.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSubmitting(true)

    const amt = Number(amount)
    const today = new Date().toISOString().slice(0, 10)

    await supabase.from('balance').insert([
      { account_id: fromId, amount: -amt, type: 'transfer_out', date: today },
      { account_id: toId, amount: amt, type: 'transfer_in', date: today },
    ])

    setSubmitting(false)
    setSuccess(true)
    setAmount('')
    setFromId(null)
    setToId(null)

    // Refresh balances
    supabase.from('balance').select('account_id, amount').then(({ data }) => {
      if (!data) return
      const map: Record<number, number> = {}
      data.forEach((r: { account_id: number; amount: number }) => {
        map[r.account_id] = (map[r.account_id] ?? 0) + Number(r.amount)
      })
      setBalances(map)
    })

    setTimeout(() => setSuccess(false), 4000)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Pemindahan Dana</h1>

        {success && (
          <div className="mb-5 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Transfer berhasil!
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.amount ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
          </div>

          {/* From Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Account <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setFromId(fromId === a.id ? null : a.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    fromId === a.id
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  <span>{a.name}</span>
                  {balances[a.id] !== undefined && (
                    <span className={`ml-1.5 text-xs ${fromId === a.id ? 'text-blue-100' : 'text-gray-400'}`}>
                      {(balances[a.id] ?? 0).toLocaleString('id-ID')}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {errors.from && <p className="mt-1 text-xs text-red-500">{errors.from}</p>}
          </div>

          {/* To Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Account <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setToId(toId === a.id ? null : a.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    toId === a.id
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-green-400 hover:text-green-600'
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
            {errors.to && <p className="mt-1 text-xs text-red-500">{errors.to}</p>}
          </div>

          {/* Preview */}
          {fromId && toId && fromId !== toId && Number(amount) > 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm space-y-1">
              <p className="font-medium text-gray-700 mb-2">Preview</p>
              <div className="flex justify-between text-gray-600">
                <span>{accounts.find(a => a.id === fromId)?.name}</span>
                <span className="text-red-600 font-medium">
                  {(balances[fromId] ?? 0).toLocaleString('id-ID')} → {((balances[fromId] ?? 0) - Number(amount)).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{accounts.find(a => a.id === toId)?.name}</span>
                <span className="text-green-600 font-medium">
                  {(balances[toId] ?? 0).toLocaleString('id-ID')} → {((balances[toId] ?? 0) + Number(amount)).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Memproses…' : 'Submit'}
          </button>
        </form>
      </div>
    </main>
  )
}

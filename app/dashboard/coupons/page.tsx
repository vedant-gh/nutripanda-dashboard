'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Ticket, Trash2, Plus, Power } from 'lucide-react'
import { getCoupons, createCoupon, deleteCoupon, updateCoupon } from '@/lib/api'
import type { Coupon } from '@/lib/types'
import PageHeader from '@/components/ui/PageHeader'
import ConfirmModal from '@/components/ui/ConfirmModal'

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`

function discountLabel(c: Coupon) {
  return c.discount_type === 'percent' ? `${c.discount_value}% off` : `${inr(c.discount_value)} off`
}

function isExpired(c: Coupon) {
  return !!c.expires_at && new Date(c.expires_at).getTime() < Date.now()
}

function StatusBadge({ coupon }: { coupon: Coupon }) {
  if (isExpired(coupon))
    return <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">Expired</span>
  if (!coupon.is_active)
    return <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">Inactive</span>
  return <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">Active</span>
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value)
  )
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)

  // Create form
  const [code, setCode] = useState('')
  const [type, setType] = useState<'percent' | 'fixed'>('percent')
  const [value, setValue] = useState('')
  const [minOrder, setMinOrder] = useState('')
  const [maxDiscount, setMaxDiscount] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [creating, setCreating] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    getCoupons()
      .then((data) => setCoupons(data.coupons))
      .catch(() => toast.error('Failed to load coupons'))
      .finally(() => setLoading(false))
  }, [])

  function resetForm() {
    setCode('')
    setType('percent')
    setValue('')
    setMinOrder('')
    setMaxDiscount('')
    setExpiresAt('')
    setIsActive(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    const num = parseFloat(value)

    if (!trimmed) return toast.error('Enter a coupon code')
    if (!Number.isFinite(num) || num <= 0) return toast.error('Enter a discount value')
    if (type === 'percent' && num > 100) return toast.error('Percentage cannot exceed 100')

    const minOrderNum = parseFloat(minOrder)
    const maxDiscountNum = parseFloat(maxDiscount)

    setCreating(true)
    try {
      const data = await createCoupon({
        code: trimmed,
        discount_type: type,
        discount_value: type === 'percent' ? Math.round(num) : Math.round(num * 100),
        min_subtotal: Number.isFinite(minOrderNum) ? Math.round(minOrderNum * 100) : 0,
        max_discount:
          type === 'percent' && Number.isFinite(maxDiscountNum)
            ? Math.round(maxDiscountNum * 100)
            : null,
        is_active: isActive,
        expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      })
      setCoupons((prev) => [data.coupon, ...prev])
      resetForm()
      toast.success(`Coupon ${data.coupon.code} created`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create coupon')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCoupon(deleteTarget.id)
      setCoupons((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      toast.success(`Coupon ${deleteTarget.code} deleted`)
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete coupon')
    } finally {
      setDeleting(false)
    }
  }

  async function handleToggle(coupon: Coupon) {
    setTogglingId(coupon.id)
    try {
      const data = await updateCoupon(coupon.id, { is_active: !coupon.is_active })
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? data.coupon : c)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update coupon')
    } finally {
      setTogglingId(null)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green'

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Create percentage or flat-amount discount codes for checkout."
      />

      {/* Create form */}
      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6"
      >
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Plus className="h-4 w-4 text-brand-green" />
          Create a coupon
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SUMMER20"
              className={`${inputCls} font-mono uppercase tracking-wide`}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Discount type</label>
            <div className="flex rounded-xl border border-gray-300 p-1">
              {(['percent', 'fixed'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    type === t ? 'bg-brand-green text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t === 'percent' ? 'Percentage' : 'Flat ₹'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              {type === 'percent' ? 'Percent off (%)' : 'Amount off (₹)'}
            </label>
            <input
              type="number"
              min="1"
              step={type === 'percent' ? '1' : '0.01'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'percent' ? '20' : '150'}
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              Min order (₹) <span className="text-gray-400">· optional</span>
            </label>
            <input
              type="number"
              min="0"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </div>

          {type === 'percent' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">
                Max discount (₹) <span className="text-gray-400">· optional cap</span>
              </label>
              <input
                type="number"
                min="0"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                placeholder="No cap"
                className={inputCls}
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              Expires <span className="text-gray-400">· optional</span>
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-green focus:ring-brand-green"
            />
            Active immediately
          </label>

          <button
            type="submit"
            disabled={creating}
            className="flex items-center justify-center gap-2 rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {creating ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create coupon
              </>
            )}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            All coupons {coupons.length > 0 && <span className="text-gray-400">({coupons.length})</span>}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-green" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Ticket className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No coupons yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Discount</th>
                  <th className="px-5 py-3">Min order</th>
                  <th className="px-5 py-3">Max</th>
                  <th className="px-5 py-3">Expires</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono font-semibold tracking-wide text-gray-900">
                      {c.code}
                    </td>
                    <td className="px-5 py-3 text-gray-700">{discountLabel(c)}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {c.min_subtotal > 0 ? inr(c.min_subtotal) : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {c.max_discount != null ? inr(c.max_discount) : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(c.expires_at)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge coupon={c} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggle(c)}
                          disabled={togglingId === c.id || isExpired(c)}
                          title={c.is_active ? 'Deactivate' : 'Activate'}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          title="Delete"
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        loading={deleting}
        title="Delete this coupon?"
        description={
          <>
            Permanently delete <strong>{deleteTarget?.code}</strong>. Customers will no longer be
            able to use it at checkout. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

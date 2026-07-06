'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  Send,
  Save,
  Download,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getOrder, updateOrder, createShipment } from '@/lib/api'
import type { Order } from '@/lib/types'
import { formatPrice, formatDateTime } from '@/lib/utils'
import { downloadInvoice } from '@/lib/invoice'
import { PaymentBadge, OrderBadge } from '@/components/ui/Badge'
import ConfirmModal from '@/components/ui/ConfirmModal'

const STATUS_OPTIONS: Order['order_status'][] = [
  'confirmed', 'processing', 'shipped', 'delivered', 'cancelled',
]

const TIMELINE_ICONS: Record<string, typeof Clock> = {
  confirmed: CheckCircle2,
  processing: Settings,
  shipped: Truck,
  delivered: Package,
  cancelled: XCircle,
}

const TIMELINE_ORDER = ['confirmed', 'processing', 'shipped', 'delivered']

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [sendNotification, setSendNotification] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [shipping, setShipping] = useState(false)
  const [confirmShipOpen, setConfirmShipOpen] = useState(false)

  useEffect(() => {
    getOrder(id)
      .then((data) => {
        setOrder(data.order)
        setNewStatus(data.order.order_status)
        setNotes(data.order.notes || '')
      })
      .catch(() => toast.error('Failed to load order'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleUpdateStatus() {
    if (!order || newStatus === order.order_status) return
    setUpdating(true)
    try {
      const data = await updateOrder(order.id, {
        order_status: newStatus,
        notes: notes || undefined,
        send_notification: sendNotification,
      })
      setOrder(data.order)
      toast.success('Order status updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdating(false)
    }
  }

  async function handleCreateShipment() {
    if (!order) return
    setShipping(true)
    try {
      const data = await createShipment(order.id)
      setOrder(data.order)
      setConfirmShipOpen(false)
      toast.success(`Shipment created — AWB ${data.order.awb_number}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create shipment')
    } finally {
      setShipping(false)
    }
  }

  function handleDownloadInvoice() {
    if (!order) return
    const opened = downloadInvoice(order)
    if (!opened) {
      toast.error('Allow pop-ups for this site to download the invoice')
    }
  }

  async function handleSaveNotes() {
    if (!order) return
    setUpdating(true)
    try {
      await updateOrder(order.id, {
        order_status: order.order_status,
        notes,
      })
      toast.success('Notes saved')
    } catch {
      toast.error('Failed to save notes')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-green" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Order not found</p>
      </div>
    )
  }

  const currentStepIndex = order.order_status === 'cancelled'
    ? -1
    : TIMELINE_ORDER.indexOf(order.order_status)

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/orders')}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {order.order_number}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Placed {formatDateTime(order.created_at)}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex gap-2">
              <PaymentBadge status={order.payment_status} />
              <OrderBadge status={order.order_status} />
            </div>
            <button
              onClick={handleDownloadInvoice}
              className="flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-900 hover:text-gray-900"
            >
              <Download className="h-4 w-4" />
              Download Invoice
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — order info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Timeline */}
          {order.order_status !== 'cancelled' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Order Timeline</h2>
              <div className="flex items-center justify-between">
                {TIMELINE_ORDER.map((step, i) => {
                  const Icon = TIMELINE_ICONS[step] || Clock
                  const isCompleted = i <= currentStepIndex
                  const isCurrent = i === currentStepIndex
                  return (
                    <div key={step} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                            isCurrent
                              ? 'bg-brand-green text-white shadow-md shadow-brand-green/20'
                              : isCompleted
                              ? 'bg-brand-green/15 text-brand-green'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className={`mt-2 text-[11px] font-medium capitalize ${isCurrent ? 'text-brand-green' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                          {step}
                        </span>
                      </div>
                      {i < TIMELINE_ORDER.length - 1 && (
                        <div className={`mx-2 h-0.5 flex-1 rounded-full ${i < currentStepIndex ? 'bg-brand-green/30' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Items */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Items ({order.items.length})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                  </div>
                  <p className="font-medium text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 bg-gray-50 px-5 py-4 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span><span>{order.shipping_cost === 0 ? 'Free' : formatPrice(order.shipping_cost)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span><span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                <span>Total</span><span>{formatPrice(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Customer</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500">Name</p>
                <p className="text-sm text-gray-900">{order.customer_name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Email</p>
                <p className="text-sm text-gray-900">{order.customer_email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Phone</p>
                <p className="text-sm text-gray-900">{order.customer_phone}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">WhatsApp</p>
                <p className="text-sm text-gray-900">{order.customer_whatsapp_opted_in ? 'Opted in' : 'Not opted in'}</p>
              </div>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500">Shipping Address</p>
              <p className="mt-1 text-sm text-gray-900">
                {[order.shipping_address.line1, order.shipping_address.line2, order.shipping_address.city, order.shipping_address.state, order.shipping_address.pincode].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>

          {/* Payment Info */}
          {order.razorpay_order_id && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Payment Details</h2>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Razorpay Order ID</span><span className="font-mono text-xs text-gray-700">{order.razorpay_order_id}</span></div>
                {order.razorpay_payment_id && <div className="flex justify-between"><span className="text-gray-500">Payment ID</span><span className="font-mono text-xs text-gray-700">{order.razorpay_payment_id}</span></div>}
              </div>
            </div>
          )}
        </div>

        {/* Right column — actions */}
        <div className="space-y-6">
          {/* Shipment */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Shipment</h2>
            {order.awb_number ? (
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Courier</span>
                  <span className="font-medium text-gray-900">{order.courier_name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">AWB</span>
                  <span className="font-mono text-xs text-gray-900">{order.awb_number}</span>
                </div>
                {order.shipment_status && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className="font-medium text-gray-900">{order.shipment_status}</span>
                  </div>
                )}
                {order.shipping_label_url && (
                  <a
                    href={order.shipping_label_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-900 hover:text-gray-900"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Label
                  </a>
                )}
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-gray-500">
                  Books a real courier pickup via Proship and generates the AWB + shipping label.
                </p>
                <button
                  onClick={() => setConfirmShipOpen(true)}
                  disabled={shipping}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Truck className="h-4 w-4" />
                  Create Shipment
                </button>
              </>
            )}
          </div>

          {/* Update Status */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Update Status</h2>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green capitalize"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {order.customer_whatsapp_opted_in && (
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                />
                <Send className="h-3.5 w-3.5" />
                Notify customer via WhatsApp
              </label>
            )}

            <button
              onClick={handleUpdateStatus}
              disabled={updating || newStatus === order.order_status}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {updating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                'Update Status'
              )}
            </button>
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Internal Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add internal notes about this order..."
              className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
            <button
              onClick={handleSaveNotes}
              disabled={updating}
              className="mt-3 flex items-center gap-1.5 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-900 hover:text-gray-900"
            >
              <Save className="h-3.5 w-3.5" />
              Save Notes
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmShipOpen}
        loading={shipping}
        title="Create a real Proship shipment?"
        description={
          <>
            This books an <strong>actual courier pickup</strong> for order{' '}
            <strong>{order.order_number}</strong> and incurs shipping charges. Test-mode
            Razorpay payments still create real shipments.
          </>
        }
        confirmLabel="Create Shipment"
        cancelLabel="Cancel"
        onConfirm={handleCreateShipment}
        onCancel={() => setConfirmShipOpen(false)}
      />
    </>
  )
}

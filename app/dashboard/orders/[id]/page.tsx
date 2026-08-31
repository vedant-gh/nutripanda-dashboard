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
  Trash2,
  RefreshCw,
  IndianRupee,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  confirmNoLegacyShipment,
  confirmReturnInventory,
  createShipment,
  deleteOrder,
  getOrder,
  recordDeliveredPrepaidRefund,
  resolveInventoryReconciliation,
  updateOrder,
} from '@/lib/api'
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
  const [syncing, setSyncing] = useState(false)
  const [paymentUpdating, setPaymentUpdating] = useState(false)
  const [confirmShipOpen, setConfirmShipOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [returningInventory, setReturningInventory] = useState(false)
  const [confirmReturnOpen, setConfirmReturnOpen] = useState(false)
  const [verifyingDeliveredRefund, setVerifyingDeliveredRefund] = useState(false)
  const [confirmDeliveredRefundOpen, setConfirmDeliveredRefundOpen] = useState(false)
  const [confirmNoShipmentOpen, setConfirmNoShipmentOpen] = useState(false)
  const [confirmingNoShipment, setConfirmingNoShipment] = useState(false)
  const [confirmInventoryReviewOpen, setConfirmInventoryReviewOpen] = useState(false)
  const [resolvingInventoryReview, setResolvingInventoryReview] = useState(false)

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
      const data = await createShipment(order.id, 'create')
      setOrder(data.order)
      setConfirmShipOpen(false)
      toast.success(`Shipment created — AWB ${data.order.awb_number}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create shipment')
    } finally {
      setShipping(false)
    }
  }

  async function handleSyncShipment() {
    if (!order) return
    setSyncing(true)
    try {
      const data = await createShipment(order.id, 'sync')
      setOrder(data.order)
      toast.success('Shipment status synchronized')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sync shipment')
    } finally {
      setSyncing(false)
    }
  }

  async function handleCodPayment(paymentStatus: 'paid' | 'refunded') {
    if (!order || order.payment_method !== 'cod') return
    setPaymentUpdating(true)
    try {
      const data = await updateOrder(order.id, {
        payment_status: paymentStatus,
        notes: notes || undefined,
      })
      setOrder(data.order)
      toast.success(paymentStatus === 'paid' ? 'COD collection recorded' : 'COD refund recorded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment update failed')
    } finally {
      setPaymentUpdating(false)
    }
  }

  async function handleDeleteOrder() {
    if (!order) return
    const verifiedRazorpayRefund = order.payment_method === 'prepaid' && order.payment_status === 'paid'
    const wasAlreadyCancelled = order.order_status === 'cancelled'
    setDeleting(true)
    try {
      const data = await deleteOrder(order.id)
      setOrder(data.order)
      setNewStatus(data.order.order_status)
      setConfirmDeleteOpen(false)
      if (data.refund_required) {
        toast.success(
          data.order.payment_method === 'cod'
            ? 'Shipment is stopped. Refund the COD payment, then record it in Payment Details.'
            : 'Shipment is stopped. Issue the full Razorpay refund, then verify it here.'
        )
        return
      }
      if (data.order.fulfillment_review_reason === 'return_inventory_pending') {
        toast.success('Order cancelled; stock stays quarantined until the parcel is physically returned.')
        return
      }
      toast.success(
        verifiedRazorpayRefund
          ? wasAlreadyCancelled
            ? 'Full Razorpay refund verified and payment review cleared'
            : 'Full Razorpay refund verified and order cancelled'
          : 'Order safely cancelled; audit history retained',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order')
    } finally {
      setDeleting(false)
    }
  }

  async function handleConfirmReturnInventory() {
    if (
      !order
      || (
        order.fulfillment_review_reason !== 'return_inventory_pending'
        && !(
          order.fulfillment_review_reason === 'delivered_after_cancellation'
          && order.payment_status !== 'paid'
        )
      )
    ) return
    setReturningInventory(true)
    try {
      const data = await confirmReturnInventory(order.id)
      setOrder(data.order)
      setConfirmReturnOpen(false)
      toast.success(
        (order.inventory_reclaim_shortfall ?? 0) > 0
          ? 'Physical return confirmed; deficit units were absorbed before restocking'
          : 'Physical return confirmed and inventory restocked once'
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm returned inventory')
    } finally {
      setReturningInventory(false)
    }
  }

  async function handleDeliveredPrepaidRefund() {
    if (!order || order.payment_method !== 'prepaid' || order.payment_status !== 'paid') return
    setVerifyingDeliveredRefund(true)
    try {
      const data = await recordDeliveredPrepaidRefund(order.id)
      setOrder(data.order)
      setConfirmDeliveredRefundOpen(false)
      toast.success('Full Razorpay refund verified; returned stock remains quarantined')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify the Razorpay refund')
    } finally {
      setVerifyingDeliveredRefund(false)
    }
  }

  async function handleConfirmNoLegacyShipment() {
    if (!order) return
    setConfirmingNoShipment(true)
    try {
      const data = await confirmNoLegacyShipment(order.id)
      setOrder(data.order)
      setConfirmNoShipmentOpen(false)
      toast.success(
        data.order.fulfillment_review_reason === 'return_inventory_pending'
          ? 'No carrier shipment recorded; stock awaits physical confirmation'
          : 'No carrier shipment recorded'
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm shipment outcome')
    } finally {
      setConfirmingNoShipment(false)
    }
  }

  async function handleResolveInventoryReview() {
    if (
      !order
      || (
        order.fulfillment_review_reason !== 'legacy_inventory_ledger_mismatch'
        && (order.inventory_reclaim_shortfall ?? 0) <= 0
      )
    ) return
    setResolvingInventoryReview(true)
    try {
      const data = await resolveInventoryReconciliation(order.id)
      setOrder(data.order)
      setConfirmInventoryReviewOpen(false)
      toast.success(
        data.order.fulfillment_review_reason === 'return_inventory_pending'
          ? 'Ledger review resolved; physical stock receipt is still required'
          : 'Historical inventory review resolved'
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve inventory review')
    } finally {
      setResolvingInventoryReview(false)
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
      const data = await updateOrder(order.id, { notes })
      setOrder(data.order)
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
  const shipmentCanRetry =
    !order.shipment_booking_state ||
    order.shipment_booking_state === 'idle' ||
    order.shipment_booking_state === 'failed'
  const shipmentNeedsReconciliation =
    order.shipment_booking_state === 'uncertain' ||
    order.shipment_booking_state === 'cancel_uncertain'
  const canCreateShipment =
    !order.awb_number &&
    shipmentCanRetry &&
    !order.payment_review_required &&
    !order.fulfillment_review_required &&
    (order.order_status === 'confirmed' || order.order_status === 'processing') &&
    (order.payment_status === 'paid' || order.payment_method === 'cod')
  const requiresRazorpayRefund =
    order.payment_method === 'prepaid' && order.payment_status === 'paid'
  const requiresCodRefund =
    order.payment_method === 'cod' && order.payment_status === 'paid'
  const isPostDeliveryRefund = order.order_status === 'delivered'
    || Boolean(order.shipment_delivered_at)
  const refundHoldReady = order.shipment_booking_state === 'cancelled'
    && (!order.awb_number || Boolean(order.shipment_cancelled_at))
  const cancelledShipmentNeedsStop =
    order.order_status === 'cancelled'
    && !isPostDeliveryRefund
    && Boolean(order.awb_number)
    && !(
      order.shipment_booking_state === 'cancelled'
      && Boolean(order.shipment_cancelled_at)
    )
  const shipmentMustBeReconciledBeforeCancellation =
    !order.awb_number
    && ['booking', 'uncertain', 'cancelling', 'cancel_uncertain'].includes(
      order.shipment_booking_state ?? ''
    )
  const canConfirmNoLegacyShipment =
    order.order_status === 'cancelled'
    && !order.awb_number
    && ['uncertain', 'cancel_uncertain', 'failed'].includes(
      order.shipment_booking_state ?? ''
    )

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

      {order.payment_review_required && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <p className="text-sm font-bold">Captured payment requires a full refund</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
            This order was stopped without committing inventory. Issue the exact full refund
            in Razorpay, then use “Verify Refund &amp; Reconcile” below. Do not ship this order.
          </p>
        </div>
      )}

      {order.fulfillment_review_required && (
        <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-5 text-red-950">
          {order.fulfillment_review_reason === 'legacy_inventory_ledger_mismatch' ? (
            <>
              <p className="text-sm font-bold">Historical inventory ledger needs reconciliation</p>
              <p className="mt-1 text-sm leading-relaxed text-red-900/80">
                Missing, partial, duplicated, or inconsistent legacy sale entries make the stock
                baseline ambiguous. Compare the order ledger with a physical count, make any needed
                adjustment on the Inventory page, then mark this review resolved. Shipping and
                automatic restocking stay blocked.
              </p>
              <button
                type="button"
                onClick={() => setConfirmInventoryReviewOpen(true)}
                disabled={resolvingInventoryReview}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-red-400 bg-white px-5 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-700 hover:text-white disabled:opacity-50"
              >
                Mark Inventory Review Resolved
              </button>
            </>
          ) : order.fulfillment_review_reason === 'shipment_while_ineligible' ? (
            <>
              <p className="text-sm font-bold">A live shipment exists for an ineligible order</p>
              <p className="mt-1 text-sm leading-relaxed text-red-900/80">
                Do not restock or fulfill this order. Reconcile the Proship reference and stop every
                active AWB first; the return workflow will appear if physical stock is still due back.
              </p>
            </>
          ) : order.fulfillment_review_reason === 'return_inventory_pending'
            || (
              order.fulfillment_review_reason === 'delivered_after_cancellation'
              && order.payment_status !== 'paid'
            ) ? (
            <>
              <p className="text-sm font-bold">Returned stock is awaiting physical receipt</p>
              <p className="mt-1 text-sm leading-relaxed text-red-900/80">
                The carrier cancellation/refund is recorded, but these units have not been
                restocked. Inspect the returned parcel first, then confirm receipt below.
                {(order.inventory_reclaim_shortfall ?? 0) > 0
                  ? ` ${order.inventory_reclaim_shortfall} returned unit(s) will first offset the recorded stock deficit; only any remainder becomes sellable.`
                  : ''}
              </p>
              <button
                type="button"
                onClick={() => setConfirmReturnOpen(true)}
                disabled={returningInventory}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-red-400 bg-white px-5 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-700 hover:text-white disabled:opacity-50"
              >
                Confirm Physical Return &amp; Restock
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-bold">Carrier delivered after cancellation or refund</p>
              <p className="mt-1 text-sm leading-relaxed text-red-900/80">
                This order needs manual payment and inventory reconciliation. Restored stock was
                re-applied once where available
                {order.inventory_reclaim_shortfall
                  ? `; ${order.inventory_reclaim_shortfall} unit(s) remain an inventory deficit.`
                  : '.'}
              </p>
              {(order.inventory_reclaim_shortfall ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmInventoryReviewOpen(true)}
                  disabled={resolvingInventoryReview}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-red-400 bg-white px-5 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-700 hover:text-white disabled:opacity-50"
                >
                  Mark Stock Deficit Reconciled
                </button>
              )}
            </>
          )}
        </div>
      )}

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
              {order.cod_fee > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>COD fee</span><span>{formatPrice(order.cod_fee)}</span>
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
          {(
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Payment Details</h2>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Method</span><span className="font-medium capitalize text-gray-700">{order.payment_method === 'cod' ? 'Cash on delivery' : 'Prepaid'}</span></div>
                {order.razorpay_order_id && <div className="flex justify-between"><span className="text-gray-500">Razorpay Order ID</span><span className="font-mono text-xs text-gray-700">{order.razorpay_order_id}</span></div>}
                {order.razorpay_payment_id && <div className="flex justify-between"><span className="text-gray-500">Payment ID</span><span className="font-mono text-xs text-gray-700">{order.razorpay_payment_id}</span></div>}
                {order.payment_refunded_at && <div className="flex justify-between"><span className="text-gray-500">Refund recorded</span><span className="text-xs font-medium text-gray-700">{formatDateTime(order.payment_refunded_at)}</span></div>}
              </div>
              {order.payment_method === 'cod'
                && (
                  order.payment_status === 'paid'
                  || order.order_status !== 'cancelled'
                  || Boolean(order.shipment_delivered_at)
                ) && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  {order.payment_status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => handleCodPayment('paid')}
                      disabled={paymentUpdating}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-brand-green px-4 py-2 text-sm font-semibold text-brand-green transition-colors hover:bg-brand-green hover:text-white disabled:opacity-50"
                    >
                      <IndianRupee className="h-4 w-4" />
                      Mark COD Collected
                    </button>
                  ) : order.payment_status === 'paid' ? (
                    <button
                      type="button"
                      onClick={() => handleCodPayment('refunded')}
                      disabled={paymentUpdating}
                      className="flex w-full items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-50"
                    >
                      Record COD Refund
                    </button>
                  ) : null}
                </div>
              )}
              {order.payment_method === 'prepaid'
                && order.payment_status === 'paid'
                && isPostDeliveryRefund && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setConfirmDeliveredRefundOpen(true)}
                    disabled={verifyingDeliveredRefund}
                    className="flex min-h-11 w-full items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-50"
                  >
                    Verify Full Razorpay Refund
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column — actions */}
        <div className="space-y-6">
          {/* Shipment */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Shipment</h2>
            {order.shipment_booking_state && order.shipment_booking_state !== 'idle' && (
              <div className="mb-3 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Booking state: <span className="font-semibold capitalize">
                  {order.shipment_booking_state.replaceAll('_', ' ')}
                </span>
                {order.shipment_last_error && (
                  <p className="mt-1 leading-relaxed text-red-600">{order.shipment_last_error}</p>
                )}
              </div>
            )}
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
                {order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-900 hover:text-gray-900"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    Track Shipment
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleSyncShipment}
                  disabled={syncing}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-900 hover:text-gray-900 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  Sync Carrier Status
                </button>
              </div>
            ) : canConfirmNoLegacyShipment ? (
              <>
                <p className="mb-3 text-xs leading-relaxed text-amber-700">
                  The old carrier outcome is uncertain. Reconcile by order reference in Proship.
                  If you have verified that no shipment exists, record that fact explicitly.
                </p>
                {shipmentNeedsReconciliation && (
                  <button
                    type="button"
                    onClick={handleSyncShipment}
                    disabled={syncing || confirmingNoShipment}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    Reconcile Shipment
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmNoShipmentOpen(true)}
                  disabled={syncing || confirmingNoShipment}
                  className="mt-2 flex w-full items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-900 hover:text-gray-900 disabled:opacity-50"
                >
                  Confirm No Carrier Shipment
                </button>
              </>
            ) : shipmentNeedsReconciliation ? (
              <>
                <p className="mb-3 text-xs leading-relaxed text-amber-700">
                  The carrier outcome is uncertain. Reconcile by order reference before taking another action.
                </p>
                <button
                  type="button"
                  onClick={handleSyncShipment}
                  disabled={syncing}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  Reconcile Shipment
                </button>
              </>
            ) : canCreateShipment ? (
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
            ) : (
              <p className="text-xs leading-relaxed text-gray-500">
                Shipment creation is unavailable for this order state. A prepaid order must be paid, and cancelled or delivered orders cannot be booked.
              </p>
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

          {/* Safe cancellation — orders remain as immutable financial records. */}
          <div className="rounded-2xl border border-red-200 bg-red-50/40 p-5">
            <h2 className="mb-1 text-sm font-semibold text-red-900">Danger Zone</h2>
            {isPostDeliveryRefund && requiresRazorpayRefund ? (
              <p className="text-xs text-red-700/80">
                This parcel was delivered. Verify the completed full refund in Payment Details;
                inventory stays quarantined until a physical customer return is confirmed.
              </p>
            ) : order.order_status === 'cancelled' && requiresRazorpayRefund ? (
              <>
                <p className="mb-3 text-xs text-red-700/80">
                  {refundHoldReady
                    ? 'A late or otherwise unfulfillable payment was captured. Issue the exact full refund in Razorpay, then verify it here.'
                    : 'A payment was captured, but carrier cancellation is not confirmed. Stop the shipment here before issuing the Razorpay refund.'}
                </p>
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={deleting}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-red-300 bg-white px-6 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {refundHoldReady ? 'Verify Refund & Reconcile' : 'Stop Shipment Before Refund'}
                </button>
              </>
            ) : cancelledShipmentNeedsStop ? (
              <>
                <p className="mb-3 text-xs text-red-700/80">
                  This order is locally cancelled, but its carrier shipment is still live or
                  unconfirmed. Stop and reconcile the Proship shipment now; do not restock it yet.
                </p>
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={deleting}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-red-300 bg-white px-6 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Stop Live Shipment
                </button>
              </>
            ) : order.order_status === 'cancelled' ? (
              <p className="text-xs text-red-700/80">
                This order is cancelled. Its payment, inventory, shipment, and notification history has been retained for reconciliation.
              </p>
            ) : order.order_status === 'delivered' ? (
              <p className="text-xs text-red-700/80">Delivered orders cannot be cancelled.</p>
            ) : (
              <>
                <p className="mb-3 text-xs text-red-700/80">
                  {shipmentMustBeReconciledBeforeCancellation
                    ? 'Shipment booking is in progress or uncertain. Sync with Proship before refunding or cancelling this order.'
                    : requiresRazorpayRefund
                    ? refundHoldReady
                      ? 'The carrier/booking is stopped. Issue the exact full refund in Razorpay, then verify it here before inventory and the local order are finalized.'
                      : 'Stop the carrier/booking here before issuing a Razorpay refund. Inventory and the local order remain unchanged until the full refund is verified.'
                    : requiresCodRefund
                      ? 'Record the customer\'s COD refund in Payment Details first. Once the payment is marked refunded, you can cancel the carrier booking and restore inventory.'
                      : 'Cancel any carrier booking safely. Stock tied to an AWB stays quarantined until the physical parcel is returned.'}
                </p>
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={deleting || requiresCodRefund || shipmentMustBeReconciledBeforeCancellation}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-red-300 bg-white px-6 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {requiresRazorpayRefund
                    ? refundHoldReady
                      ? 'Verify Refund & Cancel'
                      : 'Stop Shipment Before Refund'
                    : 'Cancel Order'}
                </button>
              </>
            )}
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

      <ConfirmModal
        open={confirmDeleteOpen}
        loading={deleting}
        title={cancelledShipmentNeedsStop ? 'Stop this live shipment?' : 'Safely cancel this order?'}
        description={
          cancelledShipmentNeedsStop ? (
            <>
              Reconcile order <strong>{order.order_number}</strong> by its immutable Proship
              reference and stop the active carrier shipment. Inventory remains quarantined until
              any physical return is confirmed.
            </>
          ) : requiresRazorpayRefund && !refundHoldReady ? (
            <>
              This first step stops any active carrier booking for order{' '}
              <strong>{order.order_number}</strong>. Do <strong>not</strong> issue the
              Razorpay refund until this step succeeds. Inventory and payment state stay unchanged.
            </>
          ) : order.order_status === 'cancelled' && requiresRazorpayRefund ? (
            <>
              Verify that Razorpay shows an exact <strong>full refund</strong> for order{' '}
              <strong>{order.order_number}</strong>. This clears the captured-payment review;
              no inventory or shipment will be created.
            </>
          ) : requiresRazorpayRefund ? (
            <>
              First issue a <strong>full refund in Razorpay</strong> for order{' '}
              <strong>{order.order_number}</strong>. Continuing here does not create a refund:
              it verifies Razorpay reports the exact full amount as refunded, then requests
              carrier cancellation and finalizes the local order. AWB stock remains quarantined
              until the parcel is physically returned.
            </>
          ) : (
            <>
              This will cancel order <strong>{order.order_number}</strong>, request carrier
              cancellation when needed, and preserve committed stock until any carrier parcel is
              physically returned. Financial and audit records will be retained.
            </>
          )
        }
        confirmLabel={cancelledShipmentNeedsStop
          ? 'Stop Live Shipment'
          : requiresRazorpayRefund
            ? refundHoldReady
              ? 'Verify Refund & Cancel'
              : 'Stop Shipment'
            : 'Cancel Order'}
        cancelLabel="Cancel"
        onConfirm={handleDeleteOrder}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <ConfirmModal
        open={confirmReturnOpen}
        loading={returningInventory}
        title="Confirm the parcel is physically back?"
        description={
          <>
            Only continue after the returned parcel for <strong>{order.order_number}</strong> has
            arrived and its sellable units were inspected. Any recorded deficit is offset first;
            only the remaining returned units are restocked, once.
          </>
        }
        confirmLabel="Confirm Return & Restock"
        cancelLabel="Not Yet"
        onConfirm={handleConfirmReturnInventory}
        onCancel={() => setConfirmReturnOpen(false)}
      />

      <ConfirmModal
        open={confirmDeliveredRefundOpen}
        loading={verifyingDeliveredRefund}
        title="Verify the delivered-order refund?"
        description={
          <>
            First issue the exact <strong>full refund in Razorpay</strong> for order{' '}
            <strong>{order.order_number}</strong>. This action only verifies and records that
            refund; it does not restock anything until the customer&apos;s parcel is physically back.
          </>
        }
        confirmLabel="Verify Full Refund"
        cancelLabel="Cancel"
        onConfirm={handleDeliveredPrepaidRefund}
        onCancel={() => setConfirmDeliveredRefundOpen(false)}
      />

      <ConfirmModal
        open={confirmNoShipmentOpen}
        loading={confirmingNoShipment}
        title="Confirm no carrier shipment exists?"
        description={
          <>
            Only continue after checking Proship by order reference and confirming that order{' '}
            <strong>{order.order_number}</strong> has no shipment or AWB. This records the carrier
            outcome; committed units still require a separate physical-stock confirmation.
          </>
        }
        confirmLabel="Confirm No Shipment"
        cancelLabel="Not Yet"
        onConfirm={handleConfirmNoLegacyShipment}
        onCancel={() => setConfirmNoShipmentOpen(false)}
      />

      <ConfirmModal
        open={confirmInventoryReviewOpen}
        loading={resolvingInventoryReview}
        title={order.fulfillment_review_reason === 'legacy_inventory_ledger_mismatch'
          ? 'Inventory ledger and physical count reconciled?'
          : 'Stock deficit reconciled?'}
        description={
          order.fulfillment_review_reason === 'legacy_inventory_ledger_mismatch' ? (
            <>
              Only continue after reviewing the duplicate historical sale entries for{' '}
              <strong>{order.order_number}</strong>, comparing them with the physical stock count,
              and applying any required manual inventory correction. This acknowledgement does not
              change stock by itself.
            </>
          ) : (
            <>
              Only continue after reconciling the{' '}
              <strong>{order.inventory_reclaim_shortfall ?? 0} unit</strong> delivery deficit for{' '}
              <strong>{order.order_number}</strong> against the physical count and applying any
              required Inventory-page adjustment. This acknowledgement does not change stock.
            </>
          )
        }
        confirmLabel="Mark Review Resolved"
        cancelLabel="Not Yet"
        onConfirm={handleResolveInventoryReview}
        onCancel={() => setConfirmInventoryReviewOpen(false)}
      />
    </>
  )
}

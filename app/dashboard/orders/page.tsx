'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, ShoppingCart, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { getOrders } from '@/lib/api'
import type { Order } from '@/lib/types'
import { formatPrice, formatDate } from '@/lib/utils'
import { exportOrdersCsv } from '@/lib/csv'
import { PaymentBadge, OrderBadge } from '@/components/ui/Badge'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

const PAYMENT_FILTERS = ['', 'pending', 'paid', 'failed', 'refunded']
const ORDER_FILTERS = ['', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
const PAGE_SIZE = 20
const EXPORT_CAP = 1000

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [orderFilter, setOrderFilter] = useState('')
  const [page, setPage] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getOrders({
        search: search || undefined,
        payment_status: paymentFilter || undefined,
        order_status: orderFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      setOrders(data.orders)
      setCount(data.count)
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoading(false)
    }
  }, [search, paymentFilter, orderFilter, page])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const totalPages = Math.ceil(count / PAGE_SIZE)
  const hasActiveFilters = paymentFilter || orderFilter

  async function handleExport() {
    setExporting(true)
    try {
      // Fetch all rows matching the current filters (not just this page).
      const data = await getOrders({
        search: search || undefined,
        payment_status: paymentFilter || undefined,
        order_status: orderFilter || undefined,
        limit: Math.min(count || PAGE_SIZE, EXPORT_CAP),
        offset: 0,
      })
      if (!data.orders.length) {
        toast.error('No orders to export')
        return
      }
      exportOrdersCsv(data.orders)
      toast.success(`Exported ${data.orders.length} order${data.orders.length > 1 ? 's' : ''}`)
      if (count > EXPORT_CAP) {
        toast(`Export capped at ${EXPORT_CAP} rows`, { icon: '⚠️' })
      }
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Orders"
        description={`${count} total order${count !== 1 ? 's' : ''}`}
        actions={
          <button
            onClick={handleExport}
            disabled={exporting || count === 0}
            className="flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-900 hover:text-gray-900 disabled:opacity-40"
          >
            {exporting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </button>
        }
      />

      {/* Search + Filter bar */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders, customers..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              hasActiveFilters
                ? 'border-brand-green bg-brand-green/5 text-brand-green'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-[10px] font-bold text-white">
                {(paymentFilter ? 1 : 0) + (orderFilter ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Payment</label>
              <select
                value={paymentFilter}
                onChange={(e) => { setPaymentFilter(e.target.value); setPage(0) }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              >
                {PAYMENT_FILTERS.map((f) => (
                  <option key={f} value={f}>{f || 'All'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Status</label>
              <select
                value={orderFilter}
                onChange={(e) => { setOrderFilter(e.target.value); setPage(0) }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              >
                {ORDER_FILTERS.map((f) => (
                  <option key={f} value={f}>{f || 'All'}</option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => { setPaymentFilter(''); setOrderFilter(''); setPage(0) }}
                className="self-end text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
              >
                Clear all
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-green" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders found"
            description={search ? 'Try a different search term' : 'Orders will appear here once customers start purchasing.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Order</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Total</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Payment</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, i) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                      className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50"
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-gray-900">{order.order_number}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-gray-900">{order.customer_name}</p>
                          <p className="text-xs text-gray-500">{order.customer_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 hidden sm:table-cell">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-gray-900">
                        {formatPrice(order.total_amount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <PaymentBadge status={order.payment_status} />
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <OrderBadge status={order.order_status} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, count)} of {count}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

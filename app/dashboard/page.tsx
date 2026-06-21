'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  IndianRupee,
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { getOrders, getProducts } from '@/lib/api'
import type { Order, Product } from '@/lib/types'
import { formatPrice, formatDate } from '@/lib/utils'
import { PaymentBadge, OrderBadge } from '@/components/ui/Badge'
import PageHeader from '@/components/ui/PageHeader'

const STATS_CAP = 1000
const LOW_STOCK_THRESHOLD = 10
const OPEN_STATUSES = ['confirmed', 'processing']

const ORDER_STATUSES: Order['order_status'][] = [
  'confirmed', 'processing', 'shipped', 'delivered', 'cancelled',
]

const STATUS_BAR_COLORS: Record<string, string> = {
  confirmed: 'bg-blue-500',
  processing: 'bg-yellow-500',
  shipped: 'bg-purple-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
}

function KpiCard({
  icon: Icon, label, value, sub, delay,
}: {
  icon: typeof IndianRupee
  label: string
  value: string
  sub?: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-gray-200 bg-white p-5"
    >
      <div className="flex items-center gap-2 text-gray-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </motion.div>
  )
}

export default function OverviewPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getOrders({ limit: STATS_CAP, offset: 0 }),
      getProducts(),
    ])
      .then(([orderData, productData]) => {
        setOrders(orderData.orders)
        setTotalOrders(orderData.count)
        setProducts(productData.products)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.payment_status === 'paid')
    const revenue = paid.reduce((sum, o) => sum + o.total_amount, 0)
    const aov = paid.length ? Math.round(revenue / paid.length) : 0
    const openOrders = orders.filter((o) => OPEN_STATUSES.includes(o.order_status)).length

    const statusCounts: Record<string, number> = {}
    for (const s of ORDER_STATUSES) statusCounts[s] = 0
    for (const o of orders) statusCounts[o.order_status] = (statusCounts[o.order_status] || 0) + 1

    const activeProducts = products.filter((p) => p.is_active && !p.is_coming_soon).length
    const lowStock = products.filter((p) => p.is_active && p.inventory_count < LOW_STOCK_THRESHOLD)

    return { revenue, aov, paidCount: paid.length, openOrders, statusCounts, activeProducts, lowStock }
  }, [orders, products])

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders])
  const maxStatusCount = Math.max(1, ...Object.values(stats.statusCounts))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-green" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Overview"
        description="Store performance at a glance"
      />

      {/* Low stock callout */}
      {stats.lowStock.length > 0 && (
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => router.push('/dashboard/inventory')}
          className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-3.5 text-left transition-colors hover:bg-yellow-100/70"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
          <p className="flex-1 text-sm text-yellow-800">
            <span className="font-semibold">{stats.lowStock.length} product{stats.lowStock.length > 1 ? 's' : ''}</span> running low on stock — review inventory
          </p>
          <ArrowRight className="h-4 w-4 text-yellow-600" />
        </motion.button>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={IndianRupee}
          label="Revenue"
          value={formatPrice(stats.revenue)}
          sub={`From ${stats.paidCount} paid order${stats.paidCount !== 1 ? 's' : ''}`}
          delay={0}
        />
        <KpiCard
          icon={ShoppingCart}
          label="Total Orders"
          value={String(totalOrders)}
          sub={`${stats.openOrders} awaiting fulfillment`}
          delay={0.05}
        />
        <KpiCard
          icon={TrendingUp}
          label="Avg Order Value"
          value={formatPrice(stats.aov)}
          sub="Across paid orders"
          delay={0.1}
        />
        <KpiCard
          icon={Package}
          label="Active Products"
          value={String(stats.activeProducts)}
          sub={`${products.length} total`}
          delay={0.15}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Order status breakdown */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Order Status</h2>
            {orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {ORDER_STATUSES.map((status) => {
                  const c = stats.statusCounts[status] || 0
                  return (
                    <div key={status}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="capitalize text-gray-600">{status}</span>
                        <span className="font-semibold text-gray-900">{c}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${STATUS_BAR_COLORS[status]}`}
                          style={{ width: `${(c / maxStatusCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent orders */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
              <Link href="/dashboard/orders" className="flex items-center gap-1 text-xs font-medium text-brand-green hover:opacity-80">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                <Clock className="h-6 w-6" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">{order.order_number}</p>
                      <p className="truncate text-xs text-gray-500">{order.customer_name} · {formatDate(order.created_at)}</p>
                    </div>
                    <span className="font-medium text-gray-900">{formatPrice(order.total_amount)}</span>
                    <div className="hidden sm:flex gap-1.5">
                      <PaymentBadge status={order.payment_status} />
                      <OrderBadge status={order.order_status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

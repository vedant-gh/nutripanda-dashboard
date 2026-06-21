'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart3, Plus, Minus, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { getInventory, adjustStock } from '@/lib/api'
import type { InventoryProduct, InventoryLog } from '@/lib/types'
import { timeAgo, PRODUCT_COLORS } from '@/lib/utils'
import { StockBadge } from '@/components/ui/Badge'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

const CHANGE_TYPE_STYLES: Record<string, string> = {
  sale: 'text-red-600',
  restock: 'text-green-600',
  adjustment: 'text-blue-600',
  return: 'text-purple-600',
}

export default function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [log, setLog] = useState<InventoryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [adjustAmount, setAdjustAmount] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    try {
      const data = await getInventory()
      setProducts(data.products)
      setLog(data.log)
    } catch {
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleAdjust(productId: string, direction: 'restock' | 'adjustment') {
    const amount = Number(adjustAmount[productId] || '0')
    if (!amount) return

    setAdjusting(productId)
    try {
      const change = direction === 'restock' ? Math.abs(amount) : -Math.abs(amount)
      await adjustStock({
        product_id: productId,
        quantity_change: change,
        change_type: direction,
        notes: `Manual ${direction}: ${change > 0 ? '+' : ''}${change}`,
      })
      toast.success('Stock updated')
      setAdjustAmount((prev) => ({ ...prev, [productId]: '' }))
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Adjustment failed')
    } finally {
      setAdjusting(null)
    }
  }

  const lowStockCount = products.filter((p) => p.inventory_count < 10 && p.is_active).length

  return (
    <>
      <PageHeader
        title="Inventory"
        description={`${products.length} products tracked`}
      />

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-3.5"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">{lowStockCount} product{lowStockCount > 1 ? 's' : ''}</span> with low stock (below 10 units)
          </p>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Stock levels — main table */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Stock Levels</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-green" />
              </div>
            ) : products.length === 0 ? (
              <EmptyState icon={BarChart3} title="No products" description="Products will appear here once created." />
            ) : (
              <div className="divide-y divide-gray-100">
                {products.map((product) => {
                  const isLow = product.inventory_count < 10 && product.is_active
                  return (
                    <div
                      key={product.id}
                      className={`px-5 py-4 transition-colors ${isLow ? 'bg-yellow-50/50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: PRODUCT_COLORS[product.color_theme || ''] || '#D1D5DB' }}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{product.name}</p>
                            {product.is_coming_soon ? (
                              <span className="text-[11px] font-medium text-purple-500">Coming Soon</span>
                            ) : !product.is_active ? (
                              <span className="text-[11px] text-gray-400">Inactive</span>
                            ) : null}
                          </div>
                        </div>
                        <StockBadge count={product.inventory_count} />
                      </div>

                      {/* Quick adjust */}
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={adjustAmount[product.id] || ''}
                          onChange={(e) => setAdjustAmount((prev) => ({ ...prev, [product.id]: e.target.value }))}
                          className="w-20 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-center focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                        />
                        <button
                          onClick={() => handleAdjust(product.id, 'restock')}
                          disabled={adjusting === product.id || !adjustAmount[product.id]}
                          className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-200 disabled:opacity-50"
                        >
                          <Plus className="h-3 w-3" /> Restock
                        </button>
                        <button
                          onClick={() => handleAdjust(product.id, 'adjustment')}
                          disabled={adjusting === product.id || !adjustAmount[product.id]}
                          className="flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50"
                        >
                          <Minus className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent activity log */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Recent Changes</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-brand-green" />
              </div>
            ) : log.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">No inventory changes yet</div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
                {log.slice(0, 50).map((entry) => (
                  <div key={entry.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-900">{entry.product_name}</p>
                      <span className={`text-sm font-semibold ${CHANGE_TYPE_STYLES[entry.change_type] || 'text-gray-600'}`}>
                        {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs capitalize text-gray-500">{entry.change_type}</span>
                      <span className="text-xs text-gray-400">{timeAgo(entry.created_at)}</span>
                    </div>
                    {entry.notes && (
                      <p className="mt-1 text-xs text-gray-400">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Package, Search, Download, MoreVertical, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { getProducts, deleteProduct } from '@/lib/api'
import type { Product } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import { ProductBadge, StockBadge } from '@/components/ui/Badge'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { exportProductsCsv } from '@/lib/csv'
import { PRODUCT_COLORS } from '@/lib/utils'

const LOW_STOCK_THRESHOLD = 10

type StatusFilter = '' | 'active' | 'inactive' | 'coming_soon'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'coming_soon', label: 'Coming Soon' },
  { value: 'inactive', label: 'Inactive' },
]

function matchesStatus(product: Product, filter: StatusFilter): boolean {
  if (filter === '') return true
  if (filter === 'coming_soon') return product.is_coming_soon
  if (filter === 'active') return product.is_active && !product.is_coming_soon
  if (filter === 'inactive') return !product.is_active && !product.is_coming_soon
  return true
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    getProducts()
      .then((data) => setProducts(data.products))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (!matchesStatus(p, statusFilter)) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.category?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [products, search, statusFilter])

  const lowStock = useMemo(
    () => products.filter((p) => p.is_active && p.inventory_count < LOW_STOCK_THRESHOLD),
    [products]
  )

  async function handleDelete(product: Product) {
    setMenuOpen(null)
    if (
      !confirm(
        `Permanently delete "${product.name}"?\n\nThis removes the product from the database and cannot be undone. Past orders keep their records.`
      )
    )
      return

    setDeleting(product.id)
    try {
      await deleteProduct(product.id, true)
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
      toast.success(`"${product.name}" deleted`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        description={`${products.length} product${products.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <button
              onClick={() => exportProductsCsv(filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-900 hover:text-gray-900 disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={() => router.push('/dashboard/products/new')}
              className="flex items-center gap-2 rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </>
        }
      />

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-3.5"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">{lowStock.length} active product{lowStock.length > 1 ? 's' : ''}</span> running low (below {LOW_STOCK_THRESHOLD} units)
          </p>
        </motion.div>
      )}

      {/* Search + status filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name, slug, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-brand-green/10 text-brand-green'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-green" />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Create your first product to get started."
            action={
              <button
                onClick={() => router.push('/dashboard/products/new')}
                className="rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Add Product
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching products"
            description="Try a different search term or filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Product</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Price</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">Stock</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product, i) => {
                  const isLow = product.is_active && product.inventory_count < LOW_STOCK_THRESHOLD
                  return (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => router.push(`/dashboard/products/${product.id}`)}
                      className={`cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 ${isLow ? 'bg-yellow-50/40' : ''} ${deleting === product.id ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: PRODUCT_COLORS[product.color_theme || ''] || '#D1D5DB' }}
                          />
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500">/{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-medium text-gray-900">{formatPrice(product.price)}</span>
                        {product.compare_at_price && (
                          <span className="ml-1.5 text-xs text-gray-400 line-through">
                            {formatPrice(product.compare_at_price)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <StockBadge count={product.inventory_count} />
                      </td>
                      <td className="px-4 py-3.5">
                        <ProductBadge isActive={product.is_active} isComingSoon={product.is_coming_soon} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setMenuOpen(menuOpen === product.id ? null : product.id)}
                            disabled={deleting === product.id}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            aria-label="Product actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {menuOpen === product.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                              <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                                <button
                                  onClick={() => { setMenuOpen(null); router.push(`/dashboard/products/${product.id}`) }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(product)}
                                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete permanently
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

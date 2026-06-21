const PAYMENT_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
}

const ORDER_STYLES: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export function PaymentBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${PAYMENT_STYLES[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

export function OrderBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ORDER_STYLES[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

export function ProductBadge({ isActive, isComingSoon }: { isActive: boolean; isComingSoon: boolean }) {
  if (isComingSoon) return <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">Coming Soon</span>
  if (isActive) return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">Active</span>
  return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">Inactive</span>
}

export function StockBadge({ count }: { count: number }) {
  if (count === 0) return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">Out of Stock</span>
  if (count < 10) return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">Low: {count}</span>
  return <span className="text-sm text-gray-900">{count}</span>
}

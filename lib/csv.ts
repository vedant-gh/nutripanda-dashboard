import type { Order, Product } from './types'

type Cell = string | number | null | undefined

function escapeCell(value: Cell): string {
  const s = value == null ? '' : String(value)
  // Quote when the value contains a delimiter, quote, or newline.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','))
  // Prepend a BOM so Excel reads UTF-8 (₹, accents) correctly.
  return '﻿' + lines.join('\r\n')
}

/** Triggers a browser download of CSV text. */
export function downloadCsv(filename: string, headers: string[], rows: Cell[][]): void {
  const blob = new Blob([toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const rupees = (paise: number) => (paise / 100).toFixed(2)

export function exportOrdersCsv(orders: Order[], filename = 'orders.csv'): void {
  const headers = [
    'Order Number', 'Date', 'Customer', 'Email', 'Phone',
    'Items', 'Subtotal (₹)', 'Shipping (₹)', 'Discount (₹)', 'Total (₹)',
    'Payment Status', 'Order Status', 'Razorpay Order ID', 'Razorpay Payment ID',
    'Shipping Address',
  ]
  const rows = orders.map((o) => [
    o.order_number,
    new Date(o.created_at).toISOString(),
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    o.items.map((i) => `${i.name} x${i.quantity}`).join('; '),
    rupees(o.subtotal),
    rupees(o.shipping_cost),
    rupees(o.discount),
    rupees(o.total_amount),
    o.payment_status,
    o.order_status,
    o.razorpay_order_id ?? '',
    o.razorpay_payment_id ?? '',
    [o.shipping_address.line1, o.shipping_address.line2, o.shipping_address.city, o.shipping_address.state, o.shipping_address.pincode]
      .filter(Boolean)
      .join(', '),
  ])
  downloadCsv(filename, headers, rows)
}

export function exportProductsCsv(products: Product[], filename = 'products.csv'): void {
  const headers = [
    'Name', 'Slug', 'Price (₹)', 'Compare At (₹)', 'Stock',
    'Status', 'Featured', 'Category',
  ]
  const rows = products.map((p) => [
    p.name,
    p.slug,
    rupees(p.price),
    p.compare_at_price != null ? rupees(p.compare_at_price) : '',
    p.inventory_count,
    p.is_coming_soon ? 'Coming Soon' : p.is_active ? 'Active' : 'Inactive',
    p.is_featured ? 'Yes' : 'No',
    p.category ?? '',
  ])
  downloadCsv(filename, headers, rows)
}

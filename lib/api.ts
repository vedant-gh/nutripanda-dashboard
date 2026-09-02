const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

export type DashboardRole = 'admin' | 'blog_editor'

export interface DashboardUser {
  id: string
  name: string
  role: DashboardRole
}

export type AuthSession =
  | { authenticated: true; user: DashboardUser }
  | { authenticated: false; user: null }

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`)
  }

  return data
}

// ── Auth ──

export async function login(email: string | undefined, password: string) {
  return apiFetch<{
    success: true
    authenticated: true
    user: DashboardUser
  }>('/api/admin/auth', {
    method: 'POST',
    body: JSON.stringify({
      ...(email ? { email } : {}),
      password,
    }),
  })
}

export async function checkAuth() {
  return apiFetch<AuthSession>('/api/admin/auth')
}

export async function logout() {
  return apiFetch<{ success: boolean }>('/api/admin/auth', {
    method: 'DELETE',
  })
}

// ── Blog editor access ──

export async function getDashboardBlogEditors() {
  return apiFetch<{ editors: import('./types').DashboardBlogEditor[] }>(
    '/api/admin/blog-editors'
  )
}

export async function createDashboardBlogEditor(email: string, password: string) {
  return apiFetch<{ editor: import('./types').DashboardBlogEditor }>(
    '/api/admin/blog-editors',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }
  )
}

export async function updateDashboardBlogEditorPassword(id: string, password: string) {
  return apiFetch<{ editor: import('./types').DashboardBlogEditor }>(
    `/api/admin/blog-editors/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify({ password }),
    }
  )
}

export async function deleteDashboardBlogEditor(id: string) {
  return apiFetch<{ success: true }>(`/api/admin/blog-editors/${id}`, {
    method: 'DELETE',
  })
}

// ── Orders ──

export async function getOrders(params?: {
  payment_status?: string
  order_status?: string
  search?: string
  limit?: number
  offset?: number
}) {
  const sp = new URLSearchParams()
  if (params?.payment_status) sp.set('payment_status', params.payment_status)
  if (params?.order_status) sp.set('order_status', params.order_status)
  if (params?.search) sp.set('search', params.search)
  if (params?.limit) sp.set('limit', String(params.limit))
  if (params?.offset) sp.set('offset', String(params.offset))

  const qs = sp.toString()
  return apiFetch<{
    orders: import('./types').Order[]
    count: number
    limit: number
    offset: number
  }>(`/api/admin/orders${qs ? `?${qs}` : ''}`)
}

const ADMIN_ORDER_PAGE_SIZE = 100

/**
 * Load the overview's bounded order history without exceeding the API's
 * per-request limit. The returned count is the full database count even when
 * the overview intentionally caps the number of rows used for client-side
 * statistics.
 */
export async function getOrdersForOverview(maxOrders = 1000) {
  const firstPage = await getOrders({
    limit: Math.min(ADMIN_ORDER_PAGE_SIZE, maxOrders),
    offset: 0,
  })
  const rowsToLoad = Math.min(firstPage.count, maxOrders)
  const remainingOffsets: number[] = []

  for (let offset = ADMIN_ORDER_PAGE_SIZE; offset < rowsToLoad; offset += ADMIN_ORDER_PAGE_SIZE) {
    remainingOffsets.push(offset)
  }

  const remainingPages = await Promise.all(
    remainingOffsets.map((offset) => getOrders({
      limit: Math.min(ADMIN_ORDER_PAGE_SIZE, rowsToLoad - offset),
      offset,
    }))
  )

  return {
    orders: [
      ...firstPage.orders,
      ...remainingPages.flatMap((page) => page.orders),
    ].slice(0, rowsToLoad),
    count: firstPage.count,
  }
}

export async function getOrder(id: string) {
  return apiFetch<{ order: import('./types').Order }>(`/api/admin/orders/${id}`)
}

export async function updateOrder(id: string, data: {
  action?:
    | 'confirm_return_inventory'
    | 'confirm_no_legacy_shipment'
    | 'record_prepaid_refund'
    | 'resolve_inventory_reconciliation'
  order_status?: string
  payment_status?: 'paid' | 'refunded'
  notes?: string
  send_notification?: boolean
}) {
  return apiFetch<{ order: import('./types').Order }>(`/api/admin/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function confirmReturnInventory(id: string) {
  return updateOrder(id, { action: 'confirm_return_inventory' })
}

export async function confirmNoLegacyShipment(id: string) {
  return updateOrder(id, { action: 'confirm_no_legacy_shipment' })
}

export async function resolveInventoryReconciliation(id: string, notes?: string) {
  return updateOrder(id, {
    action: 'resolve_inventory_reconciliation',
    notes,
  })
}

export async function recordDeliveredPrepaidRefund(id: string) {
  return updateOrder(id, { action: 'record_prepaid_refund' })
}

// Create a real Proship shipment for an order (books a courier pickup + AWB).
export async function createShipment(id: string, action: 'create' | 'sync' = 'create') {
  return apiFetch<{ order: import('./types').Order }>(`/api/admin/orders/${id}/ship`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}

// Safely cancel an order while preserving its audit and financial records.
export async function deleteOrder(id: string) {
  return apiFetch<{
    success: boolean
    refund_required: boolean
    soft_deleted?: true
    order: import('./types').Order
    error?: string
  }>(`/api/admin/orders/${id}`, {
    method: 'DELETE',
  })
}

// ── Products ──

export async function getProducts() {
  return apiFetch<{ products: import('./types').Product[] }>('/api/admin/products')
}

export async function getProduct(id: string) {
  return apiFetch<{ product: import('./types').Product }>(`/api/admin/products/${id}`)
}

export async function createProduct(data: Partial<import('./types').Product>) {
  return apiFetch<{ product: import('./types').Product }>('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateProduct(id: string, data: Partial<import('./types').Product>) {
  return apiFetch<{ product: import('./types').Product }>(`/api/admin/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteProduct(id: string, permanent = false) {
  const qs = permanent ? '?permanent=true' : ''
  return apiFetch<{ success: boolean; permanent?: boolean }>(`/api/admin/products/${id}${qs}`, {
    method: 'DELETE',
  })
}

// ── Image Upload ──

const UPLOAD_URL = `${API_URL}/api/admin/upload`
const BLOG_UPLOAD_URL = `${API_URL}/api/admin/blog/upload`

export async function uploadProductImages(files: File[], productId?: string): Promise<string[]> {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  if (productId) formData.append('productId', productId)

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Upload failed')
  return data.urls
}

// Blog-only image upload. The scoped API route is available to admins and blog editors,
// while the product upload route remains admin-only.
export async function uploadBlogImages(files: File[]): Promise<string[]> {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))

  const res = await fetch(BLOG_UPLOAD_URL, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Upload failed')
  return data.urls
}

export async function deleteProductImage(url: string, productId?: string) {
  const res = await fetch(UPLOAD_URL, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, productId }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Delete failed')
  return data
}

// ── Blog ──

export async function getBlogPosts() {
  return apiFetch<{ posts: import('./types').BlogPost[] }>('/api/admin/blog')
}

export async function getBlogPost(id: string) {
  return apiFetch<{ post: import('./types').BlogPost }>(`/api/admin/blog/${id}`)
}

export async function createBlogPost(data: import('./types').BlogPostInput) {
  return apiFetch<{ post: import('./types').BlogPost }>('/api/admin/blog', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateBlogPost(
  id: string,
  data: Partial<import('./types').BlogPostInput>
) {
  return apiFetch<{ post: import('./types').BlogPost }>(`/api/admin/blog/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteBlogPost(id: string) {
  return apiFetch<{ success: boolean }>(`/api/admin/blog/${id}`, {
    method: 'DELETE',
  })
}

// ── Coupons ──

export async function getCoupons() {
  return apiFetch<{ coupons: import('./types').Coupon[] }>('/api/admin/coupons')
}

export async function createCoupon(data: import('./types').CouponInput) {
  return apiFetch<{ coupon: import('./types').Coupon }>('/api/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCoupon(
  id: string,
  data: Partial<import('./types').CouponInput>
) {
  return apiFetch<{ coupon: import('./types').Coupon }>(`/api/admin/coupons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteCoupon(id: string) {
  return apiFetch<{ success: boolean }>(`/api/admin/coupons/${id}`, {
    method: 'DELETE',
  })
}

// ── Inventory ──

export async function getInventory(productId?: string) {
  const qs = productId ? `?product_id=${productId}` : ''
  return apiFetch<{
    products: import('./types').InventoryProduct[]
    log: import('./types').InventoryLog[]
  }>(`/api/admin/inventory${qs}`)
}

export async function adjustStock(data: {
  product_id: string
  quantity_change: number
  change_type: 'restock' | 'adjustment' | 'return'
  notes?: string
}) {
  return apiFetch<{
    product_id: string
    previous_stock: number
    new_stock: number
    quantity_change: number
    log: import('./types').InventoryLog
  }>('/api/admin/inventory', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

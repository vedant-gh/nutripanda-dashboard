const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

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

export async function login(password: string) {
  return apiFetch<{ success: boolean }>('/api/admin/auth', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export async function checkAuth() {
  return apiFetch<{ authenticated: boolean }>('/api/admin/auth')
}

export async function logout() {
  return apiFetch<{ success: boolean }>('/api/admin/auth', {
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

export async function getOrder(id: string) {
  return apiFetch<{ order: import('./types').Order }>(`/api/admin/orders/${id}`)
}

export async function updateOrder(id: string, data: {
  order_status: string
  notes?: string
  send_notification?: boolean
}) {
  return apiFetch<{ order: import('./types').Order }>(`/api/admin/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// Create a real Proship shipment for an order (books a courier pickup + AWB).
export async function createShipment(id: string) {
  return apiFetch<{ order: import('./types').Order }>(`/api/admin/orders/${id}/ship`, {
    method: 'POST',
  })
}

// Permanently delete an order (and its inventory/notification log rows).
export async function deleteOrder(id: string) {
  return apiFetch<{ success: boolean }>(`/api/admin/orders/${id}`, {
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
    change: number
  }>('/api/admin/inventory', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

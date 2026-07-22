export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  short_description: string | null
  price: number
  compare_at_price: number | null
  images: string[] | null
  color_theme: string | null
  ingredients: Ingredient[] | null
  nutrition_facts: NutritionFacts | null
  trust_badges: string[] | null
  category: string | null
  is_active: boolean
  is_featured: boolean
  is_coming_soon: boolean
  inventory_count: number
  seo_title: string | null
  seo_description: string | null
  created_at: string
  updated_at: string
}

export interface Ingredient {
  name: string
  description: string
  amount: string
  unit: string
}

export interface NutritionFacts {
  servingSize: string
  servingsPerContainer?: number
  calories: number
  fields: NutritionField[]
}

export interface NutritionField {
  label: string
  value: string
  dailyPercent: string
}

export interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_whatsapp_opted_in: boolean
  shipping_address: ShippingAddress
  items: OrderItem[]
  subtotal: number
  shipping_cost: number
  discount: number
  total_amount: number
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  order_status: 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  razorpay_signature: string | null
  notes: string | null
  // Shipping (Proship)
  proship_order_id?: string | null
  awb_number?: string | null
  courier_name?: string | null
  shipping_label_url?: string | null
  tracking_url?: string | null
  shipment_status?: string | null
  shipped_at?: string | null
  created_at: string
  updated_at: string
}

export interface ShippingAddress {
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
}

export interface OrderItem {
  productId: string
  name: string
  slug: string
  price: number
  image: string
  quantity: number
}

export interface InventoryLog {
  id: string
  product_id: string
  product_name: string
  change_type: 'sale' | 'restock' | 'adjustment' | 'return'
  quantity_change: number
  previous_stock: number
  new_stock: number
  order_id: string | null
  notes: string | null
  created_at: string
}

export interface InventoryProduct {
  id: string
  name: string
  slug: string
  inventory_count: number
  color_theme: string | null
  is_active: boolean
  is_coming_soon: boolean
}

// ── Blog ──

export type BlogBlockType =
  | 'heading' | 'paragraph' | 'image' | 'imageGrid'
  | 'quote' | 'list' | 'callout' | 'divider' | 'cta' | 'embed'

export interface BlogBaseBlock { id: string; type: BlogBlockType }
export interface BlogHeadingBlock extends BlogBaseBlock { type: 'heading'; level: 2 | 3; text: string }
export interface BlogParagraphBlock extends BlogBaseBlock { type: 'paragraph'; text: string }
export interface BlogImageBlock extends BlogBaseBlock { type: 'image'; url: string; alt?: string; caption?: string; width?: 'normal' | 'wide' | 'full' }
export interface BlogImageGridBlock extends BlogBaseBlock { type: 'imageGrid'; columns: 2 | 3; images: { url: string; caption?: string }[] }
export interface BlogQuoteBlock extends BlogBaseBlock { type: 'quote'; text: string; attribution?: string }
export interface BlogListBlock extends BlogBaseBlock { type: 'list'; style: 'bullet' | 'number'; items: string[] }
export interface BlogCalloutBlock extends BlogBaseBlock { type: 'callout'; emoji?: string; title?: string; text: string; tone: 'green' | 'yellow' | 'neutral' }
export interface BlogDividerBlock extends BlogBaseBlock { type: 'divider' }
export interface BlogCtaBlock extends BlogBaseBlock { type: 'cta'; label: string; href: string; style?: 'primary' | 'secondary' }
export interface BlogEmbedBlock extends BlogBaseBlock { type: 'embed'; provider: 'youtube'; url: string; caption?: string }
export type BlogBlock =
  | BlogHeadingBlock | BlogParagraphBlock | BlogImageBlock | BlogImageGridBlock
  | BlogQuoteBlock | BlogListBlock | BlogCalloutBlock | BlogDividerBlock
  | BlogCtaBlock | BlogEmbedBlock

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  cover_image_url: string | null
  content: BlogBlock[]
  author: string | null
  tags: string[] | null
  category: string | null
  status: 'draft' | 'published'
  is_featured: boolean
  reading_time: number | null
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface BlogPostInput {
  slug: string
  title: string
  excerpt?: string | null
  cover_image_url?: string | null
  content: BlogBlock[]
  author?: string | null
  tags?: string[]
  category?: string | null
  status?: 'draft' | 'published'
  is_featured?: boolean
  seo_title?: string | null
  seo_description?: string | null
}

export interface Coupon {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number // percent: 1-100; fixed: paise
  min_subtotal: number // paise
  max_discount: number | null // paise
  is_active: boolean
  expires_at: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface CouponInput {
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  min_subtotal?: number
  max_discount?: number | null
  is_active?: boolean
  expires_at?: string | null
  description?: string | null
}

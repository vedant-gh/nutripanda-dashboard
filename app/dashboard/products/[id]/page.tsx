'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2, Plus, X, Upload, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { getProduct, createProduct, updateProduct, deleteProduct, uploadProductImages, deleteProductImage } from '@/lib/api'
import type { Product, Ingredient, NutritionField } from '@/lib/types'
import { slugify, PRODUCT_COLORS } from '@/lib/utils'

const TRUST_BADGE_OPTIONS = [
  'FSSAI', 'NoSugar', 'Vegetarian', 'TransFatFree', 'AntioxidantRich', 'GlutenFree',
]

const COLOR_THEMES = Object.keys(PRODUCT_COLORS)

type ProductStatus = 'active' | 'coming_soon' | 'inactive'

const STATUS_OPTIONS: { value: ProductStatus; label: string; hint: string; dot: string }[] = [
  { value: 'active', label: 'Active', hint: 'Live & buyable', dot: '#12BC00' },
  { value: 'coming_soon', label: 'Coming Soon', hint: 'Teaser only', dot: '#9231FF' },
  { value: 'inactive', label: 'Inactive', hint: 'Hidden from store', dot: '#9CA3AF' },
]

function InputField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</label>
      <input
        {...props}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green disabled:bg-gray-50 disabled:text-gray-400"
      />
    </div>
  )
}

function TextArea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</label>
      <textarea
        {...props}
        className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
      />
    </div>
  )
}

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = id === 'new'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [price, setPrice] = useState('')
  const [compareAtPrice, setCompareAtPrice] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [imageInput, setImageInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [colorTheme, setColorTheme] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<ProductStatus>('active')
  const [isFeatured, setIsFeatured] = useState(false)
  const [inventoryCount, setInventoryCount] = useState('0')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [trustBadges, setTrustBadges] = useState<string[]>([])

  // Ingredients
  const [ingredients, setIngredients] = useState<Ingredient[]>([])

  // Nutrition facts
  const [servingSize, setServingSize] = useState('')
  const [servingsPerContainer, setServingsPerContainer] = useState('')
  const [calories, setCalories] = useState('')
  const [nutritionFields, setNutritionFields] = useState<NutritionField[]>([])

  useEffect(() => {
    if (!isNew) {
      getProduct(id)
        .then((data) => {
          const p = data.product
          setName(p.name)
          setSlug(p.slug)
          setDescription(p.description || '')
          setShortDescription(p.short_description || '')
          setPrice(String(p.price))
          setCompareAtPrice(p.compare_at_price ? String(p.compare_at_price) : '')
          setImages(p.images || [])
          setColorTheme(p.color_theme || '')
          setCategory(p.category || '')
          setStatus(p.is_coming_soon ? 'coming_soon' : p.is_active ? 'active' : 'inactive')
          setIsFeatured(p.is_featured)
          setInventoryCount(String(p.inventory_count))
          setSeoTitle(p.seo_title || '')
          setSeoDescription(p.seo_description || '')
          setTrustBadges(p.trust_badges || [])
          setIngredients(p.ingredients || [])
          if (p.nutrition_facts) {
            setServingSize(p.nutrition_facts.servingSize || '')
            setServingsPerContainer(
              p.nutrition_facts.servingsPerContainer != null
                ? String(p.nutrition_facts.servingsPerContainer)
                : ''
            )
            setCalories(String(p.nutrition_facts.calories || ''))
            setNutritionFields(p.nutrition_facts.fields || [])
          }
        })
        .catch(() => toast.error('Failed to load product'))
        .finally(() => setLoading(false))
    }
  }, [id, isNew])

  // Auto-slug from name
  useEffect(() => {
    if (isNew && name) setSlug(slugify(name))
  }, [name, isNew])

  async function handleSave() {
    if (!name.trim() || !slug.trim() || !price) {
      toast.error('Name, slug, and price are required')
      return
    }

    setSaving(true)
    const payload: Partial<Product> = {
      name: name.trim(),
      slug: slug.trim(),
      description: description || null,
      short_description: shortDescription || null,
      price: Number(price),
      compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
      images: images.length ? images : null,
      color_theme: colorTheme || null,
      category: category || null,
      is_active: status === 'active',
      is_featured: isFeatured,
      is_coming_soon: status === 'coming_soon',
      inventory_count: Number(inventoryCount),
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      trust_badges: trustBadges.length ? trustBadges : null,
      ingredients: ingredients.length ? ingredients : null,
      nutrition_facts: servingSize ? {
        servingSize,
        calories: Number(calories) || 0,
        fields: nutritionFields,
        ...(servingsPerContainer ? { servingsPerContainer: Number(servingsPerContainer) } : {}),
      } : null,
    }

    try {
      if (isNew) {
        const data = await createProduct(payload)
        toast.success('Product created')
        router.replace(`/dashboard/products/${data.product.id}`)
      } else {
        await updateProduct(id, payload)
        toast.success('Product updated')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Deactivate this product? It will be hidden from the store.')) return
    try {
      await deleteProduct(id)
      toast.success('Product deactivated')
      router.push('/dashboard/products')
    } catch {
      toast.error('Failed to deactivate product')
    }
  }

  function addImage() {
    if (imageInput.trim()) {
      setImages([...images, imageInput.trim()])
      setImageInput('')
    }
  }

  async function handleImageUpload(files: FileList | File[]) {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!fileArray.length) {
      toast.error('No valid image files selected')
      return
    }
    setUploading(true)
    try {
      const urls = await uploadProductImages(fileArray, isNew ? undefined : id)
      setImages((prev) => [...prev, ...urls])
      toast.success(`${fileArray.length} image${fileArray.length > 1 ? 's' : ''} uploaded`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleImageDelete(url: string, index: number) {
    const isSupabaseUrl = url.includes('supabase.co/storage')
    setImages((prev) => prev.filter((_, i) => i !== index))
    if (isSupabaseUrl) {
      try {
        await deleteProductImage(url, isNew ? undefined : id)
      } catch {
        toast.error('Image removed from list but failed to delete from storage')
      }
    }
  }

  function addIngredient() {
    setIngredients([...ingredients, { name: '', description: '', amount: '', unit: '' }])
  }

  function updateIngredient(i: number, field: keyof Ingredient, value: string) {
    const updated = [...ingredients]
    updated[i] = { ...updated[i], [field]: value }
    setIngredients(updated)
  }

  function removeIngredient(i: number) {
    setIngredients(ingredients.filter((_, idx) => idx !== i))
  }

  function addNutritionField() {
    setNutritionFields([...nutritionFields, { label: '', value: '', dailyPercent: '' }])
  }

  function updateNutritionField(i: number, field: keyof NutritionField, value: string) {
    const updated = [...nutritionFields]
    updated[i] = { ...updated[i], [field]: value }
    setNutritionFields(updated)
  }

  function removeNutritionField(i: number) {
    setNutritionFields(nutritionFields.filter((_, idx) => idx !== i))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-green" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/products')}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {isNew ? 'New Product' : `Edit: ${name}`}
          </h1>
          <div className="flex gap-3">
            {!isNew && (
              <button onClick={handleDelete} className="flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600">
                <Trash2 className="h-3.5 w-3.5" /> Deactivate
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save className="h-4 w-4" />}
              {isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">Basic Info</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField label="Product Name" value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder="e.g. Immunity Support" />
            <InputField label="Slug" value={slug} onChange={(e) => setSlug(e.currentTarget.value)} placeholder="immunity-support" />
            <div className="sm:col-span-2"><TextArea label="Description" value={description} onChange={(e) => setDescription(e.currentTarget.value)} rows={3} placeholder="Full product description..." /></div>
            <div className="sm:col-span-2"><InputField label="Short Description" value={shortDescription} onChange={(e) => setShortDescription(e.currentTarget.value)} placeholder="One-line tagline" /></div>
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">Pricing & Stock</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <InputField label="Price (paise)" type="number" value={price} onChange={(e) => setPrice(e.currentTarget.value)} placeholder="49900" />
            <InputField label="Compare At Price (paise)" type="number" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.currentTarget.value)} placeholder="Optional" />
            <InputField label="Inventory Count" type="number" value={inventoryCount} onChange={(e) => setInventoryCount(e.currentTarget.value)} />
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">Appearance & Classification</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Color Theme</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_THEMES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColorTheme(c)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${colorTheme === c ? 'border-gray-900 bg-gray-50 font-medium' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PRODUCT_COLORS[c] }} />
                    <span className="capitalize">{c}</span>
                  </button>
                ))}
              </div>
            </div>
            <InputField label="Category" value={category} onChange={(e) => setCategory(e.currentTarget.value)} placeholder="e.g. immunity" />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Status</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${status === opt.value ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: opt.dot }} />
                      {opt.label}
                    </span>
                    <span className="pl-[18px] text-[11px] text-gray-400">{opt.hint}</span>
                  </button>
                ))}
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                />
                Featured
                <span className="text-[11px] text-gray-400">— shown in homepage Best Sellers (only when Active)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">Images</h2>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleImageUpload(e.dataTransfer.files) }}
            onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.accept = 'image/jpeg,image/png,image/webp,image/avif'; input.onchange = () => input.files && handleImageUpload(input.files); input.click() }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${dragOver ? 'border-brand-green bg-brand-green/5' : 'border-gray-300 hover:border-gray-400'} ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            {uploading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-green" />
                Uploading...
              </div>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">Drop images here or click to upload</p>
                <p className="mt-1 text-xs text-gray-400">JPEG, PNG, WebP, AVIF — max 5MB each</p>
              </>
            )}
          </div>

          {/* URL input (still available) */}
          <div className="mt-3 flex gap-2">
            <input
              value={imageInput}
              onChange={(e) => setImageInput(e.target.value)}
              placeholder="Or paste image URL..."
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
            />
            <button onClick={addImage} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors">Add</button>
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((url, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  <img src={url} alt={`Product ${i + 1}`} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '' ; (e.target as HTMLImageElement).style.display = 'none' }} />
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100" style={{ zIndex: 0 }}>
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                  </div>
                  <div className="absolute inset-0 z-10" />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleImageDelete(url, i) }}
                    className="absolute right-2 top-2 z-20 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trust Badges */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">Trust Badges</h2>
          <div className="flex flex-wrap gap-2">
            {TRUST_BADGE_OPTIONS.map((badge) => (
              <button
                key={badge}
                type="button"
                onClick={() => setTrustBadges(trustBadges.includes(badge) ? trustBadges.filter((b) => b !== badge) : [...trustBadges, badge])}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${trustBadges.includes(badge) ? 'bg-brand-green/10 text-brand-green border border-brand-green/30' : 'border border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                {badge}
              </button>
            ))}
          </div>
        </div>

        {/* Ingredients */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Ingredients</h2>
            <button onClick={addIngredient} className="flex items-center gap-1 text-sm font-medium text-brand-green hover:opacity-80">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          <div className="space-y-3">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-start rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="grid flex-1 gap-2 sm:grid-cols-4">
                  <input value={ing.name} onChange={(e) => updateIngredient(i, 'name', e.target.value)} placeholder="Name" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-green focus:outline-none" />
                  <input value={ing.amount} onChange={(e) => updateIngredient(i, 'amount', e.target.value)} placeholder="Amount" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-green focus:outline-none" />
                  <input value={ing.unit} onChange={(e) => updateIngredient(i, 'unit', e.target.value)} placeholder="Unit" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-green focus:outline-none" />
                  <input value={ing.description} onChange={(e) => updateIngredient(i, 'description', e.target.value)} placeholder="Benefit" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-green focus:outline-none" />
                </div>
                <button onClick={() => removeIngredient(i)} className="mt-2 text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Nutrition Facts */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Nutrition Facts</h2>
            <button onClick={addNutritionField} className="flex items-center gap-1 text-sm font-medium text-brand-green hover:opacity-80">
              <Plus className="h-4 w-4" /> Add Field
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <InputField label="Serving Size" value={servingSize} onChange={(e) => setServingSize(e.currentTarget.value)} placeholder="e.g. 2 gummies (4g)" />
            <InputField label="Servings Per Container" type="number" value={servingsPerContainer} onChange={(e) => setServingsPerContainer(e.currentTarget.value)} placeholder="e.g. 15" />
            <InputField label="Calories" type="number" value={calories} onChange={(e) => setCalories(e.currentTarget.value)} placeholder="15" />
          </div>
          <div className="space-y-2">
            {nutritionFields.map((field, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={field.label} onChange={(e) => updateNutritionField(i, 'label', e.target.value)} placeholder="Label (e.g. Vitamin C)" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-green focus:outline-none" />
                <input value={field.value} onChange={(e) => updateNutritionField(i, 'value', e.target.value)} placeholder="Value (e.g. 40mg)" className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-green focus:outline-none" />
                <input value={field.dailyPercent} onChange={(e) => updateNutritionField(i, 'dailyPercent', e.target.value)} placeholder="% DV" className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-green focus:outline-none" />
                <button onClick={() => removeNutritionField(i)} className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* SEO */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">SEO</h2>
          <div className="grid gap-4">
            <InputField label="SEO Title" value={seoTitle} onChange={(e) => setSeoTitle(e.currentTarget.value)} placeholder="Page title for search engines" />
            <TextArea label="SEO Description" value={seoDescription} onChange={(e) => setSeoDescription(e.currentTarget.value)} rows={2} placeholder="Meta description for search results" />
          </div>
        </div>
      </div>
    </>
  )
}

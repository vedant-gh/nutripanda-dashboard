'use client'

import { useState } from 'react'
import {
  Heading, Type, Image as ImageIcon, LayoutGrid, Quote, List, Megaphone,
  Minus, MousePointerClick, Youtube, ChevronUp, ChevronDown, Trash2, Plus, X, Upload,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type {
  BlogBlock, BlogBlockType, BlogImageBlock, BlogImageGridBlock, BlogListBlock,
} from '@/lib/types'
import { uploadImages } from '@/lib/api'

const BLOCK_TYPES: { type: BlogBlockType; label: string; icon: typeof Type }[] = [
  { type: 'heading', label: 'Heading', icon: Heading },
  { type: 'paragraph', label: 'Paragraph', icon: Type },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'imageGrid', label: 'Image Grid', icon: LayoutGrid },
  { type: 'quote', label: 'Quote', icon: Quote },
  { type: 'list', label: 'List', icon: List },
  { type: 'callout', label: 'Callout', icon: Megaphone },
  { type: 'divider', label: 'Divider', icon: Minus },
  { type: 'cta', label: 'Button (CTA)', icon: MousePointerClick },
  { type: 'embed', label: 'YouTube Embed', icon: Youtube },
]

const TYPE_LABELS: Record<BlogBlockType, string> = {
  heading: 'Heading',
  paragraph: 'Paragraph',
  image: 'Image',
  imageGrid: 'Image Grid',
  quote: 'Quote',
  list: 'List',
  callout: 'Callout',
  divider: 'Divider',
  cta: 'Button (CTA)',
  embed: 'YouTube Embed',
}

function newBlock(type: BlogBlockType): BlogBlock {
  const id = crypto.randomUUID()
  switch (type) {
    case 'heading': return { id, type, level: 2, text: '' }
    case 'paragraph': return { id, type, text: '' }
    case 'image': return { id, type, url: '', alt: '', caption: '', width: 'normal' }
    case 'imageGrid': return { id, type, columns: 2, images: [] }
    case 'quote': return { id, type, text: '', attribution: '' }
    case 'list': return { id, type, style: 'bullet', items: [''] }
    case 'callout': return { id, type, emoji: '', title: '', text: '', tone: 'green' }
    case 'divider': return { id, type }
    case 'cta': return { id, type, label: '', href: '', style: 'primary' }
    case 'embed': return { id, type, provider: 'youtube', url: '', caption: '' }
  }
}

const fieldClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green'
const areaClass =
  'w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green'
const selectClass =
  'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">{children}</label>
}

export default function BlockEditor({
  value,
  onChange,
}: {
  value: BlogBlock[]
  onChange: (blocks: BlogBlock[]) => void
}) {
  const [addOpen, setAddOpen] = useState(false)

  function addBlock(type: BlogBlockType) {
    onChange([...value, newBlock(type)])
    setAddOpen(false)
  }

  function updateBlock(index: number, patch: Partial<BlogBlock>) {
    const next = value.slice()
    next[index] = { ...next[index], ...patch } as BlogBlock
    onChange(next)
  }

  function removeBlock(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function moveBlock(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= value.length) return
    const next = value.slice()
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
          No content blocks yet. Add your first block below.
        </div>
      )}

      {value.map((block, index) => (
        <div key={block.id} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
          {/* Block header */}
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-gray-500 ring-1 ring-gray-200">
              {TYPE_LABELS[block.type]}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveBlock(index, -1)}
                disabled={index === 0}
                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-30"
                aria-label="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveBlock(index, 1)}
                disabled={index === value.length - 1}
                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-30"
                aria-label="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => removeBlock(index)}
                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                aria-label="Delete block"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Block fields */}
          <BlockFields block={block} onUpdate={(patch) => updateBlock(index, patch)} />
        </div>
      ))}

      {/* Add block control */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-brand-green hover:text-brand-green"
        >
          <Plus className="h-4 w-4" />
          Add block
        </button>

        {addOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setAddOpen(false)} />
            <div className="absolute bottom-full left-0 right-0 z-20 mb-2 grid grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg sm:grid-cols-3">
              {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function BlockFields({
  block,
  onUpdate,
}: {
  block: BlogBlock
  onUpdate: (patch: Partial<BlogBlock>) => void
}) {
  switch (block.type) {
    case 'heading':
      return (
        <div className="flex gap-2">
          <select
            value={block.level}
            onChange={(e) => onUpdate({ level: Number(e.target.value) as 2 | 3 })}
            className={selectClass}
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="Heading text"
            className={fieldClass}
          />
        </div>
      )

    case 'paragraph':
      return (
        <textarea
          value={block.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          rows={4}
          placeholder="Write a paragraph... Supports **bold**, *italic*, [links](https://url)"
          className={areaClass}
        />
      )

    case 'image':
      return <ImageBlockFields block={block} onUpdate={onUpdate} />

    case 'imageGrid':
      return <ImageGridBlockFields block={block} onUpdate={onUpdate} />

    case 'quote':
      return (
        <div className="space-y-2">
          <textarea
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={2}
            placeholder="Quote text"
            className={areaClass}
          />
          <input
            value={block.attribution ?? ''}
            onChange={(e) => onUpdate({ attribution: e.target.value })}
            placeholder="Attribution (optional)"
            className={fieldClass}
          />
        </div>
      )

    case 'list':
      return <ListBlockFields block={block} onUpdate={onUpdate} />

    case 'callout':
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={block.emoji ?? ''}
              onChange={(e) => onUpdate({ emoji: e.target.value })}
              placeholder="Emoji"
              className={`${fieldClass} w-20 text-center`}
            />
            <input
              value={block.title ?? ''}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Title (optional)"
              className={fieldClass}
            />
            <select
              value={block.tone}
              onChange={(e) => onUpdate({ tone: e.target.value as 'green' | 'yellow' | 'neutral' })}
              className={selectClass}
            >
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <textarea
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={2}
            placeholder="Callout text"
            className={areaClass}
          />
        </div>
      )

    case 'divider':
      return (
        <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
          <Minus className="h-4 w-4" />
          Divider — a horizontal rule between sections.
        </div>
      )

    case 'cta':
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={block.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="Button label"
              className={fieldClass}
            />
            <select
              value={block.style ?? 'primary'}
              onChange={(e) => onUpdate({ style: e.target.value as 'primary' | 'secondary' })}
              className={selectClass}
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </select>
          </div>
          <input
            value={block.href}
            onChange={(e) => onUpdate({ href: e.target.value })}
            placeholder="https://..."
            className={fieldClass}
          />
        </div>
      )

    case 'embed':
      return (
        <div className="space-y-2">
          <input
            value={block.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
            className={fieldClass}
          />
          <p className="text-[11px] text-gray-400">Paste a YouTube link.</p>
          <input
            value={block.caption ?? ''}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            placeholder="Caption (optional)"
            className={fieldClass}
          />
        </div>
      )
  }
}

function ImageBlockFields({
  block,
  onUpdate,
}: {
  block: BlogImageBlock
  onUpdate: (patch: Partial<BlogImageBlock>) => void
}) {
  const [uploading, setUploading] = useState(false)

  async function handleUpload(files: FileList | null) {
    const list = files ? Array.from(files).filter((f) => f.type.startsWith('image/')) : []
    if (!list.length) return
    setUploading(true)
    try {
      const urls = await uploadImages([list[0]])
      if (urls[0]) onUpdate({ url: urls[0] })
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {block.url ? (
        <div className="group relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.alt || ''} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onUpdate({ url: '' })}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-gray-400 ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
          {uploading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-green" />
              Uploading...
            </div>
          ) : (
            <>
              <Upload className="mb-1.5 h-6 w-6 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Upload image</span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </label>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={block.alt ?? ''}
          onChange={(e) => onUpdate({ alt: e.target.value })}
          placeholder="Alt text"
          className={fieldClass}
        />
        <select
          value={block.width ?? 'normal'}
          onChange={(e) => onUpdate({ width: e.target.value as 'normal' | 'wide' | 'full' })}
          className={selectClass}
        >
          <option value="normal">Normal width</option>
          <option value="wide">Wide</option>
          <option value="full">Full bleed</option>
        </select>
      </div>
      <input
        value={block.caption ?? ''}
        onChange={(e) => onUpdate({ caption: e.target.value })}
        placeholder="Caption (optional)"
        className={fieldClass}
      />
    </div>
  )
}

function ImageGridBlockFields({
  block,
  onUpdate,
}: {
  block: BlogImageGridBlock
  onUpdate: (patch: Partial<BlogImageGridBlock>) => void
}) {
  const [uploading, setUploading] = useState(false)

  async function handleUpload(files: FileList | null) {
    const list = files ? Array.from(files).filter((f) => f.type.startsWith('image/')) : []
    if (!list.length) return
    setUploading(true)
    try {
      const urls = await uploadImages(list)
      onUpdate({ images: [...block.images, ...urls.map((url) => ({ url }))] })
      toast.success(`${urls.length} image${urls.length > 1 ? 's' : ''} uploaded`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function updateImage(i: number, patch: { caption?: string }) {
    const images = block.images.slice()
    images[i] = { ...images[i], ...patch }
    onUpdate({ images })
  }

  function removeImage(i: number) {
    onUpdate({ images: block.images.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FieldLabel>Columns</FieldLabel>
        <select
          value={block.columns}
          onChange={(e) => onUpdate({ columns: Number(e.target.value) as 2 | 3 })}
          className={`${selectClass} !mb-0`}
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </div>

      {block.images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {block.images.map((img, i) => (
            <div key={i} className="space-y-1.5">
              <div className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <input
                value={img.caption ?? ''}
                onChange={(e) => updateImage(i, { caption: e.target.value })}
                placeholder="Caption"
                className={`${fieldClass} !py-1 text-xs`}
              />
            </div>
          ))}
        </div>
      )}

      <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
        {uploading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-green" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 text-gray-400" />
            Add images
          </>
        )}
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </label>
    </div>
  )
}

function ListBlockFields({
  block,
  onUpdate,
}: {
  block: BlogListBlock
  onUpdate: (patch: Partial<BlogListBlock>) => void
}) {
  function updateItem(i: number, val: string) {
    const items = block.items.slice()
    items[i] = val
    onUpdate({ items })
  }

  function addItem() {
    onUpdate({ items: [...block.items, ''] })
  }

  function removeItem(i: number) {
    onUpdate({ items: block.items.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-2">
      <select
        value={block.style}
        onChange={(e) => onUpdate({ style: e.target.value as 'bullet' | 'number' })}
        className={selectClass}
      >
        <option value="bullet">Bulleted</option>
        <option value="number">Numbered</option>
      </select>

      <div className="space-y-1.5">
        {block.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-center text-sm text-gray-400">
              {block.style === 'number' ? `${i + 1}.` : '•'}
            </span>
            <input
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder={`Item ${i + 1}`}
              className={fieldClass}
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="shrink-0 text-gray-400 hover:text-red-500"
              aria-label="Remove item"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1 text-sm font-medium text-brand-green hover:opacity-80"
      >
        <Plus className="h-4 w-4" /> Add item
      </button>
    </div>
  )
}

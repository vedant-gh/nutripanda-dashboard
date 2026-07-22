'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Send, Upload, X, ChevronDown, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createBlogPost, updateBlogPost, uploadImages } from '@/lib/api'
import type { BlogPost, BlogPostInput, BlogBlock } from '@/lib/types'
import { slugify } from '@/lib/utils'
import BlockEditor from './BlockEditor'

const MARKDOWN_HINT = 'Supports **bold**, *italic*, [links](https://url)'

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green'
const areaClass =
  'w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green'

export default function BlogEditor({ post }: { post?: BlogPost }) {
  const router = useRouter()
  const isNew = !post

  const [title, setTitle] = useState(post?.title ?? '')
  const [slug, setSlug] = useState(post?.slug ?? '')
  // Once the user manually edits the slug (or on an existing post), stop auto-syncing.
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [coverImage, setCoverImage] = useState<string>(post?.cover_image_url ?? '')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [tags, setTags] = useState<string[]>(post?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [category, setCategory] = useState(post?.category ?? '')
  const [author, setAuthor] = useState(post?.author ?? 'NutriPanda Team')
  const [status, setStatus] = useState<'draft' | 'published'>(post?.status ?? 'draft')
  const [isFeatured, setIsFeatured] = useState(post?.is_featured ?? false)
  const [seoOpen, setSeoOpen] = useState(false)
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? '')
  const [seoDescription, setSeoDescription] = useState(post?.seo_description ?? '')
  const [content, setContent] = useState<BlogBlock[]>(post?.content ?? [])
  const [saving, setSaving] = useState<'idle' | 'save' | 'publish'>('idle')

  function handleTitleChange(val: string) {
    setTitle(val)
    if (!slugTouched) setSlug(slugify(val))
  }

  function handleSlugChange(val: string) {
    setSlugTouched(true)
    setSlug(val)
  }

  function commitTags(raw: string) {
    const parts = raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (!parts.length) return
    setTags((prev) => Array.from(new Set([...prev, ...parts])))
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  async function handleCoverUpload(files: FileList | null) {
    const list = files ? Array.from(files).filter((f) => f.type.startsWith('image/')) : []
    if (!list.length) {
      toast.error('No valid image selected')
      return
    }
    setUploadingCover(true)
    try {
      const urls = await uploadImages([list[0]])
      if (urls[0]) setCoverImage(urls[0])
      toast.success('Cover image uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingCover(false)
    }
  }

  async function save(publish: boolean) {
    if (!title.trim() || !slug.trim()) {
      toast.error('Title and slug are required')
      return
    }

    const nextStatus: 'draft' | 'published' = publish ? 'published' : status
    setSaving(publish ? 'publish' : 'save')

    // Merge any pending tag text still in the input.
    const finalTags = tagInput.trim()
      ? Array.from(new Set([...tags, ...tagInput.split(',').map((t) => t.trim()).filter(Boolean)]))
      : tags

    const payload: BlogPostInput = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      cover_image_url: coverImage || null,
      content,
      author: author.trim() || null,
      tags: finalTags,
      category: category.trim() || null,
      status: nextStatus,
      is_featured: isFeatured,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDescription.trim() || null,
    }

    try {
      if (isNew) {
        await createBlogPost(payload)
        toast.success(publish ? 'Post published' : 'Post created')
      } else {
        await updateBlogPost(post.id, payload)
        toast.success(publish ? 'Post published' : 'Post saved')
      }
      router.push('/dashboard/blog')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving('idle')
    }
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/blog')}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {isNew ? 'New Post' : `Edit: ${post.title || 'Untitled'}`}
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => save(false)}
              disabled={saving !== 'idle'}
              className="flex items-center gap-1.5 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-900 hover:text-gray-900 disabled:opacity-50"
            >
              {saving === 'save' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving !== 'idle'}
              className="flex items-center gap-1.5 rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving === 'publish' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Save &amp; Publish
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">Post Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Title</Label>
              <input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. 5 Ways Vitamin C Boosts Immunity"
                className={inputClass}
              />
            </div>
            <div>
              <Label>Slug</Label>
              <input
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="vitamin-c-immunity"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Excerpt</Label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                placeholder="A short summary shown in listings and previews."
                className={areaClass}
              />
              <p className="mt-1 text-[11px] text-gray-400">{MARKDOWN_HINT}</p>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">Cover Image</h2>
          {coverImage ? (
            <div className="group relative aspect-video w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImage} alt="Cover" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setCoverImage('')}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                aria-label="Remove cover image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-8 transition-colors hover:border-gray-400 ${uploadingCover ? 'pointer-events-none opacity-50' : ''}`}>
              {uploadingCover ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-green" />
                  Uploading...
                </div>
              ) : (
                <>
                  <Upload className="mb-2 h-8 w-8 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Click to upload a cover image</p>
                  <p className="mt-1 text-xs text-gray-400">JPEG, PNG, WebP, AVIF</p>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={(e) => handleCoverUpload(e.target.files)}
              />
            </label>
          )}
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Content</h2>
          </div>
          <p className="mb-5 text-[11px] text-gray-400">
            Text blocks support {MARKDOWN_HINT.toLowerCase()}.
          </p>
          <BlockEditor value={content} onChange={setContent} />
        </div>

        {/* Classification */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">Classification</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 focus-within:border-brand-green focus-within:ring-1 focus-within:ring-brand-green">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-2.5 py-1 text-xs font-medium text-brand-green"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      commitTags(tagInput)
                    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
                      removeTag(tags[tags.length - 1])
                    }
                  }}
                  onBlur={() => commitTags(tagInput)}
                  placeholder={tags.length ? 'Add tag...' : 'Comma-separated tags'}
                  className="min-w-[8rem] flex-1 border-0 bg-transparent py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Nutrition"
                className={inputClass}
              />
            </div>
            <div>
              <Label>Author</Label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="NutriPanda Team"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Publishing */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">Publishing</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                className={inputClass}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                />
                Featured
                <span className="text-[11px] text-gray-400">— highlighted on the blog page</span>
              </label>
            </div>
          </div>
        </div>

        {/* SEO (collapsible) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <button
            type="button"
            onClick={() => setSeoOpen((o) => !o)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-sm font-semibold text-gray-900">SEO</h2>
            {seoOpen ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>
          {seoOpen && (
            <div className="mt-5 grid gap-4">
              <div>
                <Label>SEO Title</Label>
                <input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Title for search engines"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>SEO Description</Label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={2}
                  placeholder="Meta description for search results"
                  className={areaClass}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

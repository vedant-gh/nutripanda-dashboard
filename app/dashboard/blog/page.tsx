'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Search, MoreVertical, Pencil, Trash2, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { getBlogPosts, deleteBlogPost } from '@/lib/api'
import type { BlogPost } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmModal from '@/components/ui/ConfirmModal'

type StatusFilter = '' | 'published' | 'draft'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
]

function StatusBadge({ status }: { status: BlogPost['status'] }) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
        Published
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
      Draft
    </span>
  )
}

export default function BlogPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<BlogPost | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getBlogPosts()
      .then((data) => setPosts(data.posts))
      .catch(() => toast.error('Failed to load blog posts'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return posts.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false
      if (!q) return true
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.category?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [posts, search, statusFilter])

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteBlogPost(toDelete.id)
      setPosts((prev) => prev.filter((p) => p.id !== toDelete.id))
      toast.success(`"${toDelete.title}" deleted`)
      setToDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete post')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Blog"
        description={`${posts.length} post${posts.length !== 1 ? 's' : ''}`}
        actions={
          <button
            onClick={() => router.push('/dashboard/blog/new')}
            className="flex items-center gap-2 rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Post
          </button>
        }
      />

      {/* Search + status filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search posts by title, slug, category..."
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

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-green" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No posts yet"
            description="Write your first blog post to get started."
            action={
              <button
                onClick={() => router.push('/dashboard/blog/new')}
                className="rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                New Post
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching posts"
            description="Try a different search term or filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Post</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">Category</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">Read</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">Updated</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((post, i) => (
                  <motion.tr
                    key={post.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => router.push(`/dashboard/blog/${post.id}`)}
                    className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          {post.cover_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.cover_image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <FileText className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{post.title || 'Untitled'}</p>
                          <p className="truncate text-xs text-gray-500">/{post.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={post.status} />
                    </td>
                    <td className="hidden px-4 py-3.5 text-gray-600 sm:table-cell">
                      {post.category || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="hidden px-4 py-3.5 text-gray-600 md:table-cell">
                      {post.reading_time ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          {post.reading_time} min
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3.5 text-xs text-gray-500 sm:table-cell">
                      {formatDate(post.updated_at)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Post actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {menuOpen === post.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                              <button
                                onClick={() => { setMenuOpen(null); router.push(`/dashboard/blog/${post.id}`) }}
                                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => { setMenuOpen(null); setToDelete(post) }}
                                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!toDelete}
        title="Delete this post?"
        description={
          toDelete ? (
            <>
              &ldquo;<span className="font-semibold">{toDelete.title || 'Untitled'}</span>&rdquo; will be permanently
              deleted. This cannot be undone.
            </>
          ) : undefined
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setToDelete(null)}
      />
    </>
  )
}

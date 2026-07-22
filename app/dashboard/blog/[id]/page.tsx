'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { getBlogPost } from '@/lib/api'
import type { BlogPost } from '@/lib/types'
import BlogEditor from '@/components/blog/BlogEditor'

export default function EditBlogPostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    getBlogPost(id)
      .then((data) => setPost(data.post))
      .catch(() => {
        setNotFound(true)
        toast.error('Failed to load post')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-green" />
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">Post not found</h3>
        <p className="mt-1 text-sm text-gray-500">This post may have been deleted.</p>
        <button
          onClick={() => router.push('/dashboard/blog')}
          className="mt-6 flex items-center gap-1.5 rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </button>
      </div>
    )
  }

  return <BlogEditor post={post} />
}

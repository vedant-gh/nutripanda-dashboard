'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  createDashboardBlogEditor,
  deleteDashboardBlogEditor,
  getDashboardBlogEditors,
  updateDashboardBlogEditorPassword,
} from '@/lib/api'
import type { DashboardBlogEditor } from '@/lib/types'
import ConfirmModal from '@/components/ui/ConfirmModal'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'

const MIN_PASSWORD_LENGTH = 12
const inputClass = 'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green'

function formatDate(value: string | null): string {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function PasswordInput({
  id,
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  onToggle: () => void
  placeholder: string
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={128}
        autoComplete="new-password"
        placeholder={placeholder}
        required
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-gray-400 transition-colors hover:text-gray-700"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export default function BlogAccessPage() {
  const [editors, setEditors] = useState<DashboardBlogEditor[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [creating, setCreating] = useState(false)
  const [resetTarget, setResetTarget] = useState<DashboardBlogEditor | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DashboardBlogEditor | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function loadEditors() {
    try {
      const data = await getDashboardBlogEditors()
      setEditors(data.editors)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load blog editors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEditors()
  }, [])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }

    setCreating(true)
    try {
      const data = await createDashboardBlogEditor(email.trim(), password)
      setEditors((current) => [data.editor, ...current])
      setEmail('')
      setPassword('')
      setShowPassword(false)
      toast.success(`Blog access granted to ${data.editor.email}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add blog editor')
    } finally {
      setCreating(false)
    }
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault()
    if (!resetTarget) return
    if (resetPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }

    setResetting(true)
    try {
      const data = await updateDashboardBlogEditorPassword(resetTarget.id, resetPassword)
      setEditors((current) => current.map((editor) => (
        editor.id === data.editor.id ? data.editor : editor
      )))
      setResetTarget(null)
      setResetPassword('')
      setShowResetPassword(false)
      toast.success('Password changed and existing editor sessions revoked')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password')
    } finally {
      setResetting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteDashboardBlogEditor(deleteTarget.id)
      setEditors((current) => current.filter((editor) => editor.id !== deleteTarget.id))
      if (resetTarget?.id === deleteTarget.id) {
        setResetTarget(null)
        setResetPassword('')
      }
      toast.success(`Access revoked for ${deleteTarget.email}`)
      setDeleteTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke access')
    } finally {
      setDeleting(false)
    }
  }

  function startPasswordReset(editor: DashboardBlogEditor) {
    setResetTarget(editor)
    setResetPassword('')
    setShowResetPassword(false)
  }

  return (
    <>
      <PageHeader
        title="Blog Access"
        description="Add or remove people who can access only the Blog section."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
        <form onSubmit={handleCreate} className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <UserPlus className="mt-0.5 h-6 w-6 text-brand-green" />
            <div>
              <h2 className="text-base font-bold text-gray-900">Add a blog editor</h2>
              <p className="mt-1 text-sm text-gray-500">
                They will sign in with this email and password and see only Blog.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="editor-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Email
              </label>
              <input
                id="editor-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="off"
                placeholder="writer@example.com"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="editor-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Assigned password
              </label>
              <PasswordInput
                id="editor-password"
                value={password}
                onChange={setPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
                placeholder="At least 12 characters"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-400">Passwords are salted and hashed before storage.</p>
            <button
              type="submit"
              disabled={creating}
              className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {creating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <><UserPlus className="h-4 w-4" /> Grant blog access</>
              )}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 p-5 sm:p-6">
          <ShieldCheck className="h-7 w-7 text-brand-green" />
          <h2 className="mt-4 text-base font-bold text-gray-900">Admin-controlled access</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-600">
            <li>Editors can create, edit, publish, and delete blog posts.</li>
            <li>Orders, products, coupons, inventory, and this page stay blocked.</li>
            <li>Deleting an editor revokes their session on the next request.</li>
          </ul>
        </div>
      </div>

      {resetTarget && (
        <form onSubmit={handleResetPassword} className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <h2 className="text-sm font-bold text-gray-900">Set a new password for {resetTarget.email}</h2>
              <p className="mt-1 text-xs text-gray-500">Saving it immediately signs out all existing sessions for this editor.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="max-w-md flex-1">
                  <PasswordInput
                    id="reset-editor-password"
                    value={resetPassword}
                    onChange={setResetPassword}
                    visible={showResetPassword}
                    onToggle={() => setShowResetPassword((current) => !current)}
                    placeholder="New password, at least 12 characters"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetting}
                  className="min-h-11 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {resetting ? 'Saving…' : 'Save new password'}
                </button>
                <button
                  type="button"
                  disabled={resetting}
                  onClick={() => { setResetTarget(null); setResetPassword('') }}
                  className="min-h-11 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">People with blog access</h2>
            <p className="mt-0.5 text-xs text-gray-400">Passwords can never be viewed after saving.</p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            {editors.length} {editors.length === 1 ? 'editor' : 'editors'}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-green" />
          </div>
        ) : editors.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No blog editors yet"
            description="Add an email and password above to grant blog-only access."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Added</th>
                  <th className="px-5 py-3">Last sign-in</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {editors.map((editor) => (
                  <tr key={editor.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-4 font-semibold text-gray-900">{editor.email}</td>
                    <td className="px-5 py-4 text-gray-500">{formatDate(editor.created_at)}</td>
                    <td className="px-5 py-4 text-gray-500">{formatDate(editor.last_login_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startPasswordReset(editor)}
                          className="flex min-h-11 items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900"
                        >
                          <KeyRound className="h-4 w-4" /> Reset password
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(editor)}
                          className="flex min-h-11 items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:border-red-400 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" /> Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Revoke blog access?"
        description={deleteTarget ? (
          <>This permanently removes <strong>{deleteTarget.email}</strong> and invalidates their active dashboard session.</>
        ) : undefined}
        confirmLabel="Revoke access"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </>
  )
}

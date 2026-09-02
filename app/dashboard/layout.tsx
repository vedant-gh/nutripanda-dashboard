'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Ticket,
  BarChart3,
  UserCog,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import type { DashboardRole } from '@/lib/api'

const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'Blog', href: '/dashboard/blog', icon: FileText },
  { label: 'Blog Access', href: '/dashboard/blog-access', icon: UserCog },
  { label: 'Coupons', href: '/dashboard/coupons', icon: Ticket },
  { label: 'Inventory', href: '/dashboard/inventory', icon: BarChart3 },
]

function isBlogDashboardPath(pathname: string) {
  return pathname === '/dashboard/blog' || pathname.startsWith('/dashboard/blog/')
}

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname.startsWith(href)
}

function SidebarContent({
  role,
  pathname,
  onNavigate,
  onLogout,
}: {
  role: DashboardRole | null
  pathname: string
  onNavigate: () => void
  onLogout: () => void
}) {
  const navItems = role === 'blog_editor'
    ? NAV_ITEMS.filter((item) => item.href === '/dashboard/blog')
    : NAV_ITEMS

  return (
    <>
      {/* Branding */}
      <div className="p-6 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="NutriPanda" className="h-9 w-auto" />
        <p className="mt-2 text-[11px] font-medium uppercase tracking-widest text-gray-400">
          {role === 'blog_editor' ? 'Blog Editor' : 'Admin'}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-green/10 text-brand-green font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-green" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading, role, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/')
    } else if (!isLoading && role === 'blog_editor' && !isBlogDashboardPath(pathname)) {
      router.replace('/dashboard/blog')
    }
  }, [isLoading, isAuthenticated, pathname, role, router])

  const isRedirectingEditor = role === 'blog_editor' && !isBlogDashboardPath(pathname)

  if (isLoading || !isAuthenticated || isRedirectingEditor) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-green" />
      </div>
    )
  }

  async function handleLogout() {
    await logout()
    router.replace('/')
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sidebar-pattern hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <SidebarContent
          role={role}
          pathname={pathname}
          onNavigate={() => setSidebarOpen(false)}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -264 }}
              animate={{ x: 0 }}
              exit={{ x: -264 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="sidebar-pattern fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white lg:hidden"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute right-3 top-5 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent
                role={role}
                pathname={pathname}
                onNavigate={() => setSidebarOpen(false)}
                onLogout={handleLogout}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
            {role === 'blog_editor' ? 'NutriPanda Blog' : 'NutriPanda Admin'}
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

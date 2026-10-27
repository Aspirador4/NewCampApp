'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, User, Wallet } from 'lucide-react'

interface BottomNavProps {
  isAuthenticated: boolean
}

export function BottomNav({ isAuthenticated }: BottomNavProps) {
  const pathname = usePathname()

  // Hide nav on login or standalone auth pages
  if (pathname === '/login' || pathname.startsWith('/auth/')) {
    return null
  }

  const navItems = [
    { href: '/', label: 'Inicio', icon: Home },
    { href: '/eventos', label: 'Eventos', icon: Calendar },
    { href: '/miembros', label: 'Miembros', icon: Users },
    { href: '/finanzas', label: 'Finanzas', icon: Wallet },
    { href: isAuthenticated ? '/perfil' : '/login', label: 'Perfil', icon: User },
  ]

  return (
    <nav
      aria-label="Navegación principal inferior"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 dark:bg-[#12141c]/95 backdrop-blur-md border-t-2 border-neutral-900/10 dark:border-white/10 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] px-3 pt-2 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="flex items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 min-h-[46px] min-w-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-100 active:scale-95 ${
                isActive
                  ? 'font-bold'
                  : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium'
              }`}
              style={
                isActive
                  ? {
                      color: 'var(--club-primary)',
                      backgroundColor: 'var(--club-primary-light)',
                    }
                  : undefined
              }
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="font-display uppercase tracking-tight text-[10px] mt-0.5 font-bold">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

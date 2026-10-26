'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, User, Wallet } from 'lucide-react'

interface BottomNavProps {
  isAuthenticated: boolean
}

export function BottomNav({ isAuthenticated }: BottomNavProps) {
  const pathname = usePathname()

  // Hide nav on login page
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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-neutral-200 py-1.5 px-3 z-40 shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 active:scale-90 ${
                isActive
                  ? 'text-emerald-600 font-bold scale-105 bg-emerald-50/70'
                  : 'text-neutral-400 hover:text-neutral-700 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

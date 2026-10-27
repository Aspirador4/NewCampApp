'use client'

import { useTheme, Theme } from '@/components/ThemeProvider'
import { Sun, Moon, Laptop } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ThemeToggleProps {
  variant?: 'compact' | 'segmented'
  className?: string
}

export function ThemeToggle({ variant = 'compact', className = '' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (variant === 'compact') {
    const isDark = mounted ? resolvedTheme === 'dark' : false

    const handleToggle = () => {
      // Toggle between light and dark
      setTheme(isDark ? 'light' : 'dark')
    }

    return (
      <button
        type="button"
        onClick={handleToggle}
        className={`btn-tactile w-11 h-11 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center justify-center shadow-tactile-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none min-h-[44px] min-w-[44px] ${className}`}
        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-amber-400 stroke-[2.5]" />
        ) : (
          <Moon className="w-5 h-5 text-neutral-800 stroke-[2.5]" />
        )}
      </button>
    )
  }

  // Segmented control variant (e.g. for Perfil / Settings)
  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Oscuro', icon: Moon },
    { value: 'system', label: 'Auto', icon: Laptop },
  ]

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/70 border-2 border-neutral-900 dark:border-neutral-700">
        {options.map((opt) => {
          const Icon = opt.icon
          const isSelected = mounted ? theme === opt.value : opt.value === 'system'

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={`btn-tactile min-h-[44px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-display font-black uppercase tracking-wider transition ${
                isSelected
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white border-2 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 stroke-[2.5] ${
                opt.value === 'light' && isSelected ? 'text-amber-500' :
                opt.value === 'dark' && isSelected ? 'text-blue-400' : ''
              }`} />
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

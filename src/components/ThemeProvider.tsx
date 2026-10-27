'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'campapp_theme'
const THEME_COOKIE_KEY = 'campapp_theme'

export function ThemeProvider({
  children,
  initialTheme = 'system',
}: {
  children: React.ReactNode
  initialTheme?: Theme
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage or system on mount
  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setThemeState(stored)
      }
    } catch {
      // localStorage may be unavailable in private browsing
    }
  }, [])

  // Resolve theme and apply .dark class to documentElement
  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      let active: 'light' | 'dark'
      if (theme === 'system') {
        active = mediaQuery.matches ? 'dark' : 'light'
      } else {
        active = theme
      }

      setResolvedTheme(active)

      if (active === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }

      // Update mobile browser status bar meta tag
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', active === 'dark' ? '#0c0d12' : '#059669')
      }
    }

    applyTheme()

    // Listen to OS system theme changes
    const handler = () => {
      if (theme === 'system') {
        applyTheme()
      }
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme)
      // Store in cookie for zero-flash SSR on Next.js
      document.cookie = `${THEME_COOKIE_KEY}=${newTheme}; path=/; max-age=31536000; SameSite=Lax`
    } catch {
      // Fallback
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: mounted ? resolvedTheme : (initialTheme === 'dark' ? 'dark' : 'light'), setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

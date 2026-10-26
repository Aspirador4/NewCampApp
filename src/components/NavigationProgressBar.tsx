'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)

  // Listen to clicks on navigation links
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || anchor.target === '_blank') {
        return
      }

      // Check if it's the exact same URL
      const currentUrl = window.location.pathname + window.location.search
      if (href === currentUrl) return

      setIsNavigating(true)
      setProgress(25)
    }

    document.addEventListener('click', handleAnchorClick)
    return () => {
      document.removeEventListener('click', handleAnchorClick)
    }
  }, [])

  // When route changes, complete the progress bar
  useEffect(() => {
    if (isNavigating) {
      setProgress(100)
      const timer = setTimeout(() => {
        setIsNavigating(false)
        setProgress(0)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [pathname, searchParams, isNavigating])

  // Periodic increment while navigating
  useEffect(() => {
    if (!isNavigating) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + 15
      })
    }, 150)

    return () => clearInterval(interval)
  }, [isNavigating])

  if (!isNavigating && progress === 0) return null

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-1 z-50 pointer-events-none">
      <div
        className="h-full transition-all duration-200 ease-out shadow-xs"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          backgroundColor: 'var(--club-primary, #059669)',
        }}
      />
    </div>
  )
}

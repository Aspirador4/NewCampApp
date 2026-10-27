import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`bg-white dark:bg-neutral-900 rounded-3xl p-7 sm:p-8 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile text-center flex flex-col items-center justify-center ${className}`}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm transition-transform"
        style={{
          backgroundColor: 'var(--club-primary-light, #ecfdf5)',
          color: 'var(--club-primary, #059669)',
        }}
      >
        <Icon className="w-7 h-7 stroke-[2]" />
      </div>

      <h3 className="font-display font-bold text-xl uppercase text-neutral-950 dark:text-white tracking-tight">
        {title}
      </h3>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs leading-relaxed font-sans">
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 w-full max-w-xs">
          {action && (
            action.href ? (
              <Link
                href={action.href}
                className="btn-tactile w-full sm:w-auto flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm transition flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: 'var(--club-primary, #059669)',
                  color: 'var(--club-primary-text, #ffffff)',
                }}
              >
                {action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="btn-tactile w-full sm:w-auto flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm transition flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: 'var(--club-primary, #059669)',
                  color: 'var(--club-primary-text, #ffffff)',
                }}
              >
                {action.label}
              </button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="w-full sm:w-auto min-h-[44px] px-3.5 py-2.5 rounded-xl font-semibold text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition active:scale-95 flex items-center justify-center"
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="w-full sm:w-auto min-h-[44px] px-3.5 py-2.5 rounded-xl font-semibold text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition active:scale-95 flex items-center justify-center"
              >
                {secondaryAction.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

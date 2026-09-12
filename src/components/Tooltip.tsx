import type { ReactNode } from 'react'

export function Tip({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <span className="group relative inline-border-b border-dotted border-[var(--color-muted)] cursor-help">
      <span className="border-b border-dotted border-[var(--color-muted)]">{children}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden w-64 rounded border border-[var(--color-line)] bg-[var(--color-panel)] p-2 text-xs leading-snug text-[var(--color-text)] shadow-lg group-hover:block group-focus-within:block"
      >
        {label}
      </span>
    </span>
  )
}

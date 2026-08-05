import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="animate-fade-in relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[var(--surface)] shadow-2xl sm:max-w-md sm:rounded-3xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-muted"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        )}
        <div className="scrollbar-hide overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

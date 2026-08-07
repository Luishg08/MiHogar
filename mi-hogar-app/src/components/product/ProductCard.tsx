import { AlertTriangle, CalendarClock, Minus, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/app'
import { isBefore, startOfDay } from 'date-fns'
import type { Product } from '@/types'

export function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate()
  const adjustQuantity = useAppStore((s) => s.adjustQuantity)
  const online = useAppStore((s) => s.online)

  const lowStock = product.min_quantity > 0 && product.quantity <= product.min_quantity
  const expiring =
    product.expiry_date &&
    isBefore(new Date(product.expiry_date), new Date(startOfDay(new Date()).getTime() + 7 * 86400000))

  return (
    <div
      className="card animate-fade-in flex items-center gap-3 p-3"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl ${
          lowStock ? 'bg-[var(--accent-soft)]' : 'bg-[var(--surface-2)]'
        }`}
      >
        {product.photo_url ? (
          <img src={product.photo_url} alt={product.name} className="h-full w-full rounded-2xl object-cover" />
        ) : (
          product.emoji || '🛒'
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-bold">{product.name}</p>
          {lowStock && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
          {expiring && <CalendarClock className="h-4 w-4 shrink-0 text-red-500" />}
        </div>
        <p className="text-xs text-muted">
          {product.quantity} {product.unit}
          {product.min_quantity > 0 && ` · mín. ${product.min_quantity}`}
        </p>
        {product.categories && product.categories.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {product.categories.slice(0, 2).map((c) => (
              <span key={c.id} className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }}>
                {c.emoji} {c.name}
              </span>
            ))}
            {product.categories.length > 2 && (
              <span className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-muted">
                +{product.categories.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          className="btn-primary h-8 w-8"
          disabled={!online}
          onClick={(e) => {
            e.stopPropagation()
            void adjustQuantity(product.id, 1)
          }}
          aria-label="Aumentar"
        >
          <Plus className="h-4 w-4" />
        </button>
        <span className="text-xs font-extrabold text-[var(--primary)]">{product.quantity}</span>
        <button
          className="btn-ghost h-8 w-8"
          disabled={!online || product.quantity === 0}
          onClick={(e) => {
            e.stopPropagation()
            void adjustQuantity(product.id, -1)
          }}
          aria-label="Disminuir"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

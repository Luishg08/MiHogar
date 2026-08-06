import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, Package, Plus, Search, ShoppingCart } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductFormModal } from '@/components/product/ProductFormModal'
import { isBefore, startOfDay } from 'date-fns'

export function InventoryPage() {
  const products = useAppStore((s) => s.products)
  const categories = useAppStore((s) => s.categories)
  const online = useAppStore((s) => s.online)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'low' | 'expiring'>('all')
  const [formOpen, setFormOpen] = useState(false)

  const filtered = useMemo(() => {
    let list = products
    if (activeCategory) {
      list = list.filter((p) => (p.categories ?? []).some((c) => c.id === activeCategory))
    }
    if (filter === 'low') {
      list = list.filter((p) => p.min_quantity > 0 && p.quantity <= p.min_quantity)
    }
    if (filter === 'expiring') {
      const soon = new Date(startOfDay(new Date()).getTime() + 7 * 86400000)
      list = list.filter((p) => p.expiry_date && isBefore(new Date(p.expiry_date), soon))
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.notes ?? '').toLowerCase().includes(q))
    }
    return list
  }, [products, query, activeCategory, filter])

  const lowCount = useMemo(
    () => products.filter((p) => p.min_quantity > 0 && p.quantity <= p.min_quantity).length,
    [products]
  )
  const expiringCount = useMemo(
    () =>
      products.filter(
        (p) => p.expiry_date && isBefore(new Date(p.expiry_date), new Date(startOfDay(new Date()).getTime() + 7 * 86400000))
      ).length,
    [products]
  )

  return (
    <div className="animate-fade-in space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon={<Package className="h-4 w-4" />}
          label="Productos"
          value={products.length}
          color="var(--primary)"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Por reponer"
          value={lowCount}
          color="var(--accent)"
        />
        <StatCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="Por vencer"
          value={expiringCount}
          color="#dc2626"
        />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          className="input pl-11"
          placeholder="Buscar en el inventario..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <FilterChip label="Todo" active={filter === 'all' && !activeCategory} onClick={() => { setFilter('all'); setActiveCategory(null) }} />
        <FilterChip label="⚠ Por reponer" active={filter === 'low'} onClick={() => { setFilter(filter === 'low' ? 'all' : 'low'); setActiveCategory(null) }} />
        <FilterChip label="📅 Por vencer" active={filter === 'expiring'} onClick={() => { setFilter(filter === 'expiring' ? 'all' : 'expiring'); setActiveCategory(null) }} />
        {categories.map((c) => (
          <FilterChip
            key={c.id}
            label={`${c.emoji} ${c.name}`}
            active={activeCategory === c.id}
            onClick={() => {
              setActiveCategory(activeCategory === c.id ? null : c.id)
              setFilter('all')
            }}
          />
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <EmptyInventory />
        ) : (
          filtered.map((p) => <ProductCard key={p.id} product={p} />)
        )}
      </div>

      <button
        onClick={() => setFormOpen(true)}
        disabled={!online}
        className="btn-primary mt-3 flex w-full items-center justify-center gap-2 py-3.5 text-sm"
      >
        <Plus className="h-5 w-5" /> Agregar producto
      </button>

      <ProductFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="card flex flex-col gap-1 p-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: color, color: '#fff' }}>
        {icon}
      </span>
      <span className="text-2xl font-extrabold leading-none">{value}</span>
      <span className="text-[10px] font-semibold text-muted">{label}</span>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`chip shrink-0 whitespace-nowrap px-3.5 py-2 ${active ? 'chip-active' : ''}`}
    >
      {label}
    </button>
  )
}

function EmptyInventory() {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-soft text-3xl">🏠</div>
      <div>
        <p className="font-bold">Aún no hay productos</p>
        <p className="mt-1 text-sm text-muted">
          Agrega tu primer producto o escanea una factura del mercado con el asistente IA.
        </p>
      </div>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)]">
        <ShoppingCart className="h-4 w-4" /> Usa el botón +
      </span>
    </div>
  )
}

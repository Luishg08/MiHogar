import { useMemo, useState } from 'react'
import {
  Check,
  CheckCheck,
  PackagePlus,
  Plus,
  ShoppingBasket,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app'
import { Modal } from '@/components/Modal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function ShoppingPage() {
  const shoppingItems = useAppStore((s) => s.shoppingItems)
  const products = useAppStore((s) => s.products)
  const members = useAppStore((s) => s.members)
  const online = useAppStore((s) => s.online)
  const addShoppingItem = useAppStore((s) => s.addShoppingItem)
  const deleteShoppingItem = useAppStore((s) => s.deleteShoppingItem)
  const toggleChecked = useAppStore((s) => s.toggleChecked)
  const addToShoppingFromProducts = useAppStore((s) => s.addToShoppingFromProducts)

  const [newName, setNewName] = useState('')
  const [newQuantity, setNewQuantity] = useState(1)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  const pending = useMemo(() => shoppingItems.filter((i) => !i.checked), [shoppingItems])
  const done = useMemo(() => shoppingItems.filter((i) => i.checked), [shoppingItems])
  const progress = shoppingItems.length ? Math.round((done.length / shoppingItems.length) * 100) : 0

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await addShoppingItem({ name: newName.trim(), quantity: newQuantity })
      setNewName('')
      setNewQuantity(1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  const addFromInventory = async () => {
    if (!selectedProductIds.length) return
    await addToShoppingFromProducts(selectedProductIds)
    toast.success('Productos agregados a la lista')
    setSelectedProductIds([])
    setPickerOpen(false)
  }

  const nameFor = (id: string) => members.find((m) => m.user_id === id)?.profile?.full_name ?? 'alguien'

  return (
    <div className="animate-fade-in space-y-4">
      <div className="card flex items-center gap-4 p-4">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
            <circle cx="18" cy="18" r="16" fill="none" stroke="var(--surface-2)" strokeWidth="4" />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="4"
              strokeDasharray={`${(progress / 100) * 100.5} 100.5`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[10px] font-extrabold text-[var(--primary)]">{progress}%</span>
        </div>
        <div>
          <h2 className="font-bold">Lista de mercado</h2>
          <p className="text-xs text-muted">
            {pending.length} por comprar · {done.length} comprados
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-muted">
            Marca ✓ y el inventario se actualiza solo
          </p>
        </div>
      </div>

      <form onSubmit={addItem} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Agregar artículo (ej. arroz)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={!online}
        />
        <input
          type="number"
          className="input w-16 text-center font-bold"
          value={newQuantity}
          onChange={(e) => setNewQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          inputMode="numeric"
          aria-label="Cantidad"
        />
        <button type="submit" className="btn-primary h-[52px] w-[52px] shrink-0" disabled={!online || !newName.trim()}>
          <Plus className="h-5 w-5" />
        </button>
      </form>

      <button
        onClick={() => setPickerOpen(true)}
        disabled={!online}
        className="btn-ghost w-full py-3 text-sm"
      >
        <PackagePlus className="h-4 w-4" /> Agregar desde el inventario
      </button>

      <div className="space-y-2">
        {pending.length === 0 && (
          <div className="card flex flex-col items-center gap-2 py-10 text-center">
            <ShoppingBasket className="h-8 w-8 text-muted" />
            <p className="text-sm font-bold">¡Lista vacía!</p>
            <p className="text-xs text-muted">Agrega lo que falta en la casa.</p>
          </div>
        )}
        {pending.map((item) => {
          const product = products.find((p) => p.id === item.product_id)
          return (
            <div key={item.id} className="card animate-fade-in flex items-center gap-3 p-3">
              <button
                onClick={() => void toggleChecked(item.id, true)}
                disabled={!online}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--border)] text-transparent transition-all active:scale-95 hover:border-[var(--primary)]"
                aria-label="Marcar comprado"
              >
                <Check className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {product?.emoji ?? '🛒'} {item.name}
                </p>
                <p className="text-xs text-muted">
                  {item.quantity} {item.unit}
                  {item.note && ` · ${item.note}`}
                </p>
              </div>
              <button
                onClick={() => void toggleChecked(item.id, true)}
                disabled={!online}
                className="btn-accent px-3 py-1.5 text-xs"
              >
                Comprar
              </button>
              <button
                onClick={() => void deleteShoppingItem(item.id)}
                disabled={!online}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>

      {done.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              <CheckCheck className="h-4 w-4" /> Comprados
            </p>
            <button
              className="text-xs font-semibold text-muted"
              disabled={!online}
              onClick={() => {
                if (confirm('¿Limpiar los comprados de la lista?')) {
                  void Promise.all(done.map((i) => deleteShoppingItem(i.id)))
                }
              }}
            >
              Limpiar
            </button>
          </div>
          <div className="space-y-1.5">
            {done.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-2xl bg-[var(--surface-2)] px-3 py-2 opacity-70">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                <p className="flex-1 truncate text-sm text-muted line-through">{item.name}</p>
                <span className="text-[10px] text-muted">
                  {item.purchased_at
                    ? `${nameFor(item.checked_by ?? '')} · ${format(new Date(item.purchased_at), 'HH:mm', { locale: es })}`
                    : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Agregar del inventario">
        <div className="space-y-1">
          {products.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-[var(--surface-2)]"
            >
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--primary)]"
                checked={selectedProductIds.includes(p.id)}
                onChange={() =>
                  setSelectedProductIds((prev) =>
                    prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                  )
                }
              />
              <span className="text-lg">{p.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-[10px] text-muted">
                  {p.quantity} {p.unit} en casa
                </p>
              </div>
            </label>
          ))}
        </div>
        {products.length === 0 && <p className="py-6 text-center text-sm text-muted">Inventario vacío</p>}
        <button
          className="btn-primary mt-4 w-full py-3"
          disabled={!selectedProductIds.length}
          onClick={() => void addFromInventory()}
        >
          <Plus className="h-4 w-4" /> Agregar {selectedProductIds.length || ''} producto{selectedProductIds.length === 1 ? '' : 's'}
        </button>
      </Modal>
    </div>
  )
}

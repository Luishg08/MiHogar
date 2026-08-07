import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Pencil, Plus, ShoppingCart, Trash2, User } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app'
import { ProductFormModal } from '@/components/product/ProductFormModal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { differenceInDays } from 'date-fns'

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const products = useAppStore((s) => s.products)
  const members = useAppStore((s) => s.members)
  const online = useAppStore((s) => s.online)
  const adjustQuantity = useAppStore((s) => s.adjustQuantity)
  const deleteProduct = useAppStore((s) => s.deleteProduct)
  const addToShoppingFromProducts = useAppStore((s) => s.addToShoppingFromProducts)

  const [editOpen, setEditOpen] = useState(false)
  const product = products.find((p) => p.id === id)

  if (!product) {
    return (
      <div className="card flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-bold">Producto no encontrado</p>
        <button className="btn-ghost px-4 py-2" onClick={() => navigate('/')}>
          Volver al inventario
        </button>
      </div>
    )
  }

  const creator = members.find((m) => m.user_id === product.created_by)?.profile
  const editor = members.find((m) => m.user_id === product.updated_by)?.profile

  const expiryDays = product.expiry_date
    ? differenceInDays(new Date(product.expiry_date), new Date())
    : null

  return (
    <div className="animate-fade-in space-y-4">
      <button
        onClick={() => navigate('/')}
        className="btn-ghost h-10 w-10"
        aria-label="Volver"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="card overflow-hidden">
        <div className="flex flex-col items-center gap-3 p-6 pb-4">
          <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-[var(--surface-2)] text-7xl">
            {product.photo_url ? (
              <img src={product.photo_url} alt={product.name} className="h-full w-full rounded-3xl object-cover" />
            ) : (
              product.emoji
            )}
          </div>
          <h1 className="text-center text-xl font-extrabold">{product.name}</h1>
          {product.categories && product.categories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {product.categories.map((c) => (
                <span key={c.id} className="chip">{c.emoji} {c.name}</span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 border-t border-[var(--border)] text-center">
          <div className="border-r border-[var(--border)] p-3">
            <p className="text-2xl font-extrabold text-[var(--primary)]">{product.quantity}</p>
            <p className="text-[10px] font-semibold text-muted">{product.unit}</p>
          </div>
          <div className="border-r border-[var(--border)] p-3">
            <p className="text-2xl font-extrabold">{product.min_quantity}</p>
            <p className="text-[10px] font-semibold text-muted">Stock mín.</p>
          </div>
          <div className="p-3">
            {product.expiry_date ? (
              <>
                <p className={`text-xl font-extrabold ${expiryDays !== null && expiryDays < 7 ? 'text-red-500' : ''}`}>
                  {format(new Date(product.expiry_date), 'dd MMM', { locale: es })}
                </p>
                <p className="text-[10px] font-semibold text-muted">Vence</p>
              </>
            ) : (
              <>
                <p className="text-xl font-extrabold text-muted">—</p>
                <p className="text-[10px] font-semibold text-muted">Sin venc.</p>
              </>
            )}
          </div>
        </div>

        {product.expiry_date && expiryDays !== null && expiryDays < 7 && (
          <div className="mx-4 mb-4 flex items-center gap-2 rounded-2xl bg-red-500/10 px-3 py-2.5 text-sm font-semibold text-red-500">
            <CalendarClock className="h-4 w-4" />
            {expiryDays < 0
              ? `Vencieron hace ${Math.abs(expiryDays)} día${Math.abs(expiryDays) === 1 ? '' : 's'}`
              : `Vence en ${expiryDays} día${expiryDays === 1 ? '' : 's'} — ¡consume pronto!`}
          </div>
        )}

        {product.notes && (
          <div className="border-t border-[var(--border)] p-4">
            <p className="text-xs font-bold text-muted">NOTAS</p>
            <p className="mt-1 text-sm">{product.notes}</p>
          </div>
        )}

        <div className="border-t border-[var(--border)] p-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5" />
            <span>
              Agregado por <strong>{creator?.full_name ?? 'desconocido'}</strong>
              {product.created_at && ` · ${format(new Date(product.created_at), "dd 'de' MMM, HH:mm", { locale: es })}`}
            </span>
          </div>
          {editor && (
            <div className="mt-1 flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5" />
              <span>
                Última actualización de <strong>{editor.full_name}</strong>
                {product.updated_at && ` · ${format(new Date(product.updated_at), "dd 'de' MMM, HH:mm", { locale: es })}`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button className="btn-primary py-3" disabled={!online} onClick={() => void adjustQuantity(product.id, 1)}>
          +1
        </button>
        <button className="btn-ghost py-3" disabled={!online || product.quantity === 0} onClick={() => void adjustQuantity(product.id, -1)}>
          −1
        </button>
        <button
          className="btn-accent py-3"
          disabled={!online}
          onClick={() => {
            void addToShoppingFromProducts([product.id]).then(() =>
              toast.success(`${product.name} agregado a la lista`)
            )
          }}
        >
          <ShoppingCart className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <button className="btn-ghost flex-1 py-3" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Editar
        </button>
        <button
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500/10 py-3 font-semibold text-red-500 transition-all active:scale-[0.98]"
          disabled={!online}
          onClick={() => {
            if (confirm(`¿Eliminar "${product.name}" del inventario?`)) {
              void deleteProduct(product.id).then(() => {
                toast.success('Producto eliminado')
                navigate('/')
              })
            }
          }}
        >
          <Trash2 className="h-4 w-4" /> Eliminar
        </button>
      </div>

      <button
        className="btn-ghost w-full py-3"
        onClick={() => navigate('/shopping')}
      >
        <Plus className="h-4 w-4" /> Ver lista de mercado
      </button>

      <ProductFormModal open={editOpen} onClose={() => setEditOpen(false)} product={product} />
    </div>
  )
}

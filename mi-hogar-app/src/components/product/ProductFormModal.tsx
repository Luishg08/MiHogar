import { useEffect, useRef, useState } from 'react'
import { Camera, Minus, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/app'
import { Modal } from '@/components/Modal'
import { EmojiPicker } from '@/components/product/EmojiPicker'
import type { Product } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  product?: Product | null
}

export function ProductFormModal({ open, onClose, product }: Props) {
  const addProduct = useAppStore((s) => s.addProduct)
  const updateProduct = useAppStore((s) => s.updateProduct)
  const categories = useAppStore((s) => s.categories)
  const units = useAppStore((s) => s.units)
  const home = useAppStore((s) => s.home)
  const online = useAppStore((s) => s.online)

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [minQuantity, setMinQuantity] = useState(0)
  const [unit, setUnit] = useState('Unidad')
  const [emoji, setEmoji] = useState('🛒')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [expiry, setExpiry] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(product?.name ?? '')
      setQuantity(product?.quantity ?? 1)
      setMinQuantity(product?.min_quantity ?? 0)
      setUnit(product?.unit ?? 'Unidad')
      setEmoji(product?.emoji ?? '🛒')
      setPhotoUrl(product?.photo_url ?? null)
      setExpiry(product?.expiry_date ?? '')
      setNotes(product?.notes ?? '')
      setSelectedCategories((product?.categories ?? []).map((c) => c.id))
    }
  }, [open, product])

  const handleUpload = async (file: File) => {
    if (!home) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${home.id}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('product-photos').upload(path, file, {
        cacheControl: '3600'
      })
      if (error) throw error
      const { data } = supabase.storage.from('product-photos').getPublicUrl(path)
      setPhotoUrl(data.publicUrl)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo subir la foto')
    } finally {
      setUploading(false)
    }
  }

  const toggleCategory = (id: string) =>
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        quantity,
        min_quantity: minQuantity,
        unit,
        emoji,
        photo_url: photoUrl,
        expiry_date: expiry || null,
        notes: notes.trim() || null
      }
      if (product) {
        await updateProduct(product.id, payload)
        if (selectedCategories.length) {
          await supabase.from('product_categories').delete().eq('product_id', product.id)
          await supabase.from('product_categories').insert(
            selectedCategories.map((cid) => ({ product_id: product.id, category_id: cid }))
          )
        }
        toast.success('Producto actualizado')
      } else {
        const created = await addProduct(payload)
        if (selectedCategories.length) {
          await supabase.from('product_categories').insert(
            selectedCategories.map((cid) => ({ product_id: created.id, category_id: cid }))
          )
        }
        toast.success('Producto agregado')
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Editar producto' : 'Nuevo producto'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-2">
            <EmojiPicker value={emoji} onChange={setEmoji} />
            <span className="text-[10px] text-muted">ícono</span>
          </div>
          <div className="flex-1 space-y-3">
            <input
              className="input"
              placeholder="Nombre del producto (ej. Leche)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(0, q - 1))}
                className="btn-ghost h-11 w-11 shrink-0"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                className="input text-center text-lg font-bold"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="btn-primary h-11 w-11 shrink-0"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Unidad</label>
          <select className="input appearance-none" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {(units.length ? units : [{ name: 'Unidad' } as never]).map((u: { name: string }) => (
              <option key={u.name} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">
              Alerta stock mínimo
            </label>
            <input
              type="number"
              className="input"
              value={minQuantity}
              onChange={(e) => setMinQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">
              Vencimiento (opcional)
            </label>
            <input
              type="date"
              className="input"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Foto (opcional)</label>
          <div className="flex items-center gap-3">
            {photoUrl ? (
              <div className="relative">
                <img src={photoUrl} alt="producto" className="h-16 w-16 rounded-2xl object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!online}
                className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-2xl border border-dashed border-[var(--border)] text-muted"
              >
                <Camera className="h-5 w-5" />
                <span className="text-[9px] font-semibold">{uploading ? 'Subiendo' : 'Foto'}</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleUpload(file)
              }}
            />
            <p className="text-xs text-muted">
              Toma una foto del producto o la etiqueta para identificarlo mejor.
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">
            Categorías ({selectedCategories.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                className={`chip ${selectedCategories.includes(c.id) ? 'chip-active' : ''}`}
              >
                {c.emoji} {c.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Notas</label>
          <textarea
            className="input min-h-20 resize-none"
            placeholder="Detalles, marca, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button className="btn-primary w-full py-3.5" disabled={loading || !name.trim() || !online}>
          {loading ? 'Guardando...' : product ? 'Guardar cambios' : 'Agregar producto'}
        </button>
      </form>
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { ImageCropModal } from '@/components/ImageCropModal'
import { supabase, FUNCTIONS_URL } from '@/lib/supabase'

interface SearchImage {
  url: string
  thumb: string
  source: string
}

interface Props {
  open: boolean
  onClose: () => void
  initialQuery: string
  onPick: (blob: Blob) => void
}

export function ImageSearchModal({ open, onClose, initialQuery, onPick }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchImage[]>([])
  const [loading, setLoading] = useState(false)
  const [busyUrl, setBusyUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  const runSearch = async (term: string) => {
    const q = term.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke<{ images: SearchImage[] }>(
        'product-images',
        { body: { query: q } }
      )
      if (fnError) {
        throw new Error(
          fnError.context && typeof fnError.context === 'object' && 'message' in fnError.context
            ? String((fnError.context as { message: string }).message)
            : fnError.message
        )
      }
      setResults(Array.isArray(data?.images) ? data.images : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      setQuery(initialQuery)
      setResults([])
      setError(null)
      setSearched(false)
      setCropSrc(null)
      if (initialQuery.trim()) void runSearch(initialQuery)
    }
  }, [open])

  const pick = async (img: SearchImage) => {
    setBusyUrl(img.url)
    setError(null)
    try {
      const { data: session } = await supabase.auth.getSession()
      const headers = new Headers()
      if (session?.session?.access_token) {
        headers.set('Authorization', `Bearer ${session.session.access_token}`)
      }
      const res = await fetch(
        `${FUNCTIONS_URL}/product-images/proxy?url=${encodeURIComponent(img.url)}`,
        { headers }
      )
      if (!res.ok) throw new Error('No se pudo descargar la imagen')
      const blob = await res.blob()
      setCropSrc(URL.createObjectURL(blob))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la imagen')
    } finally {
      setBusyUrl(null)
    }
  }

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Buscar imagen">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void runSearch(query)
          }}
          className="mb-3 flex gap-2"
        >
          <input
            className="input flex-1"
            placeholder="Buscar imagen del producto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            className="btn-primary shrink-0 !px-3"
            disabled={loading || !query.trim()}
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>

        {loading && (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
          </p>
        )}

        {error && !loading && (
          <p className="py-6 text-center text-sm text-red-500">{error}</p>
        )}

        {!loading && !error && searched && results.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">Sin resultados para «{query}»</p>
        )}

        {!loading && results.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {results.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => void pick(img)}
                  disabled={busyUrl === img.url}
                  className={`relative aspect-square overflow-hidden rounded-2xl border border-[var(--border)] transition-all active:scale-[0.97] ${
                    busyUrl === img.url ? 'opacity-60' : ''
                  }`}
                >
                  <img src={img.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-muted">
              Toca una imagen para recortarla y usarla como foto del producto.
            </p>
          </>
        )}
      </Modal>

      <ImageCropModal
        open={!!cropSrc}
        src={cropSrc}
        shape="square"
        title="Ajustar foto del producto"
        onCancel={closeCrop}
        onConfirm={(blob) => {
          closeCrop()
          onPick(blob)
          onClose()
        }}
      />
    </>
  )
}

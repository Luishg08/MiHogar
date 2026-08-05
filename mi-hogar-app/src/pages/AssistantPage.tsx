import { useMemo, useRef, useState } from 'react'
import {
  Bot,
  Camera,
  ChefHat,
  FileText,
  Loader2,
  Plus,
  ScanLine,
  Send,
  Sparkles,
  Utensils,
  Wand2
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app'
import { askChef, scanReceipt, suggestMeals } from '@/lib/gemini'
import type { MealSuggestion, ReceiptItem } from '@/types'

type Tab = 'meals' | 'scan' | 'chef'

export function AssistantPage() {
  const [tab, setTab] = useState<Tab>('meals')

  return (
    <div className="animate-fade-in space-y-4">
      <div className="card flex items-center gap-3 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]">
          <Bot className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="font-extrabold">Asistente del Hogar</h2>
          <p className="text-xs text-muted">IA con Gemini · usa tu inventario real</p>
        </div>
      </div>

      <div className="grid grid-cols-3 rounded-2xl bg-[var(--surface-2)] p-1">
        <TabButton active={tab === 'meals'} onClick={() => setTab('meals')} icon={<Utensils className="h-4 w-4" />} label="Comidas" />
        <TabButton active={tab === 'scan'} onClick={() => setTab('scan')} icon={<ScanLine className="h-4 w-4" />} label="Factura" />
        <TabButton active={tab === 'chef'} onClick={() => setTab('chef')} icon={<ChefHat className="h-4 w-4" />} label="Chef" />
      </div>

      {tab === 'meals' && <MealSuggestions />}
      {tab === 'scan' && <ReceiptScanner />}
      {tab === 'chef' && <ChefChat />}
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-colors ${
        active ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm' : 'text-muted'
      }`}
    >
      {icon} {label}
    </button>
  )
}

function MealSuggestions() {
  const products = useAppStore((s) => s.products)
  const online = useAppStore((s) => s.online)
  const [type, setType] = useState<'desayuno' | 'almuerzo' | 'cena' | 'snack' | 'todos'>('todos')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<MealSuggestion[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const inventory = useMemo(
    () =>
      products.map((p) => ({ name: p.name, quantity: p.quantity, unit: p.unit })).slice(0, 60),
    [products]
  )

  const generate = async () => {
    if (!inventory.length) {
      toast.error('Tu inventario está vacío. Agrega productos primero.')
      return
    }
    setLoading(true)
    setResults([])
    abortRef.current = new AbortController()
    try {
      const res = await suggestMeals({ products: inventory, type, count: 4 }, { signal: abortRef.current.signal })
      setResults(res.suggestions ?? [])
      if (!res.suggestions?.length) toast.info('La IA no encontró combinaciones. Prueba otra vez.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de la IA')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {(['todos', 'desayuno', 'almuerzo', 'cena', 'snack'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`chip shrink-0 px-3.5 py-2 capitalize ${type === t ? 'chip-active' : ''}`}
          >
            {t === 'todos' ? '🍽️ Todo' : t}
          </button>
        ))}
      </div>

      <button className="btn-primary w-full py-3.5" onClick={() => void generate()} disabled={loading || !online}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
        {loading ? 'Pensando en el menú...' : `Sugerir ${type === 'todos' ? 'comidas' : type + 's'}`}
      </button>

      <div className="space-y-3">
        {results.map((meal, i) => (
          <div key={`${meal.title}-${i}`} className="card animate-fade-in p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="flex-1 font-extrabold leading-snug">{meal.title}</h3>
              <span className="chip shrink-0 capitalize">{meal.type}</span>
            </div>
            {meal.timeMinutes > 0 && (
              <p className="mt-0.5 text-[11px] text-muted">⏱ ~{meal.timeMinutes} min</p>
            )}
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Ingredientes</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {meal.ingredients.map((ing) => (
                  <span
                    key={ing}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      meal.usesInventory?.includes(ing) ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'bg-[var(--surface-2)] text-muted'
                    }`}
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
            {meal.instructions && (
              <p className="mt-3 rounded-2xl bg-[var(--surface-2)] p-3 text-xs leading-relaxed">{meal.instructions}</p>
            )}
            {meal.usesInventory?.length > 0 && (
              <p className="mt-2 text-[10px] font-semibold text-green-600">
                ✓ Usa lo que ya tienes en casa
              </p>
            )}
          </div>
        ))}
      </div>

      {!loading && results.length === 0 && (
        <div className="card flex flex-col items-center gap-2 py-10 text-center">
          <Wand2 className="h-8 w-8 text-muted" />
          <p className="text-sm font-bold">Sugerencias con lo que tienes</p>
          <p className="px-6 text-xs text-muted">
            La IA analiza tu inventario actual y propone desayunos, almuerzos y cenas para aprovechar todo.
          </p>
        </div>
      )}
    </div>
  )
}

function ReceiptScanner() {
  const online = useAppStore((s) => s.online)
  const home = useAppStore((s) => s.home)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [adding, setAdding] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const supabaseBatch = useSupabaseBatch()

  const onFile = (f: File | undefined) => {
    if (!f) return
    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    const isImage = f.type.startsWith('image/')
    if (!isPdf && !isImage) {
      toast.error('Sube una foto o un PDF')
      return
    }
    setFile(f)
    setItems([])
    setSelected(new Set())
    if (isImage) setPreview(URL.createObjectURL(f))
    else setPreview(null)
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    abortRef.current = new AbortController()
    try {
      const res = await scanReceipt(file, { signal: abortRef.current.signal })
      setItems(res.items ?? [])
      setSelected(new Set((res.items ?? []).map((_, i) => i)))
      if (!res.items?.length) toast.info('No detecté productos claros en la factura.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo analizar la factura')
    } finally {
      setLoading(false)
    }
  }

  const addSelected = async () => {
    if (!home) return
    setAdding(true)
    try {
      const toAdd = items.filter((_, i) => selected.has(i)).map((it) => ({
        name: it.name,
        quantity: it.quantity,
        unit: it.unit
      }))
      if (!toAdd.length) return
      await supabaseBatch(toAdd)
      toast.success(`${toAdd.length} producto${toAdd.length === 1 ? '' : 's'} agregado${toAdd.length === 1 ? '' : 's'} al inventario`)
      setItems([])
      setFile(null)
      setPreview(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center"
        onClick={() => fileRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="factura" className="max-h-56 rounded-2xl object-contain" />
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-soft">
              {file ? <FileText className="h-7 w-7 text-[var(--primary)]" /> : <Camera className="h-7 w-7 text-[var(--primary)]" />}
            </div>
            <div>
              <p className="text-sm font-bold">{file ? file.name : 'Toma o sube tu factura'}</p>
              <p className="text-xs text-muted">Foto de la factura o PDF del mercado · IA detecta los productos</p>
            </div>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      {file && (
        <button className="btn-accent w-full py-3.5" onClick={() => void analyze()} disabled={loading || !online}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {loading ? 'Leyendo la factura...' : 'Analizar factura'}
        </button>
      )}

      {items.length > 0 && (
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold">Productos detectados</p>
            <button
              className="text-xs font-semibold text-[var(--primary)]"
              onClick={() =>
                setSelected(
                  selected.size === items.length
                    ? new Set()
                    : new Set(items.map((_, i) => i))
                )
              }
            >
              {selected.size === items.length ? 'Quitar todos' : 'Seleccionar todos'}
            </button>
          </div>
          <div className="space-y-1">
            {items.map((it, i) => (
              <label key={i} className="flex cursor-pointer items-center gap-3 rounded-2xl p-2 hover:bg-[var(--surface-2)]">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--primary)]"
                  checked={selected.has(i)}
                  onChange={() =>
                    setSelected((prev) => {
                      const next = new Set(prev)
                      if (next.has(i)) next.delete(i)
                      else next.add(i)
                      return next
                    })
                  }
                />
                <span className="text-sm font-semibold capitalize">{it.name.toLowerCase()}</span>
                <span className="ml-auto text-xs text-muted">
                  {it.quantity} {it.unit}
                </span>
              </label>
            ))}
          </div>
          <button className="btn-primary mt-3 w-full py-3" disabled={!selected.size || adding} onClick={() => void addSelected()}>
            {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            Agregar {selected.size} al inventario
          </button>
        </div>
      )}
    </div>
  )
}

function ChefChat() {
  const products = useAppStore((s) => s.products)
  const online = useAppStore((s) => s.online)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const inventory = useMemo(
    () => products.map((p) => ({ name: p.name, quantity: p.quantity, unit: p.unit })).slice(0, 60),
    [products]
  )

  const ask = async (q?: string) => {
    const query = (q ?? question).trim()
    if (!query) return
    setLoading(true)
    setQuestion('')
    setAnswer(null)
    abortRef.current = new AbortController()
    try {
      const res = await askChef(query, inventory, { signal: abortRef.current.signal })
      const answers = res.answers ?? []
      setAnswer(
        answers
          .map(
            (a) =>
              `### ${a.title}\n\n${a.recipe}\n\n${a.suggestions?.length ? '**Ideas extra:** ' + a.suggestions.join(' · ') : ''}`
          )
          .join('\n\n---\n\n')
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de la IA')
    } finally {
      setLoading(false)
    }
  }

  const suggestions = [
    '¿Qué hago con los huevos y la harina que tengo?',
    'Prepara una cena rápida con lo que hay en la nevera',
    'Tengo pollo y arroz, ¿qué almuerzos me sugieres?',
    '¿Cómo aprovechar los productos por vencer?'
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button key={s} onClick={() => void ask(s)} disabled={!online} className="chip text-left">
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void ask()
        }}
        className="flex gap-2"
      >
        <input
          className="input flex-1"
          placeholder="Pregunta qué cocinar con tus productos..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading || !online}
        />
        <button type="submit" className="btn-primary h-[52px] w-[52px] shrink-0" disabled={loading || !question.trim() || !online}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </form>

      {loading && (
        <div className="card flex items-center gap-3 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
          <p className="text-sm font-semibold text-muted">Consultando al chef con tu inventario...</p>
        </div>
      )}

      {answer && (
        <div className="card animate-fade-in whitespace-pre-wrap p-4 text-sm leading-relaxed [&_h3]:mb-1 [&_h3]:font-extrabold [&_h3]:text-[var(--primary)]">
          {answer}
        </div>
      )}

      {!loading && !answer && (
        <div className="card flex flex-col items-center gap-2 py-10 text-center">
          <ChefHat className="h-8 w-8 text-muted" />
          <p className="text-sm font-bold">Pregúntale al chef</p>
          <p className="px-6 text-xs text-muted">
            Responde con recetas usando únicamente los productos que tienes en casa.
          </p>
        </div>
      )}
    </div>
  )
}

function useSupabaseBatch() {
  const loadProducts = useAppStore((s) => s.loadProducts)
  return async (items: ReceiptItem[]) => {
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('batch_add_products', {
      p_items: items.map((it) => ({
        name: it.name,
        quantity: Math.max(1, it.quantity || 1),
        unit: it.unit || 'Unidad'
      }))
    })
    if (error) throw error
    await loadProducts()
  }
}

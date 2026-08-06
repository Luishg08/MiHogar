import { useMemo, useRef, useState } from 'react'
import {
  AudioLines,
  Bot,
  Camera,
  Check,
  FileText,
  Loader2,
  Mic,
  Plus,
  ScanLine,
  Send,
  Sparkles,
  Square,
  Utensils,
  Wand2
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app'
import { interpretConsumption, scanReceipt, suggestMeals } from '@/lib/gemini'
import type { ConsumeDeduction, MealSuggestion, ReceiptItem } from '@/types'

type Tab = 'meals' | 'scan' | 'voice'

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
        <TabButton active={tab === 'voice'} onClick={() => setTab('voice')} icon={<Mic className="h-4 w-4" />} label="Voz" />
      </div>

      {tab === 'meals' && <MealSuggestions />}
      {tab === 'scan' && <ReceiptScanner />}
      {tab === 'voice' && <VoiceNote />}
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

function VoiceNote() {
  const products = useAppStore((s) => s.products)
  const online = useAppStore((s) => s.online)
  const consumeItems = useAppStore((s) => s.consumeItems)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [text, setText] = useState('')
  const [interpreting, setInterpreting] = useState(false)
  const [result, setResult] = useState<{ summary: string; deductions: ConsumeDeduction[] } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const recRef = useRef<{ stop: () => void } | null>(null)
  const finalRef = useRef('')
  const abortRef = useRef<AbortController | null>(null)

  const speechSupported =
    typeof window !== 'undefined' &&
    !!((window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition)

  interface SpeechRecognitionEvent {
    resultIndex: number
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
  }

  interface SpeechRecognitionLike {
    lang: string
    interimResults: boolean
    continuous: boolean
    maxAlternatives: number
    onresult: ((e: SpeechRecognitionEvent) => void) | null
    onend: (() => void) | null
    onerror: (() => void) | null
    start: () => void
    stop: () => void
  }

  const startListening = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) {
      toast.error('Tu navegador no soporta voz. Escribe la nota abajo.')
      return
    }
    const rec = new Ctor()
    rec.lang = 'es-CO'
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalRef.current += r[0].transcript + ' '
        else interim += r[0].transcript
      }
      setTranscript((finalRef.current + interim).trim())
    }
    rec.onend = () => {
      setListening(false)
      if (!finalRef.current.trim()) toast.info('No capté nada. Inténtalo de nuevo.')
    }
    rec.onerror = () => {
      setListening(false)
      toast.error('No se pudo reconocer la voz')
    }
    finalRef.current = ''
    setTranscript('')
    setResult(null)
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  const stopListening = () => {
    recRef.current?.stop()
    setListening(false)
  }

  const interpret = async (raw?: string) => {
    const q = (raw ?? text ?? transcript).trim()
    if (!q) {
      toast.error('Escribe o dicta qué gastaste')
      return
    }
    if (!products.length) {
      toast.error('Tu inventario está vacío. Agrega productos primero.')
      return
    }
    setInterpreting(true)
    setResult(null)
    abortRef.current = new AbortController()
    try {
      const inventory = products
        .map((p) => ({ id: p.id, name: p.name, quantity: p.quantity, unit: p.unit }))
        .slice(0, 60)
      const res = await interpretConsumption({ text: q, inventory }, { signal: abortRef.current.signal })
      const valid = (res.deductions ?? []).filter((d) => products.some((p) => p.id === d.product_id))
      setResult({ summary: res.summary ?? '', deductions: valid })
      setSelected(new Set(valid.map((d) => d.product_id)))
      if (!valid.length) toast.info(res.summary || 'No pude identificar productos para descontar')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de la IA')
    } finally {
      setInterpreting(false)
    }
  }

  const apply = async () => {
    if (!result) return
    const items = result.deductions
      .filter((d) => selected.has(d.product_id))
      .map((d) => ({ product_id: d.product_id, quantity: d.quantity }))
    if (!items.length) {
      toast.error('Selecciona al menos un producto')
      return
    }
    setApplying(true)
    try {
      const applied = await consumeItems(items)
      toast.success(`Se descontaron ${applied.length} producto${applied.length === 1 ? '' : 's'} del inventario`)
      setResult(null)
      setTranscript('')
      setText('')
      finalRef.current = ''
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al aplicar')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-col items-center gap-4 p-6 text-center">
        <p className="text-sm font-bold">¿Qué gastaste hoy?</p>
        <p className="-mt-2 px-6 text-xs text-muted">
          Di por ejemplo: <em>"Gasté 2 litros de leche y media libra de arroz"</em>. La IA lo descuenta del
          inventario.
        </p>

        {speechSupported ? (
          <button
            onClick={listening ? stopListening : startListening}
            disabled={!online}
            className={`flex h-20 w-20 items-center justify-center rounded-full shadow-xl transition-all active:scale-95 disabled:opacity-50 ${
              listening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white'
            }`}
            aria-label={listening ? 'Detener grabación' : 'Grabar nota de voz'}
          >
            {listening ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </button>
        ) : null}

        {listening && (
          <div className="flex items-center gap-2 text-xs font-semibold text-red-500">
            <AudioLines className="h-4 w-4 animate-pulse" /> Escuchando... toca el botón para terminar
          </div>
        )}

        {transcript && (
          <div className="w-full rounded-2xl bg-[var(--surface-2)] p-3 text-sm italic leading-relaxed">
            “{transcript}”
          </div>
        )}

        <div className="w-full">
          <textarea
            className="input min-h-[64px] resize-none"
            placeholder={speechSupported ? 'O escribe la nota aquí...' : 'Describe qué gastaste (ej. "2 litros de leche y una bolsa de pan")...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={interpreting || !online}
          />
        </div>

        <button
          className="btn-primary w-full py-3.5"
          onClick={() => void interpret((text || transcript) || undefined)}
          disabled={interpreting || (!text.trim() && !transcript) || !online}
        >
          {interpreting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {interpreting ? 'Interpretando...' : 'Interpretar consumo'}
        </button>
      </div>

      {result && (
        <div className="card animate-fade-in p-4">
          {result.summary && <p className="mb-3 text-xs leading-relaxed text-muted">{result.summary}</p>}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold">Se descontará</p>
            <button
              className="text-xs font-semibold text-[var(--primary)]"
              onClick={() =>
                setSelected(
                  selected.size === result.deductions.length
                    ? new Set()
                    : new Set(result.deductions.map((d) => d.product_id))
                )
              }
            >
              {selected.size === result.deductions.length ? 'Quitar todos' : 'Seleccionar todos'}
            </button>
          </div>
          <div className="space-y-1">
            {result.deductions.map((d) => (
              <label key={d.product_id} className="flex cursor-pointer items-center gap-3 rounded-2xl p-2 hover:bg-[var(--surface-2)]">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--primary)]"
                  checked={selected.has(d.product_id)}
                  onChange={() =>
                    setSelected((prev) => {
                      const next = new Set(prev)
                      if (next.has(d.product_id)) next.delete(d.product_id)
                      else next.add(d.product_id)
                      return next
                    })
                  }
                />
                <span className="text-sm font-semibold capitalize">{d.name.toLowerCase()}</span>
                <span className="ml-auto text-xs text-muted">
                  −{d.quantity} {d.unit}
                </span>
              </label>
            ))}
          </div>
          {result.deductions.length === 0 && (
            <div className="flex items-center gap-2 py-4 text-center text-xs text-muted">
              <Wand2 className="h-5 w-5 shrink-0" /> No se encontraron coincidencias con tu inventario.
            </div>
          )}
          <button className="btn-primary mt-3 w-full py-3" disabled={!selected.size || applying || !online} onClick={() => void apply()}>
            {applying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            Aplicar al inventario
          </button>
        </div>
      )}

      {!result && !listening && (
        <div className="card flex flex-col items-center gap-2 py-8 text-center">
          <Send className="h-8 w-8 text-muted" />
          <p className="text-sm font-bold">Descuentos con tu voz</p>
          <p className="px-6 text-xs text-muted">
            La IA interpreta tu nota, te muestra qué va a descontar y tú confirmas antes de aplicar.
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

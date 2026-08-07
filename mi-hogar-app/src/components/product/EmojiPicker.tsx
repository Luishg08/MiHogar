import { useState } from 'react'
import { Search } from 'lucide-react'
import { Modal } from '@/components/Modal'

const EMOJIS: { emoji: string; k: string }[] = [
  { emoji: '🍎', k: 'manzana fruta' },
  { emoji: '🍌', k: 'banano platano banana fruta' },
  { emoji: '🍇', k: 'uva uvas fruta' },
  { emoji: '🍉', k: 'sandia patilla melon fruta' },
  { emoji: '🍊', k: 'naranja mandarina citrico fruta' },
  { emoji: '🥭', k: 'mango fruta' },
  { emoji: '🍍', k: 'pina piña fruta' },
  { emoji: '🍓', k: 'fresa fresas fruta' },
  { emoji: '🍒', k: 'cereza cerezas fruta' },
  { emoji: '🥝', k: 'kiwi fruta' },
  { emoji: '🍅', k: 'tomate fruta' },
  { emoji: '🥑', k: 'aguacate palta' },
  { emoji: '🥕', k: 'zanahoria verdura' },
  { emoji: '🌽', k: 'maiz mazorca choclo' },
  { emoji: '🥔', k: 'papa patata verdura' },
  { emoji: '🧅', k: 'cebolla' },
  { emoji: '🧄', k: 'ajo' },
  { emoji: '🍆', k: 'berenjena' },
  { emoji: '🥦', k: 'brocoli verdura' },
  { emoji: '🥬', k: 'lechuga verdura hoja repollo' },
  { emoji: '🥒', k: 'pepino verdura' },
  { emoji: '🌶️', k: 'chile pimiento picante aji' },
  { emoji: '🫑', k: 'pimenton pimiento' },
  { emoji: '🍄', k: 'champiñon champinon hongo seta' },
  { emoji: '🥜', k: 'mani cacahuate fruto seco' },
  { emoji: '🌰', k: 'castana nuez fruto seco' },
  { emoji: '🍞', k: 'pan panaderia' },
  { emoji: '🥐', k: 'croissant medialuna pan' },
  { emoji: '🥖', k: 'baguette pan barra' },
  { emoji: '🥯', k: 'bagel pan' },
  { emoji: '🧀', k: 'queso lacteo' },
  { emoji: '🥛', k: 'leche lacteo bebida' },
  { emoji: '🍳', k: 'huevo huevos desayuno' },
  { emoji: '🥓', k: 'tocino bacon cerdo' },
  { emoji: '🍗', k: 'pollo pierna muslo' },
  { emoji: '🍖', k: 'carne costilla' },
  { emoji: '🥩', k: 'carne bistec filete res' },
  { emoji: '🍤', k: 'camaron langostino marisco' },
  { emoji: '🍣', k: 'sushi pescado' },
  { emoji: '🍕', k: 'pizza' },
  { emoji: '🌭', k: 'perro salchicha hotdog' },
  { emoji: '🍔', k: 'hamburguesa' },
  { emoji: '🍟', k: 'papas patatas fritas' },
  { emoji: '🌮', k: 'taco' },
  { emoji: '🥙', k: 'wrap kebab shawarma' },
  { emoji: '🍝', k: 'pasta espagueti' },
  { emoji: '🍜', k: 'fideos ramen sopa' },
  { emoji: '🍲', k: 'sopa estofado guiso' },
  { emoji: '🥗', k: 'ensalada' },
  { emoji: '🍿', k: 'palomitas canguil' },
  { emoji: '🍱', k: 'almuerzo bento' },
  { emoji: '🍚', k: 'arroz' },
  { emoji: '🍛', k: 'curry arroz' },
  { emoji: '🥣', k: 'tazon cereal sopa' },
  { emoji: '🥞', k: 'panqueque hotcake pancake' },
  { emoji: '🧇', k: 'waffle' },
  { emoji: '🥨', k: 'pretzel' },
  { emoji: '🍩', k: 'dona rosquilla' },
  { emoji: '🍪', k: 'galleta' },
  { emoji: '🎂', k: 'torta pastel cumpleaños' },
  { emoji: '🍰', k: 'pastel torta' },
  { emoji: '🧁', k: 'cupcake ponque' },
  { emoji: '🍫', k: 'chocolate dulce' },
  { emoji: '🍬', k: 'dulce caramelo' },
  { emoji: '🍭', k: 'chupeta piruleta caramelo' },
  { emoji: '🍯', k: 'miel' },
  { emoji: '🥤', k: 'gaseosa jugo batido bebida' },
  { emoji: '🧃', k: 'jugo caja' },
  { emoji: '☕', k: 'cafe' },
  { emoji: '🍵', k: 'te té bebida' },
  { emoji: '🧋', k: 'te tapioca bubble' },
  { emoji: '🍷', k: 'vino' },
  { emoji: '🥂', k: 'brindis champan copa' },
  { emoji: '🍺', k: 'cerveza' },
  { emoji: '🧊', k: 'hielo' },
  { emoji: '💧', k: 'agua gota' },
  { emoji: '🧼', k: 'jabon aseo' },
  { emoji: '🧽', k: 'esponja aseo' },
  { emoji: '🧴', k: 'crema loción champu shampoo' },
  { emoji: '🧻', k: 'papel higienico' },
  { emoji: '🧹', k: 'escoba aseo' },
  { emoji: '🪣', k: 'balde cubo trapeador' },
  { emoji: '🧺', k: 'cesta canasta ropa' },
  { emoji: '🪥', k: 'cepillo dientes' },
  { emoji: '🪒', k: 'afeitadora rasuradora' },
  { emoji: '💄', k: 'labial maquillaje' },
  { emoji: '🧖', k: 'toalla spa' },
  { emoji: '🧤', k: 'guantes' },
  { emoji: '🛁', k: 'baño bano tina bañera' },
  { emoji: '🚽', k: 'inodoro sanitario baño' },
  { emoji: '🗑️', k: 'basura caneca' },
  { emoji: '✨', k: 'brillo' },
  { emoji: '🕯️', k: 'vela' },
  { emoji: '🔌', k: 'enchufe cable' },
  { emoji: '🔋', k: 'bateria pila' },
  { emoji: '💡', k: 'bombillo foco luz' },
  { emoji: '🐶', k: 'perro mascota' },
  { emoji: '🐱', k: 'gato mascota' },
  { emoji: '🐰', k: 'conejo mascota' },
  { emoji: '🐹', k: 'hamster mascota' },
  { emoji: '🐢', k: 'tortuga mascota' },
  { emoji: '🦜', k: 'loro mascota' },
  { emoji: '🐠', k: 'pez pez mascota acuario' },
  { emoji: '🐭', k: 'raton' },
  { emoji: '🦴', k: 'hueso' },
  { emoji: '🐟', k: 'pescado pez' },
  { emoji: '🥫', k: 'atun lata enlatado comida' },
  { emoji: '🐔', k: 'pollo gallina' },
  { emoji: '🐄', k: 'vaca res' },
  { emoji: '🐷', k: 'cerdo chancho' },
  { emoji: '🦆', k: 'pato' },
  { emoji: '🐑', k: 'oveja cordero' },
  { emoji: '🐐', k: 'cabra' },
  { emoji: '📦', k: 'paquete caja' },
  { emoji: '🎁', k: 'regalo' },
  { emoji: '💊', k: 'pastilla medicina' },
  { emoji: '🧪', k: 'laboratorio prueba test' },
  { emoji: '🩹', k: 'curita bandita' },
  { emoji: '📎', k: 'clip' },
  { emoji: '✂️', k: 'tijeras' },
  { emoji: '📌', k: 'chinche pin' },
  { emoji: '🖊️', k: 'lapicero boligrafo lapiz' },
  { emoji: '📚', k: 'libro libros' },
  { emoji: '🧵', k: 'hilo aguja' },
  { emoji: '🪀', k: 'yoyo juguete' },
  { emoji: '🎮', k: 'videojuego control' },
  { emoji: '⚽', k: 'futbol balon' },
  { emoji: '🏀', k: 'baloncesto basquet' },
  { emoji: '🎾', k: 'tenis raqueta' },
  { emoji: '🏸', k: 'badminton' },
  { emoji: '🚗', k: 'carro auto vehiculo' },
  { emoji: '🚲', k: 'bicicleta' },
  { emoji: '🔧', k: 'llave herramienta' },
  { emoji: '⛽', k: 'gasolina combustible' },
  { emoji: '🧰', k: 'herramientas' }
]

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function matches(emoji: string, keywords: string, query: string): boolean {
  if (!query) return true
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  const haystack = normalize(`${emoji} ${keywords}`)
  return terms.every((t) => haystack.includes(t))
}

export function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = query ? EMOJIS.filter((e) => matches(e.emoji, e.k, query)) : EMOJIS

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-4xl transition-transform active:scale-95"
      >
        {value || '😀'}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Elige un ícono">
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[var(--surface-2)] px-3 py-2">
          <Search className="h-4 w-4 text-muted" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Buscar por nombre (ej. leche)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Sin resultados para «{query}»</p>
        ) : (
          <div className="grid grid-cols-6 gap-1">
            {filtered.map(({ emoji }) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onChange(emoji)
                  setOpen(false)
                }}
                className={`flex aspect-square items-center justify-center rounded-xl text-3xl transition-colors ${
                  value === emoji ? 'bg-soft' : 'hover:bg-[var(--surface-2)]'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </Modal>
    </>
  )
}

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Modal } from '@/components/Modal'

const EMOJIS = [
  '🍎','🍌','🍇','🍉','🍊','🥭','🍍','🍓','🍒','🥝','🍅','🥑','🥕','🌽','🥔','🧅','🧄','🍆','🥦','🥬','🥒','🌶️','🫑','🍄','🥜','🌰',
  '🍞','🥐','🥖','🥯','🧀','🥛','🍳','🥓','🍗','🍖','🥩','🍤','🍣','🍕','🌭','🍔','🍟','🌮','🥙','🍝','🍜','🍲','🥗','🍿','🍱',
  '🍚','🍛','🥣','🥞','🧇','🥨','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','🍯','🥤','🧃','☕','🍵','🧋','🍷','🥂','🍺','🧊','💧',
  '🧼','🧽','🧴','🧻','🧹','🪣','🧺','🪥','🪒','💄','🧖','🧤','🛁','🚽','🗑️','✨','🕯️','🔌','🔋','💡',
  '🐶','🐱','🐰','🐹','🐢','🦜','🐠','🐭','🍖','🦴','🐟','🥫','🐔','🐄','🐷','🦆','🐑','🐐',
  '📦','🎁','💊','🧪','🩹','📎','✂️','📌','🖊️','📚','🧵','🪀','🎮','⚽','🏀','🎾','🏸','🚗','🚲','🔧','⛽','🧰'
]

export function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = query ? EMOJIS.filter((e) => e.includes(query)) : EMOJIS

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-3xl transition-transform active:scale-95"
      >
        {value || '😀'}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Elige un ícono">
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[var(--surface-2)] px-3 py-2">
          <Search className="h-4 w-4 text-muted" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Buscar emoji..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-6 gap-1">
          {filtered.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onChange(emoji)
                setOpen(false)
              }}
              className={`flex aspect-square items-center justify-center rounded-xl text-2xl transition-colors ${
                value === emoji ? 'bg-soft' : 'hover:bg-[var(--surface-2)]'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </Modal>
    </>
  )
}

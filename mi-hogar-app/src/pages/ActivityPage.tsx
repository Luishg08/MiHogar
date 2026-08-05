import { useMemo, useState } from 'react'
import { History, ShoppingCart, Trash2, PenLine, PlusCircle, ListPlus } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { Avatar } from '@/components/Avatar'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const actionMeta: Record<string, { icon: React.ReactNode; color: string }> = {
  creado: { icon: <PlusCircle className="h-4 w-4" />, color: '#16a34a' },
  actualizado: { icon: <PenLine className="h-4 w-4" />, color: '#2563eb' },
  eliminado: { icon: <Trash2 className="h-4 w-4" />, color: '#dc2626' },
  comprado: { icon: <ShoppingCart className="h-4 w-4" />, color: '#d97706' },
  'agregado a la lista': { icon: <ListPlus className="h-4 w-4" />, color: '#7c3aed' },
  'eliminado de la lista': { icon: <Trash2 className="h-4 w-4" />, color: '#9ca3af' }
}

export function ActivityPage() {
  const events = useAppStore((s) => s.events)
  const [filter, setFilter] = useState<string>('todo')

  const actions = useMemo(() => ['todo', ...new Set(events.map((e) => e.action))], [events])
  const filtered = useMemo(
    () => (filter === 'todo' ? events : events.filter((e) => e.action === filter)),
    [events, filter]
  )

  const nameOf = (e: (typeof events)[number]) => e.profile?.full_name ?? 'Alguien'
  const colorOf = (e: (typeof events)[number]) => e.profile?.profile_color ?? '#94a3b8'
  const avatarOf = (e: (typeof events)[number]) => e.profile?.avatar_url ?? null

  const detailOf = (e: (typeof events)[number]) => {
    const d = e.details as Record<string, unknown> | null
    return d?.name ? String(d.name) : ''
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="card flex items-center gap-3 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-soft">
          <History className="h-6 w-6 text-[var(--primary)]" />
        </div>
        <div>
          <h2 className="font-extrabold">Actividad del hogar</h2>
          <p className="text-xs text-muted">Quién hizo qué y cuándo</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {actions.map((a) => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`chip shrink-0 capitalize ${filter === a ? 'chip-active' : ''}`}
          >
            {a === 'todo' ? 'Todo' : a}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="card flex flex-col items-center gap-2 py-12 text-center">
            <History className="h-8 w-8 text-muted" />
            <p className="text-sm font-bold">Sin actividad aún</p>
            <p className="text-xs text-muted">Cada cambio en el inventario y la lista quedará registrado aquí.</p>
          </div>
        )}
        {filtered.map((e) => {
          const meta = actionMeta[e.action] ?? { icon: <History className="h-4 w-4" />, color: '#94a3b8' }
          return (
            <div key={e.id} className="card flex items-center gap-3 p-3">
              <Avatar name={nameOf(e)} url={avatarOf(e)} color={colorOf(e)} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">
                  <strong>{nameOf(e)}</strong>{' '}
                  <span className="text-muted">hizo:</span>{' '}
                  <span className="font-semibold capitalize" style={{ color: meta.color }}>
                    {e.action}
                  </span>{' '}
                  {detailOf(e) && <span className="font-semibold">· {detailOf(e)}</span>}
                </p>
                <p className="mt-0.5 text-[10px] text-muted" title={format(new Date(e.created_at), 'PPpp', { locale: es })}>
                  {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
              >
                {meta.icon}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

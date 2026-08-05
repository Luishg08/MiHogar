import { useState } from 'react'
import { HomeIcon, KeyRound, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app'

export function HomeSetup() {
  const createHome = useAppStore((s) => s.createHome)
  const joinHome = useAppStore((s) => s.joinHome)
  const profile = useAppStore((s) => s.profile)
  const [view, setView] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createHome(name)
      toast.success('¡Hogar creado!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el hogar')
    } finally {
      setLoading(false)
    }
  }

  const onJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await joinHome(code)
      toast.success('¡Ya eres parte del hogar!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Código inválido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg)] px-6">
      <div className="animate-fade-in w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary shadow-xl">
            <HomeIcon className="h-10 w-10 text-[var(--on-primary)]" />
          </div>
          <h1 className="text-2xl font-extrabold">Hola, {profile?.full_name || 'amigo'} 👋</h1>
          <p className="mt-1 text-sm text-muted">Primero configura tu hogar familiar</p>
        </div>

        <div className="card mb-4 p-1.5">
          <div className="grid grid-cols-2 rounded-2xl bg-[var(--surface-2)] p-1">
            <button
              onClick={() => setView('create')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-colors ${
                view === 'create' ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm' : 'text-muted'
              }`}
            >
              <HomeIcon className="h-4 w-4" /> Crear hogar
            </button>
            <button
              onClick={() => setView('join')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-colors ${
                view === 'join' ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm' : 'text-muted'
              }`}
            >
              <KeyRound className="h-4 w-4" /> Unirme
            </button>
          </div>
        </div>

        {view === 'create' ? (
          <form onSubmit={onCreate} className="space-y-3">
            <input
              className="input"
              placeholder="Nombre del hogar (ej. Casa Luis)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button className="btn-primary w-full py-3.5" disabled={loading || !name.trim()}>
              <HomeIcon className="h-5 w-5" /> Crear mi hogar
            </button>
          </form>
        ) : (
          <form onSubmit={onJoin} className="space-y-3">
            <input
              className="input text-center font-mono text-lg uppercase tracking-widest"
              placeholder="CÓDIGO"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              required
            />
            <p className="text-center text-xs text-muted">
              Pide el código de invitación a quien ya creó el hogar.
            </p>
            <button className="btn-ghost w-full py-3.5" disabled={loading || code.length < 6}>
              <UserPlus className="h-5 w-5" /> Unirme al hogar
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

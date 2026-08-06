import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Boxes,
  Bot,
  Check,
  ChevronDown,
  History,
  Home as HomeIcon,
  KeyRound,
  Plus,
  ShoppingCart,
  User
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app'
import { Avatar } from '@/components/Avatar'
import { Modal } from '@/components/Modal'

const tabs = [
  { to: '/', label: 'Inventario', icon: Boxes, end: true },
  { to: '/shopping', label: 'Lista', icon: ShoppingCart, end: false },
  { to: '/assistant', label: 'Asistente', icon: Bot, end: false },
  { to: '/activity', label: 'Actividad', icon: History, end: false },
  { to: '/profile', label: 'Perfil', icon: User, end: false }
]

export function AppShell() {
  const profile = useAppStore((s) => s.profile)
  const home = useAppStore((s) => s.home)
  const homes = useAppStore((s) => s.homes)
  const switchHome = useAppStore((s) => s.switchHome)
  const createHome = useAppStore((s) => s.createHome)
  const joinHome = useAppStore((s) => s.joinHome)
  const online = useAppStore((s) => s.online)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const hasBg = Boolean(profile?.background_url)

  const doSwitch = async (id: string) => {
    if (id === home?.id) {
      setSwitcherOpen(false)
      return
    }
    setBusy(true)
    try {
      await switchHome(id)
      toast.success('Hogar cambiado')
      setSwitcherOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar de hogar')
    } finally {
      setBusy(false)
    }
  }

  const doCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) return
    setBusy(true)
    try {
      await createHome(createName)
      toast.success('¡Hogar creado!')
      setCreateName('')
      setSwitcherOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el hogar')
    } finally {
      setBusy(false)
    }
  }

  const doJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (joinCode.length < 6) return
    setBusy(true)
    try {
      await joinHome(joinCode)
      toast.success('¡Ya eres parte del hogar!')
      setJoinCode('')
      setSwitcherOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Código inválido')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`mx-auto flex min-h-dvh w-full max-w-md flex-col ${
        hasBg ? 'bg-transparent' : 'bg-[var(--bg)]'
      }`}
    >
      <header
        className={`safe-top sticky top-0 z-30 flex items-center justify-between px-5 py-3 ${
          hasBg ? 'bg-[var(--bg)]/70 backdrop-blur-md' : ''
        }`}
      >
        <button
          onClick={() => setSwitcherOpen(true)}
          className="flex items-center gap-3 rounded-2xl text-left transition-transform active:scale-[0.98]"
          aria-label="Cambiar de hogar"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow">
            <Boxes className="h-5 w-5 text-[var(--on-primary)]" />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Mi Hogar</p>
            <h1 className="flex items-center gap-1 text-sm font-extrabold">
              {home?.name ?? 'Hogar'}
              <ChevronDown className="h-3.5 w-3.5 text-muted" />
            </h1>
          </div>
        </button>
        <NavLink to="/profile" aria-label="Perfil">
          <Avatar name={profile?.full_name} url={profile?.avatar_url} color={profile?.profile_color} size={38} />
        </NavLink>
      </header>

      <main className="safe-bottom flex-1 px-4 pb-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md">
        <div
          className="mx-4 mb-2 flex items-center justify-around rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-1 py-1.5 shadow-lg"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)' }}
        >
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-[var(--primary)]' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-8 w-12 items-center justify-center rounded-xl transition-all ${
                      isActive ? 'bg-soft' : ''
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <Modal open={switcherOpen} onClose={() => setSwitcherOpen(false)} title="Mis hogares">
        <div className="space-y-3">
          <div className="space-y-2">
            {homes.map((h) => (
              <button
                key={h.id}
                onClick={() => void doSwitch(h.id)}
                disabled={busy}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${
                  h.id === home?.id
                    ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)]'
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-[var(--on-primary)]">
                  <HomeIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{h.name}</p>
                  <p className="text-[10px] text-muted">
                    {h.role === 'owner' ? 'Creador' : 'Miembro'} · desde{' '}
                    {new Date(h.joined_at).toLocaleDateString('es-CO')}
                  </p>
                </div>
                {h.id === home?.id && <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" />}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-[var(--border)] p-3">
            <form onSubmit={doCreate} className="flex gap-2">
              <input
                className="input flex-1 !py-2.5 text-sm"
                placeholder="Crear un hogar nuevo"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                disabled={busy || !online}
              />
              <button type="submit" className="btn-primary shrink-0 !px-3" disabled={busy || !createName.trim() || !online} aria-label="Crear hogar">
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-[var(--border)] p-3">
            <form onSubmit={doJoin} className="flex gap-2">
              <input
                className="input flex-1 !py-2.5 text-center font-mono text-sm uppercase tracking-widest"
                placeholder="CÓDIGO"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                disabled={busy || !online}
              />
              <button type="submit" className="btn-ghost shrink-0 !px-3" disabled={busy || joinCode.length < 6 || !online} aria-label="Unirme a un hogar">
                <KeyRound className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-2 text-[11px] text-muted">
              Usa el código de invitación de otra familia para unirte también a su hogar.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}

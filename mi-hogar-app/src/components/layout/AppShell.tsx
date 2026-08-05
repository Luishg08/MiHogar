import { NavLink, Outlet } from 'react-router-dom'
import {
  Boxes,
  Bot,
  History,
  ShoppingCart,
  User
} from 'lucide-react'
import { useAppStore } from '@/store/app'
import { Avatar } from '@/components/Avatar'

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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[var(--bg)]">
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow">
            <Boxes className="h-5 w-5 text-[var(--on-primary)]" />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Mi Hogar</p>
            <h1 className="text-sm font-extrabold">{home?.name ?? 'Hogar'}</h1>
          </div>
        </div>
        <NavLink to="/profile" aria-label="Perfil">
          <Avatar name={profile?.full_name} url={profile?.avatar_url} color={profile?.profile_color} size={38} />
        </NavLink>
      </header>

      <main className="safe-bottom flex-1 px-4 pb-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md">
        <div
          className="mx-4 mb-3 flex items-center justify-around rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 px-1 py-2 shadow-lg backdrop-blur"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
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
    </div>
  )
}

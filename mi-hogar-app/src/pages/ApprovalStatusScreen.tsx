import { useState } from 'react'
import { Clock, RefreshCw, ShieldAlert, HomeIcon, LogOut } from 'lucide-react'
import { useAppStore } from '@/store/app'

export function ApprovalStatusScreen() {
  const profile = useAppStore((s) => s.profile)
  const signOut = useAppStore((s) => s.signOut)
  const refreshProfile = useAppStore((s) => s.refreshProfile)
  const [checking, setChecking] = useState(false)

  const rejected = profile?.status === 'rejected'

  const recheck = async () => {
    setChecking(true)
    try {
      await refreshProfile()
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg)] px-6">
      <div className="animate-fade-in w-full max-w-sm text-center">
        <div
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] shadow-xl ${
            rejected ? 'bg-red-500' : 'bg-primary'
          }`}
        >
          {rejected ? <ShieldAlert className="h-10 w-10 text-white" /> : <Clock className="h-10 w-10 text-[var(--on-primary)]" />}
        </div>
        <h1 className="text-2xl font-extrabold">{rejected ? 'Cuenta rechazada' : 'Cuenta pendiente de aprobación'}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {rejected
            ? 'Un administrador rechazó tu solicitud de acceso. Si crees que es un error, contáctalo.'
            : 'Tu cuenta fue creada, pero un administrador debe aprobarla antes de que puedas usar Mi Hogar. Vuelve a intentarlo en un momento.'}
        </p>

        {!rejected && (
          <button className="btn-ghost mt-6 w-full py-3.5" onClick={() => void recheck()} disabled={checking}>
            <RefreshCw className={`h-5 w-5 ${checking ? 'animate-spin' : ''}`} />
            Comprobar de nuevo
          </button>
        )}

        <button
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/10 py-3.5 font-bold text-red-500 transition-all active:scale-[0.98]"
          onClick={() => {
            if (confirm('¿Cerrar sesión?')) void signOut()
          }}
        >
          <LogOut className="h-5 w-5" /> Cerrar sesión
        </button>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted">
          <HomeIcon className="h-4 w-4" /> Mi Hogar
        </div>
      </div>
    </div>
  )
}

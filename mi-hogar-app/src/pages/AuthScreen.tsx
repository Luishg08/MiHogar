import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { HomeIcon, Mail, Lock, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        })
        if (error) throw error
        if (data.session) {
          await supabase.auth.updateUser({ data: { full_name: name } })
          toast.success('¡Bienvenido a Mi Hogar!')
        } else {
          toast.success('Revisa tu correo para confirmar la cuenta')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('¡Hola de nuevo!')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error'
      toast.error(msg === 'Invalid login credentials' ? 'Credenciales incorrectas' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg)] px-6">
      <div className="animate-fade-in w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary shadow-xl">
            <HomeIcon className="h-10 w-10 text-[var(--on-primary)]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Mi Hogar</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-muted">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            Tu asistente inteligente de la casa
          </p>
        </div>

        <div className="card mb-4 p-1.5">
          <div className="grid grid-cols-2 rounded-2xl bg-[var(--surface-2)] p-1">
            <button
              onClick={() => setMode('login')}
              className={`rounded-xl py-2 text-sm font-semibold transition-colors ${
                mode === 'login' ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm' : 'text-muted'
              }`}
            >
              Ingresar
            </button>
            <button
              onClick={() => setMode('register')}
              className={`rounded-xl py-2 text-sm font-semibold transition-colors ${
                mode === 'register' ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm' : 'text-muted'
              }`}
            >
              Crear cuenta
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <div className="relative">
              <input
                className="input pl-11"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
          )}
          <div className="relative">
            <input
              className="input pl-11"
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
          <div className="relative">
            <input
              className="input pl-11"
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
          <button className="btn-primary h-13 w-full py-3.5 text-base" disabled={loading}>
            {loading
              ? 'Espera...'
              : mode === 'login'
                ? 'Ingresar'
                : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Tu inventario y lista de mercado, sincronizados en tiempo real con tu familia.
        </p>
      </div>
    </div>
  )
}

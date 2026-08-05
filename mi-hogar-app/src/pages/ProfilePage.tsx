import { useRef, useState } from 'react'
import {
  Copy,
  Home,
  LogOut,
  Moon,
  Palette,
  Sun,
  Users
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app'
import { Avatar } from '@/components/Avatar'
import { getPalettes, isValidHex } from '@/lib/theme'
import type { Theme } from '@/types'
import { supabase } from '@/lib/supabase'

const SWATCHES = [
  '#0f766e', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#ca8a04', '#16a34a', '#475569', '#a855f7', '#ec4899'
]

export function ProfilePage() {
  const profile = useAppStore((s) => s.profile)
  const home = useAppStore((s) => s.home)
  const members = useAppStore((s) => s.members)
  const user = useAppStore((s) => s.user)
  const online = useAppStore((s) => s.online)
  const saveProfile = useAppStore((s) => s.saveProfile)
  const signOut = useAppStore((s) => s.signOut)

  const [name, setName] = useState(profile?.full_name ?? '')
  const [savingName, setSavingName] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const theme = profile?.theme ?? { mode: 'light', primary: '#0f766e', accent: '#f59e0b' }

  const updateTheme = (patch: Partial<Theme>) => {
    void saveProfile({ theme: { ...theme, ...patch } })
  }

  const copyCode = () => {
    void navigator.clipboard.writeText(home?.invite_code ?? '')
    toast.success('Código copiado al portapapeles')
  }

  const saveName = async () => {
    if (!name.trim()) return
    setSavingName(true)
    await saveProfile({ full_name: name.trim() })
    setSavingName(false)
    toast.success('Nombre actualizado')
  }

  const uploadAvatar = async (file: File) => {
    if (!user) return
    const path = `avatar-${user.id}.${file.name.split('.').pop() ?? 'jpg'}`
    const { error } = await supabase.storage.from('product-photos').upload(path, file, { upsert: true })
    if (error) {
      toast.error(error.message)
      return
    }
    const { data } = supabase.storage.from('product-photos').getPublicUrl(path)
    await saveProfile({ avatar_url: data.publicUrl })
    toast.success('Foto de perfil actualizada')
  }

  const colorSwatches = getPalettes()

  return (
    <div className="animate-fade-in space-y-4">
      <div className="card flex flex-col items-center gap-3 p-6 text-center">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={!online}
          className="relative"
          aria-label="Cambiar foto de perfil"
        >
          <Avatar name={profile?.full_name} url={profile?.avatar_url} color={profile?.profile_color} size={84} />
          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs text-[var(--on-primary)] shadow">
            📷
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void uploadAvatar(f)
          }}
        />
        <div className="w-full">
          <div className="flex gap-2">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn-primary shrink-0 px-4" onClick={() => void saveName()} disabled={savingName || !online}>
              Guardar
            </button>
          </div>
        </div>
        <p className="text-xs text-muted">{user?.email}</p>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
          <Palette className="h-4 w-4 text-[var(--primary)]" /> Tema de la app
        </h3>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--surface-2)] p-1">
          <button
            onClick={() => updateTheme({ mode: 'light' })}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold ${
              theme.mode === 'light' ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm' : 'text-muted'
            }`}
          >
            <Sun className="h-4 w-4" /> Claro
          </button>
          <button
            onClick={() => updateTheme({ mode: 'dark' })}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold ${
              theme.mode === 'dark' ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm' : 'text-muted'
            }`}
          >
            <Moon className="h-4 w-4" /> Oscuro
          </button>
        </div>

        <div className="space-y-4">
          <ColorRow
            label="Color principal"
            value={theme.primary}
            onChange={(c) => updateTheme({ primary: c })}
          />
          <ColorRow
            label="Color de acento"
            value={theme.accent}
            onChange={(c) => updateTheme({ accent: c })}
          />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-muted">Paletas rápidas</p>
          <div className="grid grid-cols-4 gap-2">
            {colorSwatches.map((p) => (
              <button
                key={p.name}
                onClick={() => updateTheme({ primary: p.primary, accent: p.accent })}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2 transition-all ${
                  theme.primary === p.primary ? 'border-[var(--primary)]' : 'border-[var(--border)]'
                }`}
              >
                <div className="flex h-6 w-full overflow-hidden rounded-lg">
                  <span className="flex-1" style={{ backgroundColor: p.primary }} />
                  <span className="flex-1" style={{ backgroundColor: p.accent }} />
                </div>
                <span className="text-[9px] font-semibold text-muted">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
          <Home className="h-4 w-4 text-[var(--primary)]" /> Mi hogar
        </h3>
        <p className="text-sm font-semibold">{home?.name}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex flex-1 items-center justify-center rounded-2xl bg-[var(--surface-2)] py-3 font-mono text-lg font-extrabold tracking-[0.3em] text-[var(--primary)]">
            {home?.invite_code}
          </div>
          <button className="btn-ghost h-12 w-12 shrink-0" onClick={copyCode} aria-label="Copiar código">
            <Copy className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Comparte este código con tu familia para que se unan al hogar.
        </p>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
          <Users className="h-4 w-4 text-[var(--primary)]" /> Miembros ({members.length})
        </h3>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3">
              <Avatar
                name={m.profile?.full_name}
                url={m.profile?.avatar_url}
                color={m.profile?.profile_color}
                size={38}
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">{m.profile?.full_name ?? 'Miembro'}</p>
                <p className="text-[10px] text-muted">
                  {m.role === 'owner' ? 'Creador del hogar' : 'Miembro'} · desde{' '}
                  {new Date(m.joined_at).toLocaleDateString('es-CO')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/10 py-3.5 font-bold text-red-500 transition-all active:scale-[0.98]"
        onClick={() => {
          if (confirm('¿Cerrar sesión?')) void signOut()
        }}
      >
        <LogOut className="h-5 w-5" /> Cerrar sesión
      </button>
    </div>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const [text, setText] = useState(value)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-semibold text-muted">{label}</label>
        <input
          className="input w-28 !px-2 py-1.5 text-center font-mono text-xs"
          value={text}
          onChange={(e) => {
            const v = e.target.value
            setText(v)
            if (isValidHex(v)) onChange(v)
          }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setText(c)
              onChange(c)
            }}
            className={`h-8 w-8 rounded-full transition-transform active:scale-90 ${
              value.toLowerCase() === c ? 'ring-2 ring-offset-2' : ''
            }`}
            style={{
              backgroundColor: c,
              ['--tw-ring-color' as string]: c,
              ['--tw-ring-offset-color' as string]: 'var(--surface)'
            }}
            aria-label={c}
          />
        ))}
      </div>
      <input
        type="color"
        value={isValidHex(value) ? value : '#0f766e'}
        onChange={(e) => {
          setText(e.target.value)
          onChange(e.target.value)
        }}
        className="mt-2 h-9 w-full cursor-pointer rounded-xl border border-[var(--border)]"
        aria-label={`Elegir ${label}`}
      />
    </div>
  )
}

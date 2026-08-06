import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Copy,
  Home,
  Image as ImageIcon,
  LogOut,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  Trash2,
  Users,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app'
import { Avatar } from '@/components/Avatar'
import { AvatarCropModal } from '@/components/AvatarCropModal'
import { getPalettes, isValidHex } from '@/lib/theme'
import type { AdminUser, Theme } from '@/types'
import { supabase } from '@/lib/supabase'

const SWATCHES = [
  '#0f766e', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#ca8a04', '#16a34a', '#475569', '#a855f7', '#ec4899'
]

export function ProfilePage() {
  const profile = useAppStore((s) => s.profile)
  const home = useAppStore((s) => s.home)
  const homes = useAppStore((s) => s.homes)
  const members = useAppStore((s) => s.members)
  const user = useAppStore((s) => s.user)
  const online = useAppStore((s) => s.online)
  const saveProfile = useAppStore((s) => s.saveProfile)
  const signOut = useAppStore((s) => s.signOut)
  const switchHome = useAppStore((s) => s.switchHome)
  const leaveHome = useAppStore((s) => s.leaveHome)

  const [name, setName] = useState(profile?.full_name ?? '')
  const [savingName, setSavingName] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bgFileRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [busyHome, setBusyHome] = useState<string | null>(null)
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

  const pickAvatar = (file: File) => {
    const url = URL.createObjectURL(file)
    setCropSrc(url)
  }

  const saveAvatar = async (blob: Blob) => {
    if (!user) return
    const path = `avatar-${user.id}.jpg`
    const { error } = await supabase.storage.from('product-photos').upload(path, blob, { upsert: true })
    URL.revokeObjectURL(cropSrc ?? '')
    setCropSrc(null)
    if (error) {
      toast.error(error.message)
      return
    }
    const { data } = supabase.storage.from('product-photos').getPublicUrl(path)
    await saveProfile({ avatar_url: data.publicUrl })
    toast.success('Foto de perfil actualizada')
  }

  const uploadBackground = async (file: File) => {
    if (!user) return
    const path = `backgrounds/${user.id}.${file.name.split('.').pop() ?? 'jpg'}`
    const { error } = await supabase.storage.from('product-photos').upload(path, file, { upsert: true })
    if (error) {
      toast.error(error.message)
      return
    }
    const { data } = supabase.storage.from('product-photos').getPublicUrl(path)
    await saveProfile({ background_url: data.publicUrl })
    toast.success('Fondo de la aplicación actualizado')
  }

  const clearBackground = async () => {
    await saveProfile({ background_url: null })
    toast.success('Fondo restablecido')
  }

  const doSwitch = async (id: string) => {
    if (id === home?.id) return
    setBusyHome(id)
    try {
      await switchHome(id)
      toast.success('Hogar cambiado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar de hogar')
    } finally {
      setBusyHome(null)
    }
  }

  const doLeave = async (id: string) => {
    if (!confirm('¿Salirte de este hogar?')) return
    setBusyHome(id)
    try {
      await leaveHome(id)
      toast.success('Saliste del hogar')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo salir del hogar')
    } finally {
      setBusyHome(null)
    }
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
            if (f) pickAvatar(f)
            e.target.value = ''
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
          <ImageIcon className="h-4 w-4 text-[var(--primary)]" /> Fondo de la aplicación
        </h3>
        <p className="mb-3 text-xs text-muted">
          Elige una foto de fondo para ambientar toda la app.
        </p>
        {profile?.background_url ? (
          <div className="flex items-center gap-3">
            <img
              src={profile.background_url}
              alt="Fondo de la app"
              className="h-16 w-28 rounded-2xl object-cover"
            />
            <div className="flex flex-1 flex-col gap-2">
              <button className="btn-ghost py-2.5 text-xs" onClick={() => bgFileRef.current?.click()} disabled={!online}>
                Cambiar foto
              </button>
              <button className="flex items-center justify-center gap-1.5 rounded-2xl bg-red-500/10 py-2.5 text-xs font-bold text-red-500" onClick={() => void clearBackground()}>
                <Trash2 className="h-3.5 w-3.5" /> Quitar fondo
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => bgFileRef.current?.click()}
            disabled={!online}
            className="flex h-16 w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[var(--border)] text-muted"
          >
            <ImageIcon className="h-5 w-5" />
            <span className="text-xs font-semibold">Subir foto de fondo</span>
          </button>
        )}
        <input
          ref={bgFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void uploadBackground(f)
            e.target.value = ''
          }}
        />
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
          <Home className="h-4 w-4 text-[var(--primary)]" /> Mis hogares ({homes.length})
        </h3>
        <div className="space-y-2">
          {homes.map((h) => {
            const active = h.id === home?.id
            return (
              <div
                key={h.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${
                  active ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                    {h.name}
                    {active && (
                      <span className="flex h-4 items-center rounded-full bg-[var(--primary)] px-1.5 text-[9px] font-extrabold text-[var(--on-primary)]">
                        ACTIVO
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted">
                    {h.role === 'owner' ? 'Creador' : 'Miembro'} · desde{' '}
                    {new Date(h.joined_at).toLocaleDateString('es-CO')}
                  </p>
                </div>
                {!active && (
                  <button
                    className="btn-ghost px-3 py-1.5 text-[11px]"
                    disabled={busyHome === h.id || !online}
                    onClick={() => void doSwitch(h.id)}
                  >
                    Cambiar
                  </button>
                )}
                {h.role !== 'owner' && homes.length > 1 && (
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                    disabled={busyHome === h.id || !online}
                    onClick={() => void doLeave(h.id)}
                    aria-label={`Salir de ${h.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex flex-1 items-center justify-center rounded-2xl bg-[var(--surface-2)] py-3 font-mono text-lg font-extrabold tracking-[0.3em] text-[var(--primary)]">
            {home?.invite_code}
          </div>
          <button className="btn-ghost h-12 w-12 shrink-0" onClick={copyCode} aria-label="Copiar código">
            <Copy className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Comparte este código con tu familia para que se unan al hogar. También puedes crear un hogar o unirte a otro con un código tocando el nombre del hogar arriba.
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

      {profile?.is_admin && <AdminSection />}

      <button
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/10 py-3.5 font-bold text-red-500 transition-all active:scale-[0.98]"
        onClick={() => {
          if (confirm('¿Cerrar sesión?')) void signOut()
        }}
      >
        <LogOut className="h-5 w-5" /> Cerrar sesión
      </button>

      <AvatarCropModal open={!!cropSrc} src={cropSrc} onCancel={() => { URL.revokeObjectURL(cropSrc ?? ''); setCropSrc(null) }} onConfirm={(blob) => void saveAvatar(blob)} />
    </div>
  )
}

function AdminSection() {
  const user = useAppStore((s) => s.user)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_list_users')
    if (!error && data) setUsers((data as AdminUser[]).filter((u) => u.status !== 'rejected'))
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const pending = users.filter((u) => u.status === 'pending')

  const run = async (id: string, fn: () => PromiseLike<unknown>, okMsg: string) => {
    setBusyId(id)
    try {
      await fn()
      toast.success(okMsg)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="card p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
        <ShieldCheck className="h-4 w-4 text-[var(--primary)]" /> Administración
      </h3>

      {pending.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-muted">
            Solicitudes de registro pendientes ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
                <Avatar name={u.full_name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{u.full_name || 'Sin nombre'}</p>
                  <p className="truncate text-[10px] text-muted">{u.email}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10 text-green-600 disabled:opacity-50"
                    disabled={busyId === u.id}
                    onClick={() => void run(u.id, () => supabase.rpc('approve_user', { p_user_id: u.id }), 'Usuario aprobado')}
                    aria-label="Aprobar"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500 disabled:opacity-50"
                    disabled={busyId === u.id}
                    onClick={() => void run(u.id, () => supabase.rpc('reject_user', { p_user_id: u.id }), 'Usuario rechazado')}
                    aria-label="Rechazar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && !loading && (
        <p className="mb-3 text-xs text-muted">No hay solicitudes pendientes de aprobación.</p>
      )}

      <p className="mb-2 text-xs font-semibold text-muted">Usuarios aprobados · rol administrador</p>
      <div className="space-y-2">
        {users
          .filter((u) => u.status === 'approved')
          .map((u) => (
            <div key={u.id} className="flex items-center gap-3">
              <Avatar name={u.full_name} url={u.avatar_url ?? null} color={u.profile_color ?? undefined} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{u.full_name || u.email}</p>
                <p className="truncate text-[10px] text-muted">{u.email}</p>
              </div>
              <button
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                  u.is_admin
                    ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                    : 'bg-[var(--surface-2)] text-muted'
                }`}
                disabled={busyId === u.id || u.id === user?.id}
                onClick={() => void run(u.id, () => supabase.rpc('set_admin', { p_user_id: u.id, p_admin: !u.is_admin }), u.is_admin ? 'Rol de admin retirado' : 'Ahora es administrador')}
              >
                {u.is_admin ? 'Admin' : 'Asignar admin'}
              </button>
            </div>
          ))}
      </div>
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

import { readableOn } from '@/lib/theme'

interface AvatarProps {
  name?: string | null
  url?: string | null
  color?: string
  size?: number
}

export function Avatar({ name, url, color, size = 40 }: AvatarProps) {
  const initial = (name?.trim()[0] ?? '?').toUpperCase()
  const bg = color ?? '#0f766e'
  const fg = readableOn(bg)
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? 'usuario'}
        className="rounded-full object-cover ring-2 ring-[var(--surface)]"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold ring-2 ring-[var(--surface)]"
      style={{ width: size, height: size, backgroundColor: bg, color: fg, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  )
}

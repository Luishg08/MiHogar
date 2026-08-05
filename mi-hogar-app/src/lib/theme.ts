import type { Theme } from '@/types'

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace('#', '')
  if (m.length !== 6 && m.length !== 3) return null
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return null
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0.5
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function readableOn(hex: string): string {
  return luminance(hex) > 0.6 ? '#1c1917' : '#ffffff'
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

export function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const f = (v: number) => Math.min(255, Math.round(v + (255 - v) * amount))
  return `#${[f(rgb.r), f(rgb.g), f(rgb.b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const f = (v: number) => Math.max(0, Math.round(v * (1 - amount)))
  return `#${[f(rgb.r), f(rgb.g), f(rgb.b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value.trim())
}

const basePalettes: Record<string, string[]> = {
  Esmeralda: ['#0f766e', '#14b8a6', '#f59e0b', '#ffffff'],
  Océano: ['#0c4a6e', '#0ea5e9', '#f97316', '#ffffff'],
  Bosque: ['#14532d', '#22c55e', '#eab308', '#ffffff'],
  Atardecer: ['#7c2d12', '#ea580c', '#fbbf24', '#1c1917'],
  Vino: ['#4c0519', '#e11d48', '#f472b6', '#ffffff'],
  Medianoche: ['#1e1b4b', '#6366f1', '#22d3ee', '#ffffff'],
  Flor: ['#831843', '#ec4899', '#a78bfa', '#ffffff'],
  Café: ['#451a03', '#b45309', '#fcd34d', '#ffffff']
}

export interface Palette {
  name: string
  primary: string
  accent: string
  onPrimary: string
}

export function getPalettes(): Palette[] {
  return Object.entries(basePalettes).map(([name, [primary, accent]]) => ({
    name,
    primary,
    accent,
    onPrimary: readableOn(primary)
  }))
}

const VALID_KEYS: Record<string, string> = {
  mode: 'mode',
  primary: 'primary',
  accent: 'accent'
}

export function sanitizeTheme(raw: unknown): Theme {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const theme: Theme = {
    mode: obj.mode === 'dark' ? 'dark' : 'light',
    primary:
      typeof obj.primary === 'string' && isValidHex(obj.primary) ? obj.primary : '#0f766e',
    accent:
      typeof obj.accent === 'string' && isValidHex(obj.accent) ? obj.accent : '#f59e0b'
  }
  void VALID_KEYS
  return theme
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme.mode === 'dark')
  root.style.setProperty('--primary', theme.primary)
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--on-primary', readableOn(theme.primary))
  root.style.setProperty('--primary-soft', withAlpha(theme.primary, 0.12))
  root.style.setProperty('--primary-soft-strong', withAlpha(theme.primary, 0.2))
  root.style.setProperty('--accent-soft', withAlpha(theme.accent, 0.15))
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme.primary)
}

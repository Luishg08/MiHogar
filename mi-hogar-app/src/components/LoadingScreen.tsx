import { HomeIcon } from 'lucide-react'

export function LoadingScreen({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--bg)]">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-lg">
        <HomeIcon className="h-8 w-8 text-[var(--on-primary)]" />
      </div>
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full w-1/2 animate-[loading_1s_ease-in-out_infinite] rounded-full bg-primary"
          style={{ animation: 'loading 1.1s ease-in-out infinite' }}
        />
      </div>
      <p className="text-sm font-medium text-muted">{label ?? 'Cargando...'}</p>
      <style>{`@keyframes loading { 0% { transform: translateX(-100%);} 100% { transform: translateX(200%);} }`}</style>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'

interface Props {
  open: boolean
  src: string | null
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}

const SIZE = 288
const OUTPUT = 512

interface ImgMeta {
  naturalW: number
  naturalH: number
}

export function AvatarCropModal({ open, src, onCancel, onConfirm }: Props) {
  const [meta, setMeta] = useState<ImgMeta | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const startRef = useRef({ px: 0, py: 0, x: 0, y: 0 })
  const [outputting, setOutputting] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!open || !src) return
    setMeta(null)
    setZoom(1)
    setPos({ x: 0, y: 0 })
    const img = new Image()
    img.onload = () => {
      setMeta({ naturalW: img.naturalWidth, naturalH: img.naturalHeight })
      imgRef.current = img
    }
    img.src = src
  }, [open, src])

  const coverFactor = meta ? Math.max(SIZE / meta.naturalW, SIZE / meta.naturalH) : 0
  const displayedW = meta ? meta.naturalW * coverFactor * zoom : 0
  const displayedH = meta ? meta.naturalH * coverFactor * zoom : 0

  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

  const updatePos = (x: number, y: number) => {
    setPos({
      x: clamp(x, SIZE - displayedW, 0),
      y: clamp(y, SIZE - displayedH, 0)
    })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true)
    startRef.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - startRef.current.px
    const dy = e.clientY - startRef.current.py
    updatePos(startRef.current.x + dx, startRef.current.y + dy)
  }

  const onPointerUp = () => setDragging(false)

  const onZoom = (v: number) => {
    const newZoom = v
    const newW = meta ? meta.naturalW * coverFactor * newZoom : 0
    const newH = meta ? meta.naturalH * coverFactor * newZoom : 0
    setZoom(newZoom)
    setPos({
      x: clamp((SIZE - newW) / 2, SIZE - newW, 0),
      y: clamp((SIZE - newH) / 2, SIZE - newH, 0)
    })
  }

  const confirm = () => {
    const img = imgRef.current
    if (!meta || !img) return
    setOutputting(true)
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setOutputting(false)
      return
    }
    const scalePx = img.naturalWidth / displayedW
    const cropX = -pos.x * scalePx
    const cropY = -pos.y * scalePx
    const cropSize = SIZE * scalePx
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, OUTPUT, OUTPUT)
    canvas.toBlob((blob) => {
      setOutputting(false)
      if (blob) onConfirm(blob)
    }, 'image/jpeg', 0.92)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative z-10 w-full max-w-sm rounded-3xl bg-[var(--surface)] p-5 shadow-2xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <ImagePlus className="h-5 w-5 text-[var(--primary)]" /> Ajustar foto de perfil
        </h3>
        <p className="mb-4 text-xs text-muted">
          Arrastra la imagen y usa el zoom para elegir qué parte quieres en el círculo.
        </p>

        <div
          className="relative mx-auto overflow-hidden rounded-full select-none"
          style={{ width: SIZE, height: SIZE, touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {meta && (
            <img
              src={src ?? undefined}
              alt="Foto a recortar"
              draggable={false}
              className="absolute"
              style={{
                width: displayedW,
                height: displayedH,
                left: pos.x,
                top: pos.y,
                maxWidth: 'none',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            />
          )}
          {!meta && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
              Cargando imagen...
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80 shadow-[0_0_0_100vmax_rgba(0,0,0,0.5)]" />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <span className="text-xs font-bold text-muted">−</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => onZoom(parseFloat(e.target.value))}
            className="flex-1 accent-[var(--primary)]"
            aria-label="Zoom de la foto"
          />
          <span className="text-xs font-bold text-muted">+</span>
        </div>

        <div className="mt-5 flex gap-3">
          <button className="btn-ghost flex-1 py-3" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="btn-primary flex-1 py-3"
            onClick={confirm}
            disabled={!meta || outputting}
          >
            {outputting ? 'Procesando...' : 'Usar foto'}
          </button>
        </div>
      </div>
    </div>
  )
}

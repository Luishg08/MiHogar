import { supabase } from '@/lib/supabase'
import type { ConsumeDeduction, MealSuggestion, ReceiptItem } from '@/types'

interface InvokeOptions {
  signal?: AbortSignal
}

async function invoke<T>(fn: string, body: object, opts?: InvokeOptions): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, {
    body,
    ...(opts?.signal ? { signal: opts.signal } : {})
  })
  if (error) {
    const message =
      error.context && typeof error.context === 'object' && 'message' in error.context
        ? String((error.context as { message: string }).message)
        : error.message
    throw new Error(message || 'Error al contactar la IA')
  }
  return data as T
}

export interface MealRequest {
  products: { name: string; quantity: number; unit: string }[]
  type?: 'desayuno' | 'almuerzo' | 'cena' | 'snack' | 'todos'
  count?: number
}

export function suggestMeals(req: MealRequest, opts?: InvokeOptions) {
  return invoke<{ suggestions: MealSuggestion[] }>('suggest-meals', req, opts)
}

export interface ConsumeRequest {
  text: string
  inventory: { id: string; name: string; quantity: number; unit: string }[]
}

export function interpretConsumption(req: ConsumeRequest, opts?: InvokeOptions) {
  return invoke<{ summary: string; deductions: ConsumeDeduction[] }>('voice-consume', req, opts)
}

export function scanReceipt(file: File, opts?: InvokeOptions) {
  return new Promise<{ items: ReceiptItem[]; total?: string }>((resolve, reject) => {
    const prepare = async () => {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        return { base64: await readAsBase64(file), type: 'application/pdf' }
      }
      return compressImage(file)
    }
    prepare()
      .then(async ({ base64, type }) => {
        try {
          const result = await invoke<{ items: ReceiptItem[]; total?: string }>(
            'scan-receipt',
            { file: { base64, name: file.name, type } },
            opts
          )
          resolve(result)
        } catch (e) {
          reject(e)
        }
      })
      .catch(reject)
  })
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(file)
  })
}

async function compressImage(file: File): Promise<{ base64: string; type: string }> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return { base64: await readAsBase64(file), type: file.type }
  const MAX = 1280
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return { base64: await readAsBase64(file), type: file.type }
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
  return { base64: dataUrl.split(',')[1] ?? '', type: 'image/jpeg' }
}

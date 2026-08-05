
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.1-flash-lite'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

interface ScanRequest {
  file: { base64: string; name: string; type: string }
}

const SYSTEM_PROMPT = `Eres un lector de facturas de supermercado de Colombia. Analiza la imagen o el PDF y extrae los productos comprados.
Debes responder SIEMPRE en JSON válido con esta estructura exacta:
{
  "items": [
    { "name": "nombre del producto", "quantity": 1, "unit": "Unidad" }
  ],
  "total": "valor total si aparece, en pesos colombianos"
}
Reglas:
- Incluye SOLO artículos (productos). Omite filas como subtotal, IVA, total, formas de pago, códigos, promociones y datos del negocio.
- Combina cantidades: si la factura lista "Leche x2", usa quantity 2. Si no dice cantidad, usa 1.
- Unidad: usa "Unidad" por defecto; usa "Kilogramo", "Libra", "Litro", "Bolsa", "Caja", "Botella", "Paquete", "Lata" solo si la factura lo indica.
- El nombre debe ser corto y genérico (ej. "Pan Bimbo" → "Pan", "Arroz Diana" → "Arroz"). Evita marcas cuando sea posible, pero si es algo específico mantenlo.
- Si no se puede leer nada, devuelve {"items": []}.`

function mimeTypeFor(type: string): string {
  if (type === 'application/pdf' || type.toLowerCase().endsWith('.pdf')) return 'application/pdf'
  return type.startsWith('image/') ? type : 'image/jpeg'
}

async function callGemini(base64: string, type: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeTypeFor(type),
                  data: base64
                }
              },
              { text: 'Extrae los productos de esta factura.' }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      })
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gemini error ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ message: 'Falta GEMINI_API_KEY en las secrets de la función.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  try {
    const reqBody = (await req.json()) as ScanRequest
    const base64 = reqBody.file?.base64 ?? ''
    if (!base64) {
      return new Response(JSON.stringify({ message: 'No se recibió el archivo.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const raw = await callGemini(base64, reqBody.file?.type ?? '')
    let parsed: { items?: unknown[]; total?: string } = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) parsed = JSON.parse(match[0])
    }
    const items = Array.isArray(parsed.items) ? parsed.items : []
    const normalized = items.map((it) => {
      const o = it as Record<string, unknown>
      return {
        name: String(o.name ?? 'Producto').trim(),
        quantity: Math.max(1, Number(o.quantity) || 1),
        unit: String(o.unit ?? 'Unidad')
      }
    })
    return new Response(JSON.stringify({ items: normalized, total: parsed.total }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

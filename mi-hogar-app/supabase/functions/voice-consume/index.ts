
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.1-flash-lite'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

interface VoiceRequest {
  text: string
  inventory: { id: string; name: string; quantity: number; unit: string }[]
}

const SYSTEM_PROMPT = `Eres el asistente del inventario de un hogar. El usuario describe en texto (transcrito de una nota de voz) qué productos gastó, usó o consumió. Debes identificar QUÉ se consumió y CUÁNTO, usando SOLO los productos del inventario proporcionado.
Debes responder SIEMPRE en JSON válido con esta estructura exacta:
{
  "summary": "Resumen corto y claro en español de lo que se va a descontar del inventario. Si algo no está en el inventario, menciónalo aquí.",
  "deductions": [
    { "product_id": "id exacto del inventario", "name": "nombre exacto del inventario", "quantity": 2, "unit": "Unidad" }
  ]
}
Reglas:
- product_id DEBE ser uno de los ids listados en el inventario. Nunca inventes ids.
- Convierte las cantidades a las unidades del inventario: si el usuario dice "medio kilo de arroz" y el arroz está en Kilogramo, quantity 1. Si dice "una bolsa de pan" y el pan está en Unidad, quantity 1. Redondea hacia arriba a entero, mínimo 1.
- Si el usuario menciona algo que NO existe en el inventario, NO lo incluyas en deductions; explícalo en summary.
- Si no hay nada claro o nada coincide, devuelve {"summary": "explicación", "deductions": []}.`

function buildPrompt(req: VoiceRequest): string {
  return `Texto transcrito de la nota de voz del usuario:
"${req.text}"

Inventario actual del hogar:
${req.inventory.map((p) => `- id: ${p.id} | ${p.name} | cantidad: ${p.quantity} ${p.unit}`).join('\n')}

Devuelve la lista de deducciones de consumo.`
}

async function callGemini(prompt: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
    const reqBody = (await req.json()) as VoiceRequest
    const text = reqBody.text?.trim() ?? ''
    if (!text) {
      return new Response(JSON.stringify({ message: 'No se recibió texto para interpretar.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const raw = await callGemini(buildPrompt(reqBody))
    let parsed: { summary?: string; deductions?: unknown[] } = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) parsed = JSON.parse(match[0])
    }
    const deductions = (Array.isArray(parsed.deductions) ? parsed.deductions : [])
      .map((it) => {
        const o = it as Record<string, unknown>
        return {
          product_id: String(o.product_id ?? ''),
          name: String(o.name ?? '').trim(),
          quantity: Math.max(1, Number(o.quantity) || 1),
          unit: String(o.unit ?? 'Unidad')
        }
      })
      .filter((d) => d.product_id && d.name)
    return new Response(JSON.stringify({ summary: parsed.summary ?? '', deductions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.1-flash-lite'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

interface MealRequest {
  products: { name: string; quantity: number; unit: string }[]
  type?: 'desayuno' | 'almuerzo' | 'cena' | 'snack' | 'todos'
  count?: number
}

const SYSTEM_PROMPT = `Eres un chef y asistente de hogar experto en español. Ayudas a familias a aprovechar su inventario real y evitar el desperdicio de comida.
Debes responder SIEMPRE en JSON válido con esta estructura exacta:
{
  "suggestions": [
    {
      "title": "Nombre corto de la receta",
      "type": "desayuno | almuerzo | cena | snack | bebida",
      "ingredients": ["ingrediente 1", ...],
      "instructions": "Preparación breve en 2-4 pasos",
      "usesInventory": ["nombres exactos de productos del inventario que se usan"],
      "timeMinutes": 25
    }
  ]
}
Reglas:
- Solo usa productos que existen en el inventario que se te da (puedes complementar con especias, sal, aceite y agua, que se asumen en casa).
- Prioriza los productos con poca cantidad y los que están por vencer si se indica.
- Si el inventario no alcanza para ninguna receta decente, devuelve 1 sugerencia simple pero honesta.
- No inventes productos. Los nombres de usesInventory deben coincidir con los del inventario.`

function buildPrompt(req: MealRequest): string {
  const typeLabel =
    req.type === 'todos' ? 'todo tipo de comidas' : `especialmente ${req.type}s`
  return `Inventario actual del hogar:
${req.products.map((p) => `- ${p.name}: ${p.quantity} ${p.unit}`).join('\n')}

Quiero sugerencias para ${typeLabel}. Proponme ${req.count ?? 4} recetas realistas aprovechando lo que tengo.`
}

async function callGemini(prompt: string, jsonSchema: boolean) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          ...(jsonSchema ? { responseMimeType: 'application/json' } : {})
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
    const reqBody = (await req.json()) as MealRequest
    const raw = await callGemini(buildPrompt(reqBody), true)
    const parsed = JSON.parse(raw)
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

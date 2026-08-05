
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.1-flash-lite'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

interface AskChefRequest {
  question: string
  inventory: { name: string; quantity: number; unit: string }[]
}

const SYSTEM_PROMPT = `Eres un chef experto en español que cocina con lo que hay en la casa.
Debes responder SIEMPRE en JSON válido con esta estructura exacta:
{
  "answers": [
    {
      "title": "Título de la respuesta o receta",
      "recipe": "Explicación clara paso a paso usando solo el inventario dado (se asumen sal, pimienta, aceite, agua y especias básicas).",
      "suggestions": ["idea complementaria 1", "idea complementaria 2", "idea complementaria 3"]
    }
  ]
}
Reglas:
- Usa ÚNICAMENTE los productos listados en el inventario. Si te preguntan por algo que no está, dilo con honestidad y propón alternativas.
- Responde en español de Colombia, cercano y útil.
- Entre 1 y 3 respuestas (answers).`

function buildPrompt(req: AskChefRequest): string {
  return `Pregunta del usuario: "${req.question}"

Inventario disponible en casa:
${req.inventory.map((p) => `- ${p.name}: ${p.quantity} ${p.unit}`).join('\n')}`
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
          temperature: 0.7,
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
    const reqBody = (await req.json()) as AskChefRequest
    const raw = await callGemini(buildPrompt(reqBody))
    const parsed = JSON.parse(raw)
    const answers = Array.isArray(parsed.answers) ? parsed.answers : []
    return new Response(JSON.stringify({ answers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024

interface SearchImage {
  url: string
  thumb: string
  source: string
}

async function searchOpenFoodFacts(query: string): Promise<SearchImage[]> {
  const url =
    'https://world.openfoodfacts.org/cgi/search.pl?action=process&' +
    `search_terms=${encodeURIComponent(query)}&json=1&page_size=12&` +
    'fields=product_name,image_front_url,image_front_small_url'
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
    if (!res.ok) return []
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) return []
    const data = await res.json()
    const products: { product_name?: string; image_front_url?: string; image_front_small_url?: string }[] =
      Array.isArray(data.products) ? data.products : []
    return products
      .filter((p) => p.image_front_url)
      .map((p) => ({
        url: p.image_front_url as string,
        thumb: p.image_front_small_url || (p.image_front_url as string),
        source: 'off'
      }))
  } catch {
    return []
  }
}

async function searchSerper(query: string): Promise<SearchImage[]> {
  if (!SERPER_API_KEY) return []
  try {
    const res = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, num: 12 }),
      signal: AbortSignal.timeout(12000)
    })
    if (!res.ok) return []
    const data = await res.json()
    const results: { imageUrl?: string; thumbnailUrl?: string }[] = Array.isArray(data.images)
      ? data.images
      : []
    return results
      .filter((r) => r.imageUrl)
      .map((r) => ({
        url: r.imageUrl as string,
        thumb: r.thumbnailUrl || (r.imageUrl as string),
        source: 'google'
      }))
  } catch {
    return []
  }
}

async function proxyImage(rawUrl: string): Promise<Response> {
  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    return new Response(JSON.stringify({ message: 'URL inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return new Response(JSON.stringify({ message: 'Protocolo no permitido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  const res = await fetch(target.toString(), { signal: AbortSignal.timeout(15000) })
  if (!res.ok) {
    return new Response(JSON.stringify({ message: `No se pudo descargar (${res.status})` }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.startsWith('image/')) {
    return new Response(JSON.stringify({ message: 'El enlace no es una imagen' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  const length = Number(res.headers.get('content-length') ?? 0)
  if (length > MAX_IMAGE_BYTES) {
    return new Response(JSON.stringify({ message: 'Imagen demasiado grande' }), {
      status: 413,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  const bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return new Response(JSON.stringify({ message: 'Imagen demasiado grande' }), {
      status: 413,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  return new Response(bytes, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      ...corsHeaders
    }
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const url = new URL(req.url)
    if (url.pathname.endsWith('/proxy')) {
      const imgUrl = url.searchParams.get('url') ?? ''
      if (!imgUrl) {
        return new Response(JSON.stringify({ message: 'Falta el parámetro url.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      return await proxyImage(imgUrl)
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ message: 'Método no permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = (await req.json()) as { query?: string }
    const query = (body.query ?? '').trim()
    if (!query) {
      return new Response(JSON.stringify({ message: 'Falta el término de búsqueda.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const [off, google] = await Promise.all([
      searchOpenFoodFacts(query),
      searchSerper(query)
    ])
    const seen = new Set<string>()
    const images: SearchImage[] = []
    for (const img of [...off, ...google]) {
      if (seen.has(img.url)) continue
      seen.add(img.url)
      images.push(img)
      if (images.length >= 12) break
    }

    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

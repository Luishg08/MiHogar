import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const envContent = readFileSync(join(process.cwd(), '.env'), 'utf-8')
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/)
if (!urlMatch) {
  console.error('No encontré VITE_SUPABASE_URL en .env')
  process.exit(1)
}
const ref = urlMatch[1].trim().replace(/^https?:\/\//, '').split('.')[0]

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error('Falta la variable de entorno SUPABASE_ACCESS_TOKEN (personal access token de Supabase).')
  process.exit(1)
}

const work = mkdtempSync(join(tmpdir(), 'mh-funcs-'))
try {
  cpSync(join(process.cwd(), 'supabase', 'functions'), join(work, 'supabase', 'functions'), { recursive: true })
  console.log(`Desplegando funciones en proyecto ${ref}...`)
  execSync(
    'supabase functions deploy suggest-meals voice-consume scan-receipt product-images --project-ref ' + ref,
    { cwd: work, stdio: 'inherit', env: process.env }
  )
} finally {
  rmSync(work, { recursive: true, force: true })
}

# CONTEXT.md — Contexto del proyecto "Mi Hogar"

> Archivo vivo de contexto. Léelo completo al iniciar una sesión nueva o cuando se haya
> limpiado el contexto. Se actualiza a medida que el proyecto avanza.
> Credenciales sensibles: ver `docs/CONTEXT_SECRETS.md` (no versionado).

---

## 1. Qué es

**Mi Hogar** es una PWA instalable (iPhone/Android) para administrar el inventario del
hogar y la lista de mercado, con asistente de IA (Gemini) y sincronización en tiempo
real entre todos los integrantes de la familia.

### Estado actual
- **Terminada y funcional.** Corre contra Supabase en la nube.
- **Desplegada** en Render como *Web Service* (gratis). Ver sección 7.
- Código publicado en GitHub: `https://github.com/Luishg08/MiHogar` (rama `main`).

---

## 2. Ubicaciones clave

| Qué | Dónde |
|---|---|
| Código de la app | `C:\Users\LHENAO\OneDrive - CONSENSUS SAS\Documentos\Luis\mi-hogar-app\` |
| Repo Git (raíz) | `...\Documentos\Luis\` (`.git` en la carpeta Luis; **solo** se trackea `mi-hogar-app/`) |
| Remoto | `origin` → `https://github.com/Luishg08/MiHogar.git` |
| Web en Render | `https://mihogar-t9ja.onrender.com` (puede cambiar de subdominio) |

> ⚠️ **La ruta tiene espacios** (`OneDrive - CONSENSAS SAS`). Rompe el empaquetador de la
> CLI de Supabase (`supabase functions deploy`). El workaround es el script
> `npm run deploy:functions` (copia a temp sin espacios y despliega). No usar la CLI
> directa desde esta carpeta para desplegar funciones.

---

## 3. Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite 5 + Tailwind 3 |
| PWA | vite-plugin-pwa (autoUpdate, workbox, precache + runtime cache supabase/fonts) |
| Estado | Zustand (`src/store/app.ts`) |
| Routing | React Router 6 |
| Notificaciones UI | sonner · Iconos: lucide-react · Fechas: date-fns |
| Backend / Auth / Realtime | Supabase (PostgreSQL + RLS + Realtime + Storage) |
| IA | Google Gemini vía Edge Functions de Supabase |

Versiones relevantes (`package.json`): vite ^5.4.10, @supabase/supabase-js ^2.112.1,
typescript ^5.6.3, react ^18.3.1.

---

## 4. Supabase en la nube (producción)

- **Proyecto**: `bvtoblqljvsbtnqigtug` ("Luishg08's Project") · Región: `us-east-1`.
- **URL**: `https://bvtoblqljvsbtnqigtug.supabase.co`
- **Credenciales**: en `.env` (gitignoreado). Plantilla en `.env.example`.
- **Confirmación de email desactivada** (`mailer_autoconfirm: true`): el registro entra
  directo sin confirmar.

### Migración aplicada
`s supabase/migrations/0001_init.sql` aplicada y verificada. Contiene:

**9 tablas:** `profiles`, `homes`, `home_members`, `categories`, `units`, `products`,
`product_categories`, `shopping_items`, `inventory_events`.

**6 funciones SQL (RPC):**
- `create_home(p_name)` — crea hogar + membership, genera código de invitación.
- `join_home(p_code)` — une al usuario al hogar por código.
- `mark_purchased(p_item_id)` — marca comprado, actualiza/crea el producto e inserta
  evento de auditoría (transaccional).
- `adjust_quantity(p_product_id, p_delta)` — ajusta cantidad y audita.
- `batch_add_products(p_items jsonb)` — alta masiva (usada por escáner de factura).
- `is_member(p_home_id)` — helper de RLS.

**Triggers:** `fn_handle_new_user` (crea profile al signup), `fn_log_product_event`,
`fn_log_shopping_event` (auditoría), `fn_set_updated_at`.

**RLS** habilitada en las 9 tablas (políticas por `is_member` / owner).
**Realtime** habilitada en: `products`, `shopping_items`, `inventory_events`,
`home_members`, `profiles`.
**Seed:** 15 categorías y 11 unidades.

### Edge Functions (IA) — desplegadas
| Función | Rol |
|---|---|
| `suggest-meals` | Sugiere desayuno/almuerzo/cena según el inventario |
| `ask-chef` | Chat libre "¿qué cocino con...?" |
| `scan-receipt` | Escanea factura (foto/PDF → imagen) y agrega productos |

- **Modelo activo**: `gemini-3.1-flash-lite` (definido como default en las funciones).
- **Historial del modelo** (no volver a gemini-2.5-flash ni flash-latest):
  - `gemini-2.5-flash` → 404 para usuarios nuevos sin acceso.
  - `gemini-flash-latest` → 503 "overloaded".
  - `gemini-3.1-flash-lite` → funciona (JSON validado + visión).
- Secreto usado por las funciones: `GEMINI_API_KEY` (via `Deno.env.get`), seteado con
  `supabase secrets set`.

---

## 5. Arquitectura del código

```
mi-hogar-app/
├── supabase/
│   ├── migrations/0001_init.sql   # esquema completo
│   ├── functions/{suggest-meals,ask-chef,scan-receipt}/index.ts
│   ├── config.toml                # config local
│   └── .temp/                     # generado por `supabase start` → gitignoreado (secretos Docker)
├── src/
│   ├── App.tsx                    # rutas
│   ├── main.tsx
│   ├── pages/                     # Auth, HomeSetup, Inventory, Shopping, Assistant,
│   │                              # Activity, ProductDetail, Profile
│   ├── components/                # Avatar, Modal, LoadingScreen, layout/AppShell,
│   │                              # product/{EmojiPicker,ProductCard,ProductFormModal}
│   ├── store/app.ts               # Zustand + suscripciones Realtime (Observer)
│   ├── lib/                       # supabase.ts (cliente), gemini.ts (llamadas a funciones IA),
│   │                              # theme.ts (tema claro/oscuro/paletas)
│   └── types.ts
├── public/
│   ├── icons/icon-192.png, icon-512.png
│   └── _redirects                 # `/* /index.html 200` (fallback SPA para Render)
├── scripts/
│   ├── deploy-functions.mjs       # deploy de IA (workaround rutas con espacios)
│   └── gen-icons.mjs              # genera íconos PNG
├── server.mjs                     # servidor estático para Render (Web Service)
├── vite.config.js                 # React + PWA + server/preview.allowedHosts
├── package.json
└── .env                           # credenciales reales (gitignoreado)
```

### Patrones clave
- **Observer / Realtime**: `src/store/app.ts` se suscribe a INSERT/UPDATE/DELETE de las
  5 tablas y recarga el store; todas las pantallas suscritas se actualizan al instante.
- **Compra → inventario automático**: RPC `mark_purchased()` transaccional (auditoría con
  `auth.uid()`, no falsificable desde el cliente).
- **Seguridad**: RLS por hogar vía `is_member`; hogares se crean/unen por RPC con código.

---

## 6. Credenciales y seguridad

- `.env` (gitignoreado): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- `.env.example`: solo plantilla.
- **Pendiente de hacer (avisado al usuario)**: revocar el **SBP token** de Supabase
  (`SUPABASE_ACCESS_TOKEN`) y **rotar la clave de Gemini** (`GEMINI_API_KEY`). Están en
  `docs/CONTEXT_SECRETS.md`.
- GitHub Push Protection bloquea secretos: ya ocurrió con `supabase/.temp/` (secretos
  locales de Docker). El directorio `supabase/.temp` **no debe versionarse**.

---

## 7. Despliegue en Render

- **Tipo**: *Web Service* (gratis). Idealmente sería Static Site, pero se decidió Web
  Service; consume 1 dyno free.
- **Git**: Render se conecta a `github.com/Luishg08/MiHogar`, **Root Directory**:
  `mi-hogar-app` (la app está en subcarpeta del repo).
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start` → ejecuta `server.mjs` (servidor Node puro que
  sirve `dist/` con SPA fallback, escuchando en `0.0.0.0:$PORT`).
- **Env vars en Render**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (iguales a `.env`).
- **Fallback SPA**: via `public/_redirects` (`/* /index.html 200`) + fallback del propio
  `server.mjs` para rutas no-archivo.
- **Host check de Vite**: `server.allowedHosts` y `preview.allowedHosts` en `vite.config.js`
  contienen `mihogar-t9ja.onrender.com` (necesario si corre vite dev/preview; el error
  "host not allowed" apareció porque el servicio corría vite sin bindear a `0.0.0.0`).

---

## 8. Comandos útiles

```bash
# desarrollo
npm install
npm run dev                       # vite en localhost:5173
npx vite --host                   # expone a la red local (probarla en iPhone)

# build
npm run build                     # tsc -b && vite build → dist/

# IA (Edge Functions)
npm run deploy:functions          # copia a temp sin espacios y despliega las 3 funciones
                                  # requiere SUPABASE_ACCESS_TOKEN en el entorno

# Supabase local (opcional, requiere Docker Desktop encendido manualmente)
npm run supabase:start
npm run supabase:db               # supabase db reset (aplica migraciones)

# producción local (mismo comportamiento que Render)
npm run start                     # node server.mjs en 0.0.0.0:$PORT (default 4173)
```

### Herramientas instaladas
- Deno en `C:\Users\LHENAO\.deno\bin\deno.exe` (v2.9.4) — requerido por la CLI de Supabase.
- **`gh` CLI no está instalada** en esta máquina (los pasos de GitHub se hacen a mano con git).
- Docker Desktop hay que abrirlo manualmente cuando se use el Supabase local.

---

## 9. Peculiaridades / gotchas

1. **Ruta con espacios** (`OneDrive - CONSENSUS SAS`): rompe `supabase functions deploy`
   directo → usar siempre `npm run deploy:functions`.
2. **Repo en carpeta Luis**: el `.git` está en `...\Documentos\Luis\` pero solo se
   versiona `mi-hogar-app/`. No agregar `C#/`, `NestJS/`, `Original Synergy Agent.json`,
   `Requerimientos_funcionales.md` (son proyectos/herramientas ajenos, sin trackear).
3. **Push Protection de GitHub**: si un commit contiene secretos se rechaza. Quitar el
   secreto del historial (amend/rebase) antes de reintentar.
4. **Modelo Gemini**: quedarse en `gemini-3.1-flash-lite` (ver historial en sección 4).
5. **Vite en producción**: no correr `npm run dev` en Render; usar el servidor estático.

---

## 10. Roadmap / ideas pendientes

- Código de barras (escáner) para agregar productos.
- Recordatorios/notificaciones de vencimientos.
- Múltiples hogares por usuario.
- Despliegue a Android con la misma base de código.
- Cambiar Render de Web Service a Static Site (ahorra el dyno).
- Cambiar script `dev` a `vite --host` (sugerido, no aplicado).

# 🏠 Mi Hogar — Asistente Inteligente del Hogar

Aplicación móvil tipo **PWA** (instalable en iPhone/Android gratis) para administrar el inventario y la lista de mercado de tu casa, con **inteligencia artificial (Gemini)** y **sincronización en tiempo real** entre todos los integrantes del hogar.

## ✨ Funcionalidades

- **Inventario inteligente**: agrega, edita, elimina productos con fotos o íconos, cantidades enteras, unidades configurables, stock mínimo, vencimiento y múltiples categorías.
- **Lista de mercado**: crea la lista, síguela en el supermercado y marca ✓ comprado → **el inventario se actualiza solo** (quién lo compró + fecha quedan registrados).
- **Asistente IA (Gemini)**:
  - 🍽️ Sugiere desayunos, almuerzos y cenas según lo que tienes en casa.
  - 🧾 Escanea la **factura del mercado** (foto o PDF) y agrega los productos al inventario.
  - 👨‍🍳 Pregunta qué cocinar con tus productos.
- **Tiempo real (patrón Observer)**: si alguien actualiza el inventario, todos lo ven al instante (Supabase Realtime).
- **Historial de actividad**: quién agregó, actualizó, eliminó o compró cada producto.
- **Perfil y hogar compartido**: varios usuarios con el mismo hogar (invitación por código), perfiles personalizables (nombre, foto, color).
- **Tema personalizable**: colores hex, acento, modo claro/oscuro y paletas.
- **Modo consulta offline**: sin Internet puedes ver el inventario y la lista; al volver la conexión todo se sincroniza.

## 🏗️ Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| PWA | vite-plugin-pwa (instalable, offline parcial) |
| Estado | Zustand |
| Backend / Auth / Realtime | Supabase (PostgreSQL + RLS + Realtime + Storage) |
| IA | Google Gemini (Edge Functions de Supabase) |

## 📁 Estructura

```
mi-hogar-app/
├── supabase/
│   ├── migrations/0001_init.sql   # esquema completo (tablas, RLS, realtime, seed)
│   └── functions/                 # Edge Functions de IA
│       ├── suggest-meals/
│       ├── ask-chef/
│       └── scan-receipt/
├── src/
│   ├── pages/                     # Auth, HomeSetup, Inventario, Lista, Asistente, Actividad, Perfil, Detalle
│   ├── components/                # UI (Modal, Avatar, ProductCard, formularios…)
│   ├── store/app.ts               # Zustand + suscripciones Realtime (Observer)
│   └── lib/                       # supabase client, gemini client, theme
├── scripts/gen-icons.mjs          # genera los íconos PNG de la PWA
└── .env                           # credenciales locales
```

## 🚀 Puesta en marcha

### 1. Requisitos

- Node.js 20+
- Una cuenta en [Supabase](https://supabase.com) (gratis)
- Una API key de [Google AI Studio](https://aistudio.google.com) (gratis)

### 2. Crear el proyecto en Supabase (nube)

1. Crea un proyecto nuevo en https://supabase.com/dashboard.
2. Ve a **SQL Editor** → pega el contenido de `supabase/migrations/0001_init.sql` → **Run**.
3. Ve a **Authentication → Sign In / Providers → Email** y desactiva **"Confirm email"** (opcional, recomendado para uso familiar).
4. En **Settings → API** copia el *Project URL* y la *Publishable key* y pégalos en tu `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxx
```

> El `.env` ya lo tienes creado con tus credenciales. El archivo `.env.example` es solo la plantilla.

### 3. Desplegar las funciones de IA

```bash
supabase login                       # abre el navegador para autenticarte
supabase link --project-ref TU_REF   # ref = el slug de tu URL (ej: bvtoblqljvsbtnqigtug)
supabase secrets set GEMINI_API_KEY=TU_CLAVE_DE_GEMINI
npm run deploy:functions             # despliega las 3 funciones de IA
```

> 💡 `npm run deploy:functions` copia las funciones a una ruta temporal sin espacios antes de
> desplegar. Es necesario en Windows cuando la carpeta del proyecto tiene espacios en el nombre
> (ej. `OneDrive - CONSENSUS SAS`), porque el empaquetador de la CLI falla con esos caminos.
> El script lee el `project-ref` de tu `.env` y necesita la variable `SUPABASE_ACCESS_TOKEN`
> (Personal Access Token).

### 4. Instalar dependencias y ejecutar

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Para probarla en tu iPhone desde la misma red, ejecuta:

```bash
npx vite --host
```

y abre la IP local en Safari del iPhone.

### 5. Instalar como app en el iPhone (PWA, gratis)

1. Abre la URL en **Safari**.
2. Toca **Compartir** (icono cuadrado con flecha) → **Añadir a pantalla de inicio**.
3. Se instalará como una app a pantalla completa.

## 🧪 Desarrollo local con Supabase (opcional)

Si prefieres desarrollar sin la nube, usa el stack local con Docker:

```bash
npm run supabase:start   # levanta todo (postgres, auth, storage, realtime, edge functions)
npm run supabase:db      # restablece la base de datos aplicando las migraciones
npm run supabase:functions
```

Luego coloca en `.env` las credenciales locales que imprime `supabase status`.

## 🧭 Funcionamiento interno

### Patrón Observer (tiempo real)

En `src/store/app.ts`, el store de Zustand se suscribe a los cambios de PostgreSQL vía Supabase Realtime:

- Tablas publicadas: `products`, `shopping_items`, `inventory_events`, `home_members`, `profiles`.
- Cualquier `INSERT/UPDATE/DELETE` dispara una recarga del store y **todas** las pantallas suscritas se actualizan al instante (misma vista en dispositivos distintos).

### Compra → Inventario automático

La función SQL `mark_purchased()` (vía RPC) marca el ítem como comprado y, en una sola transacción:

1. Incrementa la cantidad del producto relacionado (o crea el producto si no existía).
2. Registra quién lo compró y cuándo (`checked_by`, `purchased_at`).
3. Inserta un evento de auditoría.

### Auditoría

Triggers de base de datos insertan en `inventory_events` con `auth.uid()`, por lo que todo cambio queda trazado con el usuario real (no se puede falsificar desde el cliente).

### Seguridad (RLS)

Cada tabla tiene políticas por fila: un usuario solo ve/edita los datos de su hogar (`is_member`). La creación/unión a hogares se hace por RPC con código de invitación.

## 🗺️ Roadmap

- Código de barras (escáner) para agregar productos.
- Recordatorios/notificaciones de vencimientos.
- Múltiples hogares por usuario.
- Despliegue a Android con la misma base de código.

---

Hecho con ❤️ para tu hogar.

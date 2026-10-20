# NewCampApp - Plataforma PWA Club Deportivo

Aplicación Mobile-First desarrollada con **Next.js 15 (App Router, TypeScript, Tailwind CSS)** y **Supabase** para la administración de eventos deportivos, control de asistencia en tiempo real, lista de espera automática con concurrencia atómica, auditoría inmutable, encuestas MVP anónimas, estadísticas mutables (`JSONB`) y notificaciones Web Push vía VAPID.

---

## 🚀 Despliegue en Producción

- **Aplicación en Producción (Vercel):** [https://new-camp-app.vercel.app](https://new-camp-app.vercel.app)
- **Acceso / Login:** [https://new-camp-app.vercel.app/login](https://new-camp-app.vercel.app/login)
- **Repositorio GitHub:** [https://github.com/Aspirador4/NewCampApp](https://github.com/Aspirador4/NewCampApp)
- **Wiki en GitHub:** [https://github.com/Aspirador4/NewCampApp/wiki](https://github.com/Aspirador4/NewCampApp/wiki)

---

## 📚 Documentación Técnica (Wiki)

La documentación exhaustiva del proyecto está organizada en los siguientes módulos:

| Guía | Tema | Descripción |
| :--- | :--- | :--- |
| **[Índice General](docs/wiki/INDEX.md)** | Visión General | Introducción a la wiki técnica y principios de diseño mobile-first. |
| **[01. Arquitectura Técnica](docs/wiki/01_ARQUITECTURA_TECNICA.md)** | Stack & Estructura | Principios de diseño, enfoque mobile-first, PWA con Serwist y stack Next.js 15 + Supabase. |
| **[02. Base de Datos y RLS](docs/wiki/02_BASE_DE_DATOS_Y_MIGRACIONES.md)** | PostgreSQL & DDL | Catálogo de 9 tablas, índices de rendimiento, modelo `JSONB` mutable, RLS y funciones atómicas (RPCs). |
| **[03. Autenticación y Perfil](docs/wiki/03_AUTENTICACION_Y_PERFILES.md)** | Auth SSR & Storage | Flujo passwordless (Magic Link + Google OAuth), carga de avatares a Storage y renderizado dinámico de campos. |
| **[04. Modelo Financiero y Deudas](docs/wiki/04_MODELO_FINANCIERO_Y_DEUDAS.md)** | Finanzas de Partidos | Arquitectura de deudas por evento, costos fijos/prorrateados, cuenta corriente del socio y recibos de pago. |
| **[05. Eventos y Concurrencia](docs/wiki/05_MODULO_EVENTOS_Y_LISTA_ESPERA.md)** | Eventos & Cupos | Convocatorias, confirmación 1-click, lista de espera con auto-promoción atómica y auditoría inmutable. |
| **[06. Invitados y Moderación](docs/wiki/06_MODULO_INVITADOS_Y_MODERACION.md)** | Gestión de Invitados | Postulación de acompañantes externos por socios y centro administrativo de moderación 1-tap. |
| **[07. Sistema MVP y Estadísticas](docs/wiki/07_SISTEMA_MVP_Y_ESTADISTICAS.md)** | Votación & Ranking | Encuesta MVP post-partido anónima, prevención de autovoto, manejo de empates y podio olímpico con leaderboard. |
| **[08. PWA y Web Push](docs/wiki/08_PWA_Y_WEB_PUSH.md)** | Service Worker & Push | Instalación standalone en iOS/Android, Service Worker offline y notificaciones Web Push con VAPID. |

---

## 💻 Requisitos y Variables de Entorno

Copia el archivo `.env.example` a `.env.local` y configura las credenciales de Supabase y Web Push VAPID:

```bash
cp .env.example .env.local
```

Variables requeridas:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://qdscqskaridkcgfqzvej.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key

# Dominio de la Aplicación
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Claves Web Push VAPID
NEXT_PUBLIC_VAPID_PUBLIC_KEY=tu_vapid_public_key
VAPID_PRIVATE_KEY=tu_vapid_private_key
VAPID_SUBJECT=mailto:admin@clubdeportivo.com
```

---

## 🛠️ Scripts Disponibles

```bash
# Desarrollo local con Turbopack
npm run dev

# Compilación de producción
npm run build

# Iniciar servidor compilado
npm run start

# Análisis de código estático (ESLint)
npm run lint

# Sincronizar wiki hacia el repositorio de GitHub Wiki
npm run wiki:sync
```

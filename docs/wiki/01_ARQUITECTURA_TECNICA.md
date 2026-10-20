# 01. Arquitectura Técnica y Stack

Este documento detalla la estructura base, stack tecnológico y directrices de desarrollo para la plataforma del Club Deportivo.

---

## 1. Stack Tecnológico Seleccionado

| Capa | Tecnología | Versión | Rol en el Proyecto |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js (App Router) | 15.x | Server Components, Server Actions, optimización de bundles mobile y rutas API. |
| **Lenguaje** | TypeScript | 5.x | Tipado estricto para entidades de base de datos, props y acciones. |
| **Estilos & Iconos** | Tailwind CSS + Lucide | Tailwind v4, Lucide React | Enfoque utility-first, responsivo móvil, diseño limpio y sin sobrecarga gráfica. |
| **Backend & DB** | Supabase (PostgreSQL) | 17.x | Base de datos relacional, Auth SSR, Row Level Security (RLS) y almacenamiento S3 compatible. |
| **Auth** | Supabase Auth SSR | `@supabase/ssr` | Sesiones seguras sincronizadas por cookies HTTP-only en Server Components y Middleware. |
| **PWA & Push** | Web Push / Serwist | Serwist + VAPID | Notificaciones en segundo plano e instalación sin app stores. |

---

## 2. Estructura de Directorios del Proyecto

```text
CampApp/
├── .env.example                       # Plantilla de variables de entorno requeridas
├── .env.local                         # Variables locales activas (ignorado por Git)
├── PLAN_ARQUITECTURA.md               # Especificación funcional original
├── docs/
│   └── wiki/                          # Wiki técnica viva del proyecto
│       ├── INDEX.md
│       ├── 01_ARQUITECTURA_TECNICA.md
│       ├── 02_BASE_DE_DATOS_Y_MIGRACIONES.md
│       └── 03_AUTENTICACION_Y_PERFILES.md
├── src/
│   ├── app/                           # App Router de Next.js 15
│   │   ├── auth/                      # Callbacks y endpoints de autenticación
│   │   │   └── callback/route.ts
│   │   ├── login/                     # Página de inicio de sesión
│   │   ├── perfil/                    # Gestión de perfil y atributos dinámicos
│   │   ├── eventos/                   # Módulo de eventos (Fase 3)
│   │   ├── ranking/                   # Tabla de clasificación y estadísticas (Fase 5)
│   │   ├── globals.css                # Estilos globales de Tailwind
│   │   ├── layout.tsx                 # Layout Mobile-First centrado
│   │   └── page.tsx                   # Página de bienvenida / dashboard
│   ├── components/                    # Componentes modulares UI
│   │   ├── BottomNav.tsx              # Barra de navegación móvil inferior
│   │   ├── DynamicProfileFields.tsx   # Renderizador de inputs dinámicos JSONB
│   │   └── AvatarUpload.tsx           # Componente de carga y vista previa de foto
│   ├── middleware.ts                  # Middleware de refresco de sesión y protección de rutas
│   ├── types/
│   │   └── database.types.ts          # Tipos TypeScript generados para Supabase
│   └── utils/
│       └── supabase/
│           ├── client.ts              # Browser Client (Client Components)
│           ├── server.ts              # Server Client (Server Components / Actions)
│           └── middleware.ts          # Handler de sesión de middleware
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql     # Script DDL consolidado e idempotente
```

---

## 3. Principio Mobile-First PWA

La aplicación está diseñada para operar como una **Progressive Web App (PWA)** instalable tanto en iOS como en Android:
- **Viewport Configurado**: `width=device-width, initialScale=1, maximumScale=1, viewportFit=cover`.
- **Canvas Contenedor**: En pantallas grandes se renderiza un shell de smartphone centrado (`max-w-md`) para garantizar consistencia entre entornos.
- **Navegación**: Basada en tabs inferiores fijas (`BottomNav`), estándar ergonómico en dispositivos móviles.

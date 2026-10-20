# NewCampApp - Plataforma PWA Club Deportivo

Aplicación Mobile-First desarrollada con **Next.js 15 (App Router, TypeScript, Tailwind CSS)** y **Supabase** para la administración de eventos, control de asistencia en tiempo real, lista de espera automática, auditoría inmutable, encuestas MVP, estadísticas mutables y notificaciones Web Push.

## Documentación Técnica

La documentación detallada de arquitectura, esquemas relacionales, políticas RLS y guías de desarrollo se encuentra en:
- [Wiki Técnica del Proyecto](docs/wiki/INDEX.md)
- [Especificación de Arquitectura](PLAN_ARQUITECTURA.md)

## Requisitos de Entorno

Copia el archivo `.env.example` a `.env.local` y configura las credenciales de tu proyecto de Supabase:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Ejecución en Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador (o emulador de dispositivo móvil).

## Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo con Turbopack.
- `npm run build`: Genera el build de producción optimizado.
- `npm run start`: Inicia el servidor de producción.
- `npm run lint`: Ejecuta el análisis estático con ESLint.

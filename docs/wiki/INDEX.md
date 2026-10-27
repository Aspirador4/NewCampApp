# Wiki Técnica - Club Deportivo PWA

Bienvenido a la documentación técnica de la plataforma móvil para el Club Deportivo. Esta wiki centraliza las decisiones de arquitectura, guías de despliegue, modelos de datos, flujos de tesorería y gestión de socios.

---

## Índice de Documentos

| Documento | Descripción |
| :--- | :--- |
| [01. Arquitectura Técnica y Stack](./01_ARQUITECTURA_TECNICA.md) | Principios de diseño, enfoque mobile-first, PWA con Serwist y stack Next.js 15 + Supabase. |
| [02. Base de Datos, Esquemas y RLS](./02_BASE_DE_DATOS_Y_MIGRACIONES.md) | Catálogo de tablas, índices, modelo JSONB mutable, políticas RLS y funciones atómicas (RPCs). |
| [03. Autenticación, Admisión y Perfiles](./03_AUTENTICACION_Y_PERFILES.md) | Flujo SSR, Google OAuth, Gatekeeper de admisión con carta de motivación y optimización de fotos. |
| [04. Módulo Financiero y Liquidación](./04_MODELO_FINANCIERO_Y_DEUDAS.md) | Cierre financiero manual de partidos, cuotas personalizadas, tesorería administrativa y cuenta corriente. |
| [05. Eventos, Calendario y Lista de Espera](./05_MODULO_EVENTOS_Y_LISTA_ESPERA.md) | Convocatorias versátiles, exportación "Add to Calendar" (.ics y Google), auto-promoción y auditoría. |
| [06. Módulo de Invitados y Moderación](./06_MODULO_INVITADOS_Y_MODERACION.md) | Postulación de amigos externos, control de cupos y centro de moderación para administradores. |
| [07. Sistema MVP y Estadísticas](./07_SISTEMA_MVP_Y_ESTADISTICAS.md) | Votación democrática de MVP, prevención de autovoto, empates, tabla de líderes y cómputo de métricas (Partidos, MVPs, Votos y Juntadas). |
| [08. PWA y Notificaciones Unificadas](./08_PWA_Y_WEB_PUSH.md) | Instalación standalone, Service Worker, Buzón In-App con Realtime, Web Push VAPID segmentado y 11 disparadores automáticos. |
| [09. Directorio de Miembros y Roles](./09_ADMISION_DIRECTORIO_Y_ROLES.md) | Plantilla activa de jugadores, filtro táctil combo box por posición, asignación de roles de admin y cola de admisión sin blacklist. |
| [10. Arquitectura Multi-Club](./10_ARQUITECTURA_MULTICLUB.md) | Multi-tenancy a nivel de filas, selector de clubes, visibilidad pública/privada, buscador interactivo y admisión por slug. |
| [11. Sistema de Diseño Táctil y UX](./11_DISENO_Y_UX_MOBILE_FIRST.md) | Sistema "Athletic Clubhouse" (Neo-Brutalismo deportivo), Modo Oscuro nativo SSR anti-flash, tipografía auditada con Impeccable, 10 paletas dinámicas y ergonomía mobile-first. |

---

## Principios Fundamentales del Proyecto

1. **Funcionalidad y Certeza Operativa**: Lógica de negocio rigurosa y probada (cupos, lista de espera automática con control de concurrencia, liquidación financiera manual por partido y auditoría inmutable) antes del refinamiento cosmético.
2. **Mobile-First PWA**: La UI está optimizada de manera nativa para pantallas de smartphone (390px - 430px de ancho) con soporte para instalación standalone y Web Push VAPID sin tiendas de aplicaciones.
3. **Estructura Mutable (PostgreSQL + JSONB)**: Los campos de perfil, las estadísticas deportivas y los eventos sociales ("Otros") admiten expansión futura sin requerir migraciones DDL destructivas, utilizando columnas `JSONB` combinadas con tablas maestras de definición.
4. **Seguridad y Privacidad por Defecto**: Acceso bloqueado a la aplicación (Gatekeeper) para usuarios que no hayan sido formalmente admitidos por los administradores del club.

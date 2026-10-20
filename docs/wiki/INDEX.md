# Wiki Técnica - Club Deportivo PWA

Bienvenido a la documentación técnica de la plataforma móvil para el Club Deportivo. Esta wiki centraliza las decisiones de arquitectura, guías de despliegue, modelos de datos y flujos de desarrollo.

---

## Índice de Documentos

| Documento | Descripción |
| :--- | :--- |
| [01. Arquitectura Técnica y Stack](./01_ARQUITECTURA_TECNICA.md) | Principios de diseño, enfoque mobile-first, PWA con Serwist y stack Next.js 15 + Supabase. |
| [02. Base de Datos, Esquemas y RLS](./02_BASE_DE_DATOS_Y_MIGRACIONES.md) | Catálogo de tablas, índices, modelo JSONB mutable, políticas de seguridad RLS y funciones atómicas (RPCs). |
| [03. Autenticación y Perfil Dinámico](./03_AUTENTICACION_Y_PERFILES.md) | Flujo Supabase SSR, Magic Link, Google OAuth, upload a Storage y motor de atributos dinámicos. |
| [04. Módulo Financiero y Deudas](./04_MODELO_FINANCIERO_Y_DEUDAS.md) | Control de deudas por partido, costos fijos/prorrateados, cuenta corriente del socio y comprobantes. |
| [05. Eventos, Cupos y Lista de Espera](./05_MODULO_EVENTOS_Y_LISTA_ESPERA.md) | Convocatorias, confirmación 1-click, lógica de auto-promoción y auditoría de asistencia. |
| [06. Módulo de Invitados y Moderación](./06_MODULO_INVITADOS_Y_MODERACION.md) | Postulación de amigos externos, control de cupos y centro de moderación para administradores. |
| [07. Sistema MVP y Estadísticas](./07_SISTEMA_MVP_Y_ESTADISTICAS.md) | Votación democrática de MVP, prevención de autovoto, empates y tabla de líderes. |
| [08. PWA y Notificaciones Web Push](./08_PWA_Y_WEB_PUSH.md) | Instalación standalone, Service Worker, protocolo VAPID y disparadores push por eventos. |

---

## Principios Fundamentales del Proyecto

1. **Funcionalidad ante todo**: Lógica de negocio rigurosa y probada (cupos, lista de espera automática con control de concurrencia, votación MVP anónima y auditoría inmutable) antes del refinamiento cosmético.
2. **Mobile-First PWA**: La UI está optimizada de manera nativa para pantallas de smartphone (390px - 430px de ancho) con soporte para instalación standalone y Web Push VAPID sin tiendas de aplicaciones.
3. **Estructura Mutable (PostgreSQL + JSONB)**: Los campos de perfil y las estadísticas deportivas admiten expansión futura sin requerir migraciones DDL destructivas, utilizando columnas `JSONB` combinadas con tablas maestras de definición.

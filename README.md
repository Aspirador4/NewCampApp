# NewCampApp - Plataforma PWA Multi-Club Deportivo

Plataforma móvil PWA de alto rendimiento para la gestión integral de clubes deportivos amateurs y comunitarios. Desarrollada con **Next.js 15 (App Router, React 19, Turbopack, TypeScript)**, **Tailwind CSS v4** y **Supabase (PostgreSQL 17, Auth SSR, RLS)**, bajo el sistema de diseño propio **Athletic Clubhouse**.

---

## 🚀 Despliegue en Producción

- **Aplicación en Producción (Vercel):** [https://new-camp-app.vercel.app](https://new-camp-app.vercel.app)
- **Acceso / Iniciar Sesión:** [https://new-camp-app.vercel.app/login](https://new-camp-app.vercel.app/login)
- **Repositorio en GitHub:** [https://github.com/Aspirador4/NewCampApp](https://github.com/Aspirador4/NewCampApp)
- **Wiki Técnica Oficial:** [https://github.com/Aspirador4/NewCampApp/wiki](https://github.com/Aspirador4/NewCampApp/wiki)

---

## ✨ Características Principales

### 🏛️ Arquitectura Multi-Club
- **Aislamiento Multi-Tenancy**: Base de datos compartida con separación estricta por `club_id` en políticas RLS.
- **Selector de Clubes ("Mis Clubes")**: Los socios pueden pertenecer a múltiples clubes y alternar entre ellos al instante sin cerrar sesión.
- **Fichajes por Enlace**: Rutas dinámicas `/club/unirse/[slug]` para invitar e incorporar nuevos socios mediante solicitud formal.

### 🎫 Admisión, Gatekeeper y Pase Provisional
- **Protección Total de Convocatorias**: Los nuevos registrados permanecen en estado pendiente hasta ser aprobados por la directiva.
- **Pase Provisional Físico**: Formato ticket/credencial deportiva con recortes laterales, código de socio, carta de motivación breve (máx. 50 caracteres) y panel de reconsideración sin bloqueo permanente (evita listas negras).
- **Directorio de Plantilla**: Búsqueda reactiva, filtros por posición de cancha (*Arqueros, Defensas, Mediocampistas, Delanteros*) y fichas técnicas de jugadores con estadísticas acumuladas.

### ⚽ Eventos, Convocatorias y Concurrencia Atómica
- **Convocatorias Dinámicas**: Tipos de evento (*Fútbol 5/7/11, Pádel, Entrenamiento, Asado/Social*), límite de cupos y categoría por género (*Masculino, Femenino, Mixto*).
- **Lista de Espera con Auto-Promoción Atómica**: Bloqueo pesimista a nivel de fila (`FOR UPDATE`) en funciones PostgreSQL (RPC) que garantiza que las bajas promuevan al siguiente en lista sin condiciones de carrera.
- **Exportación a Calendario**: Descarga de archivo `.ics` universal o sincronización directa con Google Calendar en 1 toque.
- **Auditoría Inmutable**: Registro histórico de cada confirmación, baja, pago o cambio administrativo.

### 💰 Tesorería y Liquidación Financiera
- **Acta de Liquidación de Partido**: Cierre financiero formal post-partido con costo real de cancha, cálculo de saldo resultante y generación automática de deudas individuales.
- **Cuenta Corriente de Socios**: Saldo personal, registro de cuotas pendientes, historial de pagos y subida de comprobantes de transferencia.
- **Panel Administrativo de Finanzas**: Saldo consolidado del club, dossier interactivo de morosos con condonación táctil y configuración de datos bancarios.

### 👥 Gestión de Invitados y Moderación
- **Postulación de Acompañantes**: Los socios pueden inscribir amigos externos a las convocatorias.
- **Centro de Moderación 1-Tap**: Aprobación o rechazo administrativo con asignación automática de costo al socio anfitrión.

### 🏆 Sistema MVP Democrático y Estadísticas
- **Votación Anónima Post-Partido**: Urna digital democrática abierta tras el pitazo final.
- **Reglas de Integridad**: Prevención estricta de autovoto, cómputo automático y desempates en tiempo real.
- **Leaderboard y Podio Olímpico**: Clasificación acumulada de partidos jugados, MVPs ganados y votos recibidos.

### 🎨 Sistema de Diseño "Athletic Clubhouse" (Neo-Brutalismo Deportivo)
- **Cero Estética Genérica de IA**: Se eliminan gradientes púrpuras flotantes, fondos oscuros sin contraste y tarjetas desenfocadas.
- **Sensación Física y Masa**: Bordes sólidos de 2px (`border-2 border-neutral-900`), sombras de desplazamiento neto sin blur (`3px 3px 0px #171717`) y micro-interacciones mecánicas con respuesta táctil (`.btn-tactile` e `.input-tactile`).
- **Tipografía Triádica**: **Barlow Condensed** (`font-display`) para encabezados deportivos de alto impacto, **Geist Sans** (`font-sans`) para lectura limpia y **JetBrains Mono** (`font-mono`) para finanzas, marcadores y dorsales.
- **10 Paletas Oficiales Multi-Club**: Personalización gráfica por club (*Verde Cancha, Azul Marino, Azul Real, Carmesí, Vino Tinto, Dorado, Naranja, Teal, Púrpura y Carbono*) inyectadas dinámicamente mediante variables CSS.

### 📲 PWA Mobile-First y Notificaciones Push
- **Instalación Standalone**: Manifiesto web e iconos adaptativos para iOS y Android sin pasar por App Stores.
- **Web Push VAPID**: Alertas en tiempo real para convocatorias, ascensos desde lista de espera y recordatorios de pago.
- **Ergonomía Táctil**: Touch targets $\ge$ 44×44px, safe-area insets (`env(safe-area-inset-bottom)`) y teclados numéricos automáticos.

---

## 📚 Documentación Técnica (Wiki)

La arquitectura técnica completa se encuentra documentada en la carpeta [`docs/wiki/`](docs/wiki/) y sincronizada en la [Wiki de GitHub](https://github.com/Aspirador4/NewCampApp/wiki):

| Documento | Tema | Contenido Clave |
| :--- | :--- | :--- |
| **[Índice General](docs/wiki/INDEX.md)** | Visión General | Mapa de navegación técnica y principios fundamentales. |
| **[01. Arquitectura Técnica](docs/wiki/01_ARQUITECTURA_TECNICA.md)** | Stack & Estructura | Next.js 15 App Router, React 19, Supabase SSR, Serwist y directrices mobile-first. |
| **[02. Base de Datos y RLS](docs/wiki/02_BASE_DE_DATOS_Y_MIGRACIONES.md)** | PostgreSQL & DDL | Catálogo de tablas, índices de rendimiento, modelo `JSONB` mutable, RLS y RPCs atómicas. |
| **[03. Autenticación y Perfil](docs/wiki/03_AUTENTICACION_Y_PERFILES.md)** | Auth SSR & Gatekeeper | Google OAuth exclusivo, Pase Provisional con carta de motivación y atributos dinámicos. |
| **[04. Modelo Financiero y Deudas](docs/wiki/04_MODELO_FINANCIERO_Y_DEUDAS.md)** | Finanzas & Tesorería | Acta de liquidación de partidos, cuenta corriente de socios, dossier de morosos y datos bancarios. |
| **[05. Eventos y Concurrencia](docs/wiki/05_MODULO_EVENTOS_Y_LISTA_ESPERA.md)** | Convocatorias & Cupos | Auto-promoción con bloqueo pesimista en PostgreSQL, adición a calendario y auditoría. |
| **[06. Invitados y Moderación](docs/wiki/06_MODULO_INVITADOS_Y_MODERACION.md)** | Gestión de Invitados | Convocatoria de acompañantes externos, límites de cupos y moderación administrativa. |
| **[07. Sistema MVP y Estadísticas](docs/wiki/07_SISTEMA_MVP_Y_ESTADISTICAS.md)** | Votación & Ranking | Votación anónima post-partido, prevención de autovoto, empates y podio olímpico. |
| **[08. PWA y Web Push](docs/wiki/08_PWA_Y_WEB_PUSH.md)** | Service Worker & Push | Instalación standalone, ciclo de vida del Service Worker y notificaciones Push con VAPID. |
| **[09. Admisión, Miembros y Roles](docs/wiki/09_ADMISION_DIRECTORIO_Y_ROLES.md)** | Directorio & Roles | Plantilla activa de socios, filtros por posición deportiva, roles directivos y reconsideraciones. |
| **[10. Arquitectura Multi-Club](docs/wiki/10_ARQUITECTURA_MULTICLUB.md)** | Multi-Tenancy | Multi-tenancy por filas, membresías cruzadas, selector modal y onboarding por slug. |
| **[11. Sistema de Diseño Táctil y UX](docs/wiki/11_DISENO_Y_UX_MOBILE_FIRST.md)** | Athletic Clubhouse | Neo-Brutalismo deportivo, tipografía Barlow Condensed, botones e inputs táctiles y 10 paletas. |

---

## 💻 Configuración Local y Variables de Entorno

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Aspirador4/NewCampApp.git
   cd NewCampApp
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea el archivo de variables de entorno locales:
   ```bash
   cp .env.example .env.local
   ```

4. Define los valores en `.env.local`:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key

   # Dominio de la Aplicación
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Web Push VAPID
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=tu_vapid_public_key
   VAPID_PRIVATE_KEY=tu_vapid_private_key
   VAPID_SUBJECT=mailto:admin@clubdeportivo.com
   ```

---

## 🛠️ Scripts Disponibles

```bash
# Servidor de desarrollo con Turbopack
npm run dev

# Verificación de tipos TypeScript
npx tsc --noEmit

# Análisis estático de código
npm run lint

# Compilación optimizada para producción
npm run build

# Iniciar servidor compilado en producción
npm run start

# Sincronizar documentación docs/wiki/ hacia GitHub Wiki
npm run wiki:sync
```

---

## 📄 Licencia

Desarrollado para la gestión integral y moderna de comunidades deportivas. Todos los derechos reservados.

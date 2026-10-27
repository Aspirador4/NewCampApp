# 10. Arquitectura Multi-Club (Multi-Tenant a Nivel de Filas)

La plataforma CampApp ha evolucionado desde un modelo concebido para una única entidad deportiva a una arquitectura **Multi-Club / Multi-Tenant a nivel de filas** robusta y escalable.

---

## 1. Principios de Diseño Multi-Club

1. **Aislamiento a Nivel de Filas (Row-Level Multi-Tenancy)**:
   - Todas las entidades operativas (`events`, `profile_field_definitions`, `user_stats`, `member_debts`) están aisladas por la clave foránea `club_id`.
   - La seguridad está garantizada en PostgreSQL mediante políticas RLS (Row Level Security) que utilizan funciones `SECURITY DEFINER` para validar membresía y rol administrativo (`is_club_member`, `is_club_admin`).

2. **Perfiles Globales vs. Membresías Específicas**:
   - `profiles`: Representa la identidad global de un usuario (nombre, correo, avatar, teléfono, fecha de nacimiento, género).
   - `club_members`: Representa la relación y estado del usuario dentro de un club específico (`system_role`, `sports_role`, `approval_status`, `motivation`, `custom_attributes`, `joined_at`).
   - Un usuario puede pertenecer a múltiples clubes de manera simultánea, pudiendo ser Administrador en uno y Socio regular en otro.

3. **Migración Idempotente y Cero Pérdida de Datos**:
   - La migración inicial crea automáticamente el `Club Principal` (`slug = 'club-principal'`).
   - Vincula automáticamente todos los usuarios existentes, eventos históricos, deudas financieras y configuraciones bancarias a este club base.

---

## 2. Tablas y Modelo de Datos

### Tabla `clubs`
```sql
CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  description text,
  is_private boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```
- `settings`: Almacena la configuración particular del club (ej. datos de transferencia bancaria `bank_details`, esquemas de color, etc.).

### Tabla `club_members`
```sql
CREATE TABLE public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  system_role text NOT NULL DEFAULT 'member' CHECK (system_role IN ('admin', 'member')),
  sports_role text NOT NULL DEFAULT 'jugador' CHECK (sports_role IN ('jugador', 'hincha', 'ambos')),
  approval_status text NOT NULL DEFAULT 'pendiente' CHECK (approval_status IN ('pendiente', 'aprobado', 'rechazado')),
  motivation text,
  custom_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT club_members_club_user_key UNIQUE (club_id, user_id)
);
```

---

## 3. Selector de Club (Club Switcher) y Contexto de Sesión

- **Cookie `camp_club_id`**: Persiste el identificador del club activo seleccionado por el usuario.
- **Resolución Automática**:
  1. Si existe cookie `camp_club_id` y el usuario pertenece a dicho club, se activa dicho contexto.
  2. Si no, se selecciona el primer club donde el usuario sea socio aprobado.
  3. En caso de no contar con membresías activas, se activa el club por defecto (`club-principal`).
- **Navegación**:
  - Selector accesible en la cabecera móvil (`ClubSwitcher`).
  - Creación de nuevo club en `/club/nuevo`. El creador pasa a ser el primer `admin` de forma automática.
  - **Carga de Escudo / Emblema**:
    - Admite subida directa de archivos (PNG, JPG, WebP, SVG hasta 5MB) alojados en el bucket público `club-logos` en Supabase Storage.
    - Compresión optimizada en el cliente antes de la subida para ahorrar ancho de banda.
    - Soporte híbrido para enlazar una URL web externa si el escudo ya se encuentra alojado online.
    - Tarjeta táctil de vista previa en tiempo real con las iniciales o el logo sobre el degradado de la paleta seleccionada.
  - **Edición y Personalización de Clubes (`/club/editar`)**:
    - Interfaz con pestañas táctiles: **"Identidad & Escudo"** y **"Colores del Club"**.
    - Permite a los administradores actualizar el Nombre Oficial, Identificador (Slug), Lema/Descripción y el Escudo (subida a Storage o URL web).
    - Selector dinámico de las 10 paletas de color institucionales (desacopladas de Finanzas y centralizadas en la gestión del club).
    - Tarjeta de Vista Previa de Marca (*Brand Preview*) con degradado dinámico e insignias en tiempo real.
    - Puntos de entrada para administradores en `ClubSwitcher`, ficha del socio (`/perfil`), barra superior del Home (`/`) y modal de finanzas.
  - Exploración y admisión en `/club/unirse` y `/club/unirse/[slug]`.

---

## 4. Funciones Auxiliares de Seguridad (RLS)

- `is_club_member(p_club_id UUID, p_user_id UUID) RETURNS boolean`:
  Verifica si el usuario cuenta con registro en `club_members` en estado `'aprobado'`.
- `is_club_admin(p_club_id UUID, p_user_id UUID) RETURNS boolean`:
  Verifica si el usuario cuenta con registro en `club_members` en estado `'aprobado'` y rol `'admin'`.
- `is_event_club_admin(p_event_id UUID, p_user_id UUID) RETURNS boolean`:
  Comprueba si el usuario es administrador del club al que pertenece el evento.

---

## 5. Notificaciones Web Push en Contexto Multi-Club

Para asegurar que un socio identifique inmediatamente a qué club corresponde una alerta, las funciones de envío en `Server Actions` incorporan el prefijo del club:
- Ejemplo: `[Los Pioneros FC] ¡Bienvenido al Club! 🎉`
- Ejemplo: `[Club Principal] ¡Subiste de Lista de Espera! ⚽`
- Ejemplo: `[Club Principal] ¡Vota al MVP del Partido! 🏆`

---

## 6. Visibilidad de Clubes y Directorio de Exploración

La plataforma permite a los clubes definir su política de descubrimiento para equilibrar la captación abierta con la privacidad de grupos cerrados:

### A. Modos de Visibilidad (`is_private`)
* **🌐 Club Público (`is_private = false`)**:
  * Aparece en el catálogo y buscador general de la plataforma (`/club/unirse`).
  * Cualquier usuario puede consultar su ficha, lema, colores y cantidad de miembros.
  * Permite solicitar admisión mediante el Pase Provisional.
* **🔒 Club Privado (`is_private = true`)**:
  * Queda **100% oculto** de las búsquedas y del listado del directorio.
  * Exclusivamente accesible para personas que cuenten con el enlace o código slug directo de invitación (`/club/unirse/[slug]`).
  * Protege la privacidad de ligas de empresas o grupos cerrados de amigos.

### B. Gestión Administrativa
* **Fundación de Club (`/club/nuevo`)**: Selector Neo-Brutalista táctil donde el fundador define la visibilidad inicial antes de confirmar.
* **Edición de Identidad (`/club/editar`)**: Los administradores pueden cambiar la visibilidad de su club en cualquier momento desde la pestaña *"Identidad & Escudo"*.
* **Tarjeta de Previsualización en Vivo**: Muestra la insignia correspondiente (`Público` o `Privado`) en tiempo real mientras se configuran los datos.

### C. Buscador y Directorio Interactivo (`/club/unirse`)
* Desarrollado con el componente cliente `ClubDirectoryExplorer`:
  * **Búsqueda reactiva instantánea**: Filtrado en memoria sin recargas por nombre, slug o descripción.
  * **Filtro estricto**: La consulta en Supabase excluye clubes privados (`.neq('is_private', true)`).
  * **Atajo para Enlaces Privados**: Caja de acceso rápido *"¿Tienes un código o enlace privado?"* que permite introducir directamente el slug o pegar la URL completa para acceder a la ficha de postulación de un club oculto.
* **Ficha de Fichaje (`/club/unirse/[slug]`)**: Encabezado oficial con etiqueta visual identificatoria (`🌐 Público` o `🔒 Privado`).

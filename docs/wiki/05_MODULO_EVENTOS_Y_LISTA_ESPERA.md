# 05. Módulo de Eventos, Cupos y Lista de Espera Automática

Especificación funcional y técnica de la convocatoria de partidos, control estricto de cupos, gestión de lista de espera con auto-promoción atómica y bitácora de auditoría inmutable.

---

## 1. Principio de Concurrencia y Auto-Promoción

En grupos de fútbol y deportes de club, las bajas de último minuto ocurren frecuentemente. Para evitar la desorganización de los cupos y la intervención manual de los administradores:
1. Si un evento tiene `max_capacity` definido y se llena, los socios que confirmen a continuación entran automáticamente con estado `lista_espera`.
2. Cuando cualquier jugador confirmado se baja (acción `bajo` en auditoría):
   - Su estado cambia a `cancelado`.
   - El procedimiento almacenado atómico `leave_event` selecciona al primer socio en lista de espera por orden de registro (`registered_at ASC`), bloqueando la fila con `FOR UPDATE SKIP LOCKED`.
   - Dicho jugador asciende inmediatamente a `confirmado` (`action = 'subio_espera'`).
   - Se retorna el ID del usuario promovido para disparar la notificación Web Push.

```mermaid
stateDiagram-v2
    [*] --> NoRegistrado
    NoRegistrado --> Confirmado : Cupos disponibles (join_event)
    NoRegistrado --> ListaEspera : Cupos llenos (join_event)
    Confirmado --> Cancelado : Baja voluntaria (leave_event)
    ListaEspera --> Confirmado : Auto-promoción por vacante (leave_event)
    ListaEspera --> Cancelado : Salida voluntaria
```

---

## 2. Tipología, Categorías de Género y Versatilidad de Eventos

La plataforma simplifica la organización reduciendo los tipos principales a tres, con máxima flexibilidad:

1. **Partidos (`partido`)**:
   - Convocatoria deportiva estándar.
   - Permite especificar el **costo total de la cancha** y calcula el prorrateo automático sobre la capacidad máxima convocada (ej: Cancha $42.000 ÷ 14 cupos = ~$3.000 p/jugador), permitiendo a los socios conocer la cuota aproximada antes de inscribirse.
   - Al finalizar, es el **único tipo de evento que habilita la votación democrática de MVP**.
2. **Entrenamientos (`entrenamiento`)**:
   - Soporta especificar tanto el **costo total de la sesión** como una **cuota fija por jugador**.
3. **Otros Eventos Mutables (`otro`)**:
   - Diseñado para juntas, asados, asambleas de directorio o eventos sociales.
   - **Campos Dinámicos (`custom_fields` JSONB)**: Permite a los organizadores agregar o quitar campos arbitrarios al vuelo (ej: *"Cuota Asado"*, *"Encargado de Bebidas"*, *"Parrilla"*), adaptándose a cualquier necesidad del club sin modificar esquemas SQL.

### Categoría de Género del Evento (`gender_category`)
Al crear un evento, el convocante define la modalidad:
- `mixto` (👫 Mixto): Abierto a todos los socios registrados sin distinción.
- `masculino` (👨 Masculino): Exclusivo para socios con género masculino configurado en su perfil.
- `femenino` (👩 Femenino): Exclusivo para socias con género femenino configurado en su perfil.

**Validación de Inscripción**: En [`toggleEventAttendance`](../../src/app/eventos/actions.ts), si el evento es categorizado (`masculino` o `femenino`), se exige que el socio tenga definido su género en su perfil y que este coincida con la categoría del evento. En caso contrario, se bloquea la inscripción con un mensaje informativo guiando al socio a completar su perfil.

### Convocatorias y Moderación
- **Atribución de Creador**: Cada evento muestra claramente quién lo convocó en la cabecera.
- **Aprobación de Eventos**: Si un socio no-administrador crea un evento, este queda en estado `pendiente_aprobacion` hasta que un administrador lo revise y autorice.
- **Ciclo de Estados Simplificado**: Se eliminó el botón intermedio *"Iniciar Partido"*. Las convocatorias pasan directamente de `convocado` a `finalizado` (abriendo el cierre financiero y el MVP en partidos) o `cancelado`.

---

## 3. Utilidades de Convocatoria Móvil

### 1. Botón "Add to Calendar" ([`AddToCalendarButton.tsx`](../../src/components/AddToCalendarButton.tsx))
Ubicado en la cabecera del detalle de cada evento, permite agendar el partido con un toque:
- **Google Calendar**: Construye una URL con codificación `action=TEMPLATE` incluyendo título, descripción, ubicación y marcas horarias ISO en formato UTC.
- **Apple Calendar / Outlook (`.ics`)**: Genera y descarga un archivo estándar `iCalendar` (RFC 5545) compatible de forma nativa con iPhone (iOS Calendar), Mac y clientes de escritorio.

### 2. Compartir Convocatoria ([`ShareEventButton.tsx`](../../src/components/ShareEventButton.tsx))
- En dispositivos móviles utiliza la **Web Share API** nativa (`navigator.share`) para compartir directamente por **WhatsApp**, Telegram o Mensajes con un resumen formateado del partido (lugar, fecha, costo por jugador y cupos disponibles).
- En navegadores de escritorio cuenta con fallback automático para copiar el enlace y texto al portapapeles.

---

## 4. Componentes y Flujos de Pantalla

| Ruta | Componente | Función |
| :--- | :--- | :--- |
| `/eventos` | [`EventosPage`](../../src/app/eventos/page.tsx) | Feed mobile de eventos con filtros (Partidos, Asados, Entrenamientos, Finalizados) y barras de progreso de cupos. |
| `/eventos/nuevo` | [`NuevoEventoPage`](../../src/app/eventos/nuevo/page.tsx) | Formulario restringido a administradores para convocar eventos con fecha, hora, lugar y cupo máximo. |
| `/eventos/[id]` | [`EventDetailPage`](../../src/app/eventos/[id]/page.tsx) | Ficha del evento con botón 1-click CTA, listado de confirmados, lista de espera ordenada y auditoría. |
| Componente | [`EventAttendanceCTA`](../../src/components/EventAttendanceCTA.tsx) | Control interactivo móvil con confirmación 1-click, advertencia de lista de espera y modal de baja. |
| Componente | [`EventAdminControls`](../../src/components/EventAdminControls.tsx) | Botones rápidos para que los administradores aprueben convocatorias, finalicen o cancelen el evento. |

---

## 5. Bitácora de Auditoría Inmutable (`event_attendance_logs`)

Todos los movimientos quedan registrados de manera append-only:
- `confirmo`: El socio confirmó su presencia.
- `bajo`: El socio se bajó voluntariamente (con motivo opcional).
- `entro_espera`: El socio quedó en lista de espera por cupo lleno.
- `subio_espera`: El socio ascendió automáticamente por liberación de cupo.
- `solicito_invitado`: Se solicitó un invitado externo.
- `invitado_aprobado`: El administrador aprobó al invitado.
- `invitado_rechazado`: El administrador rechazó la solicitud.

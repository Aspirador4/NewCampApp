# 07. Sistema de Encuestas MVP y Motor de Estadísticas

Especificación funcional del flujo post-partido para la elección democrática del jugador del partido (MVP), reglas anti-autovoto, resolución de empates compartidos y agregación de métricas en la tabla de líderes.

---

## 1. Reglas de Votación MVP

1. **Exclusividad para Partidos (`event_type = 'partido'`)**:
   - La votación de MVP aplica **únicamente a partidos**.
   - Los eventos de entrenamiento, juntas, asados o sociales no habilitan votación de MVP, no renderizan la sección interactiva en la vista de detalle y no disparan notificaciones de votación al ser finalizados.
2. **Apertura de la Convocatoria de Voto**:
   - Al concluir el encuentro, el administrador presiona **"Finalizar y Abrir MVP"**.
   - Se activa la bandera `mvp_voting_open = true` y se establece un plazo límite de 24 horas (`mvp_voting_deadline`).
   - Se despacha notificación Web Push a los jugadores confirmados.
3. **Elegibilidad**:
   - **Votantes**: Únicamente los socios con estado `confirmado` que participaron del partido.
   - **Candidatos**: Únicamente los demás jugadores confirmados del partido.
   - **Anti-Autovoto**: Deshabilitado en la interfaz (se filtra al usuario actual) y reforzado en PostgreSQL mediante la restricción:
     ```sql
     CONSTRAINT mvp_votes_no_self_vote CHECK (voter_id <> voted_player_id)
     ```
   - **Voto Único**: Se restringe a un voto por socio por evento:
     ```sql
     CONSTRAINT mvp_votes_event_voter_key UNIQUE (event_id, voter_id)
     ```
4. **Anonimato**:
   - Durante la ventana abierta, los votos son anónimos. Ningún usuario ni administrador puede ver el desglose en vivo para evitar sesgos.
5. **Cierre y Computación Atómica (`finalize_event_mvp` / `close_event_and_elect_mvp`)**:
   - Al cumplirse el plazo o cerrarse manualmente por un admin:
     - Se calcula el jugador o jugadores con la mayor cantidad de votos (`max_votes`).
     - **Empates**: Si dos o más jugadores empatan en el primer puesto, ambos reciben el galardón y comparten el MVP.
     - Se incrementa `mvp_count = mvp_count + 1` en `user_stats`.
     - Se incrementa `mvp_votes_received` por los votos recibidos por cada candidato.
     - **Cómputo de Presencias y Juntadas**:
       - Si el evento es de tipo **`partido`** o **`torneo`**: Se incrementa `matches_played = matches_played + 1` a todos los jugadores confirmados.
       - Si el evento es de tipo **`asado`**, **`entrenamiento`** u **`otro`**: Se incrementa `social_events_attended = social_events_attended + 1` (**Juntadas**) para reconocer la vida social e institucional del club.
     - Los resultados y el desglose de votos se hacen públicos en el resumen del partido.

---

## 2. Tabla de Líderes / Leaderboard (`/ranking`)

La pantalla móvil de ranking expone dos vistas clave:
- **Ranking MVP**: Clasificación ordenada por `mvp_count DESC`, desempate por `mvp_votes_received DESC`, y luego por `matches_played DESC`.
- **Más Presencias**: Reconocimiento a los socios con mayor compromiso de asistencia (`matches_played DESC`).
- **Podio Mobile**: Diseño con los puestos #1 (Oro), #2 (Plata) y #3 (Bronce).

---

## 3. Planillero en Vivo, Marcador Realtime y Gráficas de Redes

A partir de la versión v2.5+, se incorporó el ecosistema integral de seguimiento de partidos a pie de cancha inspirado en la dinámica de fútbol amateur:

### A. Consola "Planillero en Vivo" (`LiveMatchTrackerModal.tsx`)
* **Control de Acceso Estricto**: Únicamente accesible por administradores de club aprobados o por el creador del evento (`canManageEvent = isAdmin || isCreator`).
* **Cronómetro Persistente con Delta Real**: Almacena el timestamp de inicio (`startedAt`) y tiempo acumulado en `localStorage`. Si el celular del planillero se bloquea o apaga la pantalla, el tiempo transcurrido no se desajusta ni se reinicia. Incluye controles de inicio/pausa, reinicio y salto rápido de **+1 minuto**.
* **Marcaje Táctil de Acciones**:
  * Botones rápidos (+ / −) por cada jugador para **Goles (⚽)**, **Asistencias (🎯)** y **Atajadas (🧤)** (con resalte en los arqueros).
  * Al marcar un gol, el marcador del equipo se actualiza inmediatamente en pantalla y emite vibración háptica en smartphones compatibles.
* **Línea de Tiempo y Botón Deshacer (Undo)**:
  * Bitácora cronológica con minuto y descripción (ej. `14:20 ⚽ Gol de Chochi (Equipo Blanco)`).
  * Botón **"↩ Deshacer"** que revierte el último evento, restando la métrica y reajustando el marcador al instante.
* **Sincronización en Vivo y Resumen WhatsApp**:
  * **"Sincronizar en Vivo"**: Persiste los goles en `event_teams` y dispara el evento de transmisión en tiempo real.
  * **"Copiar para WhatsApp"**: Genera el reporte formateado con emojis listo para enviar al grupo de chat del club.
  * **"Finalizar Partido"**: Guarda el marcador oficial, computa las estadísticas de jugadores en `user_stats`, marca el estado del partido como `finalizado` y activa la votación del MVP.

### B. Marcador en Vivo para Miembros (Supabase Realtime)
* Configurado a través de `EventRealtimeListener.tsx` y `MatchTeamsView.tsx`.
* Cualquier miembro o espectador que consulte `/eventos/[id]` mientras el partido está en juego observará una insignia pulsante **`🔴 EN VIVO`** y verá cómo los números del marcador cambian automáticamente en tiempo real sin necesidad de refrescar la página.

### C. Generador de Gráficas para Redes (`MatchGraphicModal.tsx`)
* Motor de renderizado en **Canvas HTML5** accesible para todos los socios del club:
  * **Modo Nómina (Pre-partido)**: Alineación visual de ambas escuadras con nombres, dorsales, posiciones, fecha y cancha.
  * **Modo Resultado (Post-partido)**: Marcador final destacado, escudos y listado detallado de goleadores.
* **Formatos Nativos**:
  * **Historia de Instagram**: 1080 × 1920 px (9:16 vertical).
  * **Post / Feed**: 1080 × 1080 px (1:1 cuadrado).
* **Exportación**:
  * Descarga directa en archivo **PNG**.
  * Botón **Compartir** que activa el diálogo nativo del sistema operativo móvil (`navigator.share`) para subir directamente a Instagram Stories o WhatsApp.

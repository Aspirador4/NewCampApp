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

-- 009_fix_join_event_and_unique_constraint.sql
-- Drop obsolete 2-argument join_event to avoid PostgREST ambiguity and ensure atomic upsert on re-joining

ALTER TABLE public.event_attendance_logs DROP CONSTRAINT IF EXISTS event_attendance_logs_action_check;
ALTER TABLE public.event_attendance_logs ADD CONSTRAINT event_attendance_logs_action_check 
  CHECK (action = ANY (ARRAY[
    'confirmo'::text, 
    'confirmo_espectador'::text,
    'bajo'::text, 
    'entro_espera'::text, 
    'subio_espera'::text, 
    'solicito_invitado'::text, 
    'invitado_aprobado'::text, 
    'invitado_rechazado'::text
  ]));

DROP FUNCTION IF EXISTS public.join_event(uuid, uuid);

CREATE OR REPLACE FUNCTION public.join_event(
  p_event_id uuid, 
  p_user_id uuid,
  p_attendance_type text DEFAULT 'jugador'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event record;
  v_confirmed_count integer;
  v_approved_guests_count integer;
  v_target_status text;
  v_action text;
  v_existing_status text;
  v_existing_type text;
  v_type text := COALESCE(p_attendance_type, 'jugador');
  v_promoted_user_id uuid := NULL;
BEGIN
  -- 1. Get event details
  SELECT * INTO v_event
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado';
  END IF;

  IF v_event.status NOT IN ('convocado', 'en_curso') THEN
    RAISE EXCEPTION 'El evento ya no acepta inscripciones';
  END IF;

  -- 2. Ensure user is an approved member of this club
  IF NOT public.is_club_member(v_event.club_id, p_user_id) THEN
    RAISE EXCEPTION 'Debes ser un socio aprobado de este club para inscribirte';
  END IF;

  -- 3. Check existing attendance record
  SELECT status, attendance_type INTO v_existing_status, v_existing_type
  FROM public.event_attendees
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- 4. Calculate capacity if joining as jugador
  IF v_type = 'espectador' THEN
    v_target_status := 'confirmado';
    v_action := 'confirmo_espectador';

    -- If user was previously confirmed as a player and is now switching to spectator,
    -- promote the first person from the waitlist
    IF v_existing_status = 'confirmado' AND v_existing_type = 'jugador' THEN
      SELECT a.user_id INTO v_promoted_user_id
      FROM public.event_attendees a
      WHERE a.event_id = p_event_id AND a.status = 'lista_espera'
      ORDER BY a.registered_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

      IF v_promoted_user_id IS NOT NULL THEN
        UPDATE public.event_attendees
        SET status = 'confirmado', attendance_type = 'jugador'
        WHERE event_id = p_event_id AND user_id = v_promoted_user_id;

        INSERT INTO public.event_attendance_logs (event_id, user_id, actor_id, action, reason)
        VALUES (p_event_id, v_promoted_user_id, p_user_id, 'subio_espera', 'Promovido automáticamente por cambio a espectador');
      END IF;
    END IF;

  ELSE
    -- Joining as jugador: count confirmed players (excluding oneself if switching)
    SELECT count(*) INTO v_confirmed_count
    FROM public.event_attendees
    WHERE event_id = p_event_id 
      AND status = 'confirmado' 
      AND attendance_type = 'jugador'
      AND user_id <> p_user_id;

    -- Count approved regular guests
    SELECT count(*) INTO v_approved_guests_count
    FROM public.event_guests
    WHERE event_id = p_event_id 
      AND status = 'aprobado' 
      AND is_overcapacity IS FALSE;

    IF v_event.max_capacity IS NULL OR (v_confirmed_count + v_approved_guests_count) < v_event.max_capacity THEN
      v_target_status := 'confirmado';
      v_action := 'confirmo';
    ELSE
      v_target_status := 'lista_espera';
      v_action := 'entro_espera';
    END IF;
  END IF;

  -- 5. Atomic Upsert with explicit ON CONFLICT (event_id, user_id)
  INSERT INTO public.event_attendees (event_id, user_id, status, attendance_type, registered_at)
  VALUES (p_event_id, p_user_id, v_target_status, v_type, now())
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET 
    status = v_target_status, 
    attendance_type = v_type, 
    registered_at = now();

  -- 6. Audit log
  INSERT INTO public.event_attendance_logs (event_id, user_id, actor_id, action)
  VALUES (p_event_id, p_user_id, p_user_id, v_action);

  RETURN jsonb_build_object(
    'success', true, 
    'status', v_target_status, 
    'attendance_type', v_type,
    'promoted_user_id', v_promoted_user_id
  );
END;
$$;

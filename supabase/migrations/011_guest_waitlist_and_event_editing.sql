-- 011_guest_waitlist_and_event_editing.sql
-- 1. Allow 'lista_espera' in event_guests
ALTER TABLE public.event_guests DROP CONSTRAINT IF EXISTS event_guests_status_check;
ALTER TABLE public.event_guests ADD CONSTRAINT event_guests_status_check 
  CHECK (status = ANY (ARRAY['pendiente_aprobacion'::text, 'aprobado'::text, 'lista_espera'::text, 'rechazado'::text]));

-- 2. Allow 'invitado_espera' in event_attendance_logs
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
    'invitado_espera'::text, 
    'invitado_rechazado'::text
  ]));

-- 3. Unified Waitlist Promotion Function
CREATE OR REPLACE FUNCTION public.promote_waitlist(
  p_event_id uuid, 
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event record;
  v_confirmed_attendees integer;
  v_approved_guests integer;
  v_total_confirmed integer;
  v_candidate record;
  v_actual_actor_id uuid := p_actor_id;
BEGIN
  -- Validate actor exists in profiles or set to NULL
  IF v_actual_actor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actual_actor_id) THEN
    v_actual_actor_id := NULL;
  END IF;

  -- Acquire exclusive row lock on the event to guarantee atomic evaluation & promotion
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evento no encontrado');
  END IF;

  -- If event has max_capacity, verify there is an available slot
  IF v_event.max_capacity IS NOT NULL THEN
    SELECT count(*) INTO v_confirmed_attendees
    FROM public.event_attendees
    WHERE event_id = p_event_id 
      AND status = 'confirmado' 
      AND (attendance_type IS NULL OR attendance_type = 'jugador');

    SELECT count(*) INTO v_approved_guests
    FROM public.event_guests
    WHERE event_id = p_event_id 
      AND status = 'aprobado' 
      AND NOT COALESCE(is_overcapacity, false);

    v_total_confirmed := COALESCE(v_confirmed_attendees, 0) + COALESCE(v_approved_guests, 0);
    IF v_total_confirmed >= v_event.max_capacity THEN
      RETURN jsonb_build_object('success', false, 'promoted', false, 'reason', 'No hay cupos disponibles');
    END IF;
  END IF;

  -- Find earliest entry in waitlist across attendees and guests
  SELECT * INTO v_candidate
  FROM (
    SELECT 
      'attendee'::text AS kind,
      a.id AS entry_id,
      a.user_id,
      NULL::uuid AS guest_id,
      a.registered_at AS queue_time,
      p.full_name AS display_name,
      NULL::uuid AS inviter_id
    FROM public.event_attendees a
    JOIN public.profiles p ON p.id = a.user_id
    WHERE a.event_id = p_event_id AND a.status = 'lista_espera'

    UNION ALL

    SELECT 
      'guest'::text AS kind,
      g.id AS entry_id,
      NULL::uuid AS user_id,
      g.id AS guest_id,
      g.created_at AS queue_time,
      g.guest_name AS display_name,
      g.invited_by_user_id AS inviter_id
    FROM public.event_guests g
    WHERE g.event_id = p_event_id 
      AND g.status = 'lista_espera' 
      AND NOT COALESCE(g.is_overcapacity, false)
  ) w
  ORDER BY queue_time ASC
  LIMIT 1;

  IF v_candidate IS NULL THEN
    RETURN jsonb_build_object('success', true, 'promoted', false);
  END IF;

  IF v_candidate.kind = 'attendee' THEN
    UPDATE public.event_attendees
    SET status = 'confirmado', attendance_type = 'jugador'
    WHERE event_id = p_event_id AND user_id = v_candidate.user_id;

    INSERT INTO public.event_attendance_logs (event_id, user_id, actor_id, action, reason)
    VALUES (p_event_id, v_candidate.user_id, v_actual_actor_id, 'subio_espera', 'Promovido automáticamente por cupo disponible');

    RETURN jsonb_build_object(
      'success', true,
      'promoted', true,
      'kind', 'attendee',
      'user_id', v_candidate.user_id,
      'user_name', v_candidate.display_name
    );
  ELSE
    UPDATE public.event_guests
    SET status = 'aprobado'
    WHERE id = v_candidate.guest_id;

    INSERT INTO public.event_attendance_logs (event_id, user_id, actor_id, action, reason)
    VALUES (p_event_id, v_candidate.inviter_id, v_actual_actor_id, 'subio_espera', 'Invitado promovido automáticamente: ' || v_candidate.display_name);

    RETURN jsonb_build_object(
      'success', true,
      'promoted', true,
      'kind', 'guest',
      'guest_id', v_candidate.guest_id,
      'guest_name', v_candidate.display_name,
      'inviter_id', v_candidate.inviter_id
    );
  END IF;
END;
$$;

-- 4. Update leave_event to use unified promote_waitlist
CREATE OR REPLACE FUNCTION public.leave_event(
  p_event_id uuid,
  p_user_id uuid,
  p_actor_id uuid,
  p_reason text DEFAULT 'Baja voluntaria'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_status text;
  v_current_type text;
  v_promotion jsonb := '{"promoted": false}'::jsonb;
BEGIN
  -- 0. Acquire exclusive row lock on event to serialize unregistrations and waitlist promotions
  PERFORM 1 FROM public.events WHERE id = p_event_id FOR UPDATE;

  -- Check current attendance
  SELECT status, attendance_type INTO v_current_status, v_current_type
  FROM public.event_attendees
  WHERE event_id = p_event_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscripción no encontrada';
  END IF;

  -- 1. Remove player from event_team_players if they were assigned to a team
  DELETE FROM public.event_team_players
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- 2. Mark attendance as cancelado
  UPDATE public.event_attendees
  SET status = 'cancelado', registered_at = now()
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- 3. Audit log
  INSERT INTO public.event_attendance_logs (event_id, user_id, actor_id, action, reason)
  VALUES (p_event_id, p_user_id, p_actor_id, 'bajo', p_reason);

  -- 4. If cancelled user was a confirmed player, promote next person from unified waitlist
  IF v_current_status = 'confirmado' AND (v_current_type IS NULL OR v_current_type = 'jugador') THEN
    v_promotion := public.promote_waitlist(p_event_id, p_actor_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'promotion', v_promotion,
    'promoted_user_id', v_promotion->>'user_id',
    'promoted_user_name', v_promotion->>'user_name'
  );
END;
$$;

-- 5. Update join_event to use unified promote_waitlist when switching to spectator
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
  v_promotion jsonb := '{"promoted": false}'::jsonb;
BEGIN
  -- 1. Get event details with EXCLUSIVE ROW LOCK (FOR UPDATE)
  -- This serializes concurrent join requests and eliminates race conditions / overbooking
  SELECT * INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

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

    -- Remove from team players roster since spectators do not play
    DELETE FROM public.event_team_players 
    WHERE event_id = p_event_id AND user_id = p_user_id;

    -- If user was previously confirmed as a player and is now switching to spectator,
    -- promote next person from unified waitlist
    IF v_existing_status = 'confirmado' AND (v_existing_type IS NULL OR v_existing_type = 'jugador') THEN
      v_promotion := public.promote_waitlist(p_event_id, p_user_id);
    END IF;
  ELSE
    -- Count currently confirmed players (attendees + approved non-overcapacity guests)
    SELECT count(*) INTO v_confirmed_count
    FROM public.event_attendees
    WHERE event_id = p_event_id 
      AND status = 'confirmado' 
      AND (attendance_type IS NULL OR attendance_type = 'jugador')
      AND user_id != p_user_id;

    SELECT count(*) INTO v_approved_guests_count
    FROM public.event_guests
    WHERE event_id = p_event_id 
      AND status = 'aprobado'
      AND NOT COALESCE(is_overcapacity, false);

    IF v_event.max_capacity IS NOT NULL AND (v_confirmed_count + v_approved_guests_count) >= v_event.max_capacity THEN
      v_target_status := 'lista_espera';
      v_action := 'entro_espera';
    ELSE
      v_target_status := 'confirmado';
      v_action := 'confirmo';
    END IF;
  END IF;

  -- 5. Upsert attendance record atomically
  INSERT INTO public.event_attendees (event_id, user_id, status, attendance_type, registered_at)
  VALUES (p_event_id, p_user_id, v_target_status, v_type, now())
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    attendance_type = EXCLUDED.attendance_type,
    registered_at = now();

  -- 6. Insert audit log
  INSERT INTO public.event_attendance_logs (event_id, user_id, actor_id, action)
  VALUES (p_event_id, p_user_id, p_user_id, v_action);

  RETURN jsonb_build_object(
    'status', v_target_status, 
    'attendance_type', v_type,
    'promotion', v_promotion,
    'promoted_user_id', v_promotion->>'user_id'
  );
END;
$$;

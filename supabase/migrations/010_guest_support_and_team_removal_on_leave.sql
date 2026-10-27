-- 010_guest_support_and_team_removal_on_leave.sql
-- Allow guests in event_team_players and automatically remove players from team rosters when leaving or switching to spectator

ALTER TABLE public.event_team_players 
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.event_team_players 
  ADD COLUMN IF NOT EXISTS guest_id uuid REFERENCES public.event_guests(id) ON DELETE CASCADE;

ALTER TABLE public.event_team_players 
  DROP CONSTRAINT IF EXISTS chk_event_team_player_target;

ALTER TABLE public.event_team_players 
  ADD CONSTRAINT chk_event_team_player_target 
  CHECK ((user_id IS NOT NULL AND guest_id IS NULL) OR (user_id IS NULL AND guest_id IS NOT NULL));

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_team_player_guest 
  ON public.event_team_players (event_id, guest_id) WHERE guest_id IS NOT NULL;

-- Update leave_event RPC to remove player from event_team_players
CREATE OR REPLACE FUNCTION public.leave_event(
  p_event_id uuid, 
  p_user_id uuid, 
  p_actor_id uuid, 
  p_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_status text;
  v_current_type text;
  v_promoted_user_id uuid := NULL;
  v_promoted_user_name text := NULL;
BEGIN
  -- Get current attendee record
  SELECT status, attendance_type INTO v_current_status, v_current_type
  FROM public.event_attendees
  WHERE event_id = p_event_id AND user_id = p_user_id;

  IF NOT FOUND OR v_current_status = 'cancelado' THEN
    RAISE EXCEPTION 'No estás registrado en este evento';
  END IF;

  -- 1. Remove user from any team/fixture roster in this event
  DELETE FROM public.event_team_players 
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- 2. Mark attendance as cancelado
  UPDATE public.event_attendees
  SET status = 'cancelado', registered_at = now()
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- 3. Audit log
  INSERT INTO public.event_attendance_logs (event_id, user_id, actor_id, action, reason)
  VALUES (p_event_id, p_user_id, p_actor_id, 'bajo', p_reason);

  -- 4. If cancelled user was a confirmed player, promote next person from waitlist
  IF v_current_status = 'confirmado' AND v_current_type = 'jugador' THEN
    SELECT a.user_id, p.full_name INTO v_promoted_user_id, v_promoted_user_name
    FROM public.event_attendees a
    JOIN public.profiles p ON p.id = a.user_id
    WHERE a.event_id = p_event_id AND a.status = 'lista_espera'
    ORDER BY a.registered_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_promoted_user_id IS NOT NULL THEN
      UPDATE public.event_attendees
      SET status = 'confirmado', attendance_type = 'jugador'
      WHERE event_id = p_event_id AND user_id = v_promoted_user_id;

      INSERT INTO public.event_attendance_logs (event_id, user_id, actor_id, action, reason)
      VALUES (p_event_id, v_promoted_user_id, p_actor_id, 'subio_espera', 'Promovido automáticamente por baja de cupo');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'promoted_user_id', v_promoted_user_id,
    'promoted_user_name', v_promoted_user_name
  );
END;
$$;

-- Update join_event to also remove player from event_team_players if switching to spectator
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

    -- Remove from team players roster since spectators do not play
    DELETE FROM public.event_team_players 
    WHERE event_id = p_event_id AND user_id = p_user_id;

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

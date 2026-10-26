-- Migration: 002_finances_and_realtime.sql
-- Description: Financial debts module, Web Push helper functions, and Supabase Realtime setup

-- ==============================================================================
-- 1. WEB PUSH RPC HELPERS (Security Definer)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_user_push_subscriptions(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  endpoint text,
  keys_p256dh text,
  keys_auth text
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.endpoint, s.keys_p256dh, s.keys_auth
  FROM public.push_subscriptions s
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_stale_push_subscriptions(p_sub_ids uuid[])
RETURNS void AS $$
BEGIN
  DELETE FROM public.push_subscriptions
  WHERE id = ANY(p_sub_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 2. EVENTS COST CONFIGURATION
-- ==============================================================================

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS cost_per_player integer NOT NULL DEFAULT 3500,
ADD COLUMN IF NOT EXISTS total_cost integer DEFAULT NULL;

-- ==============================================================================
-- 3. MEMBER DEBTS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.member_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.event_guests(id) ON DELETE CASCADE,
  debt_type text NOT NULL CHECK (debt_type IN ('partido_propio', 'invitado')),
  description text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagado')),
  paid_at timestamptz,
  settled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_debts_user_id ON public.member_debts(user_id);
CREATE INDEX IF NOT EXISTS idx_member_debts_event_id ON public.member_debts(event_id);
CREATE INDEX IF NOT EXISTS idx_member_debts_status ON public.member_debts(status);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) FOR MEMBER DEBTS
-- ==============================================================================

ALTER TABLE public.member_debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own debts, admins view all" ON public.member_debts;
CREATE POLICY "Users can view own debts, admins view all"
  ON public.member_debts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins and event creators can insert debts" ON public.member_debts;
CREATE POLICY "Admins and event creators can insert debts"
  ON public.member_debts FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.events WHERE id = event_id AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Only admins can update debts" ON public.member_debts;
CREATE POLICY "Only admins can update debts"
  ON public.member_debts FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete debts" ON public.member_debts;
CREATE POLICY "Only admins can delete debts"
  ON public.member_debts FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ==============================================================================
-- 5. BUSINESS LOGIC RPCS FOR FINANCES
-- ==============================================================================

-- Generate debts for an event (confirmed attendees + approved guests)
CREATE OR REPLACE FUNCTION public.generate_event_debts(
  p_event_id uuid,
  p_cost_per_player integer DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_event record;
  v_cost integer;
  v_attendee record;
  v_guest record;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado';
  END IF;

  v_cost := COALESCE(p_cost_per_player, v_event.cost_per_player, 0);
  IF v_cost <= 0 THEN
    RETURN jsonb_build_object('success', true, 'created', 0, 'message', 'Evento sin costo');
  END IF;

  -- 1. Asistencia del jugador propio
  FOR v_attendee IN
    SELECT user_id FROM public.event_attendees
    WHERE event_id = p_event_id AND status = 'confirmado'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.member_debts
      WHERE event_id = p_event_id AND user_id = v_attendee.user_id AND debt_type = 'partido_propio'
    ) THEN
      INSERT INTO public.member_debts (event_id, user_id, debt_type, description, amount, status)
      VALUES (p_event_id, v_attendee.user_id, 'partido_propio', 'Asistencia: ' || v_event.title, v_cost, 'pendiente');
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- 2. Invitados aprobados (el cobro va a quien lo invitó)
  FOR v_guest IN
    SELECT id, invited_by_user_id, guest_name FROM public.event_guests
    WHERE event_id = p_event_id AND status = 'aprobado'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.member_debts
      WHERE event_id = p_event_id AND guest_id = v_guest.id
    ) THEN
      INSERT INTO public.member_debts (event_id, user_id, guest_id, debt_type, description, amount, status)
      VALUES (p_event_id, v_guest.invited_by_user_id, v_guest.id, 'invitado', 'Invitado (' || v_guest.guest_name || '): ' || v_event.title, v_cost, 'pendiente');
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'created', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Settle player debts (Marcar al día / sanear)
CREATE OR REPLACE FUNCTION public.settle_member_debts(
  p_user_id uuid,
  p_debt_ids uuid[] DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_settled_count integer := 0;
BEGIN
  IF NOT public.is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Solo los administradores pueden sanear deudas';
  END IF;

  IF p_debt_ids IS NOT NULL AND array_length(p_debt_ids, 1) > 0 THEN
    UPDATE public.member_debts
    SET status = 'pagado', paid_at = now(), settled_by = v_actor_id, updated_at = now()
    WHERE id = ANY(p_debt_ids) AND user_id = p_user_id AND status = 'pendiente';
  ELSE
    UPDATE public.member_debts
    SET status = 'pagado', paid_at = now(), settled_by = v_actor_id, updated_at = now()
    WHERE user_id = p_user_id AND status = 'pendiente';
  END IF;

  GET DIAGNOSTICS v_settled_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'settled_count', v_settled_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revert debt to pending (Deshacer saneamiento si fue por error)
CREATE OR REPLACE FUNCTION public.revert_debt_to_pending(p_debt_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_actor_id uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Solo administradores pueden revertir deudas';
  END IF;

  UPDATE public.member_debts
  SET status = 'pendiente', paid_at = NULL, settled_by = NULL, updated_at = now()
  WHERE id = p_debt_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 6. SUPABASE REALTIME CONFIGURATION
-- ==============================================================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_attendees;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.member_debts;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

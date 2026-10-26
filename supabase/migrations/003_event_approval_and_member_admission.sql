-- Migration 003: Event Approval, Member Admission & Manual Financial Closing

-- 1. Update events status check constraint
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_status_check
  CHECK (status = ANY (ARRAY['pendiente_aprobacion'::text, 'convocado'::text, 'en_curso'::text, 'finalizado'::text, 'cancelado'::text]));

-- 2. Add financial_closed columns to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS financial_closed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS financial_closed_at timestamptz DEFAULT NULL;

-- 3. Add approval_status to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'aprobado'
  CHECK (approval_status IN ('pendiente', 'aprobado', 'rechazado'));

-- 4. Update handle_new_user() trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, system_role, sports_role, approval_status, custom_attributes)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
    'member',
    'jugador',
    'pendiente',
    '{}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add DELETE policy on profiles for Admins
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 6. Create RPC close_event_finances
CREATE OR REPLACE FUNCTION public.close_event_finances(
  p_event_id uuid,
  p_custom_debts jsonb DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_event record;
  v_item jsonb;
  v_user_id uuid;
  v_guest_id uuid;
  v_amount integer;
  v_desc text;
  v_debt_type text;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado';
  END IF;

  -- Verify caller is admin or event creator
  IF NOT (public.is_admin(auth.uid()) OR auth.uid() = v_event.created_by) THEN
    RAISE EXCEPTION 'Solo el creador o un administrador pueden cerrar financieramente el evento';
  END IF;

  -- If custom debts provided
  IF p_custom_debts IS NOT NULL AND jsonb_array_length(p_custom_debts) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_custom_debts)
    LOOP
      v_user_id := (v_item->>'user_id')::uuid;
      v_guest_id := CASE WHEN v_item->>'guest_id' IS NOT NULL AND v_item->>'guest_id' != '' THEN (v_item->>'guest_id')::uuid ELSE NULL END;
      v_amount := COALESCE((v_item->>'amount')::integer, 0);
      v_desc := COALESCE(v_item->>'description', 'Cuota evento: ' || v_event.title);
      v_debt_type := CASE WHEN v_guest_id IS NOT NULL THEN 'invitado' ELSE 'partido_propio' END;

      IF v_amount > 0 THEN
        IF v_guest_id IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1 FROM public.member_debts
            WHERE event_id = p_event_id AND guest_id = v_guest_id
          ) THEN
            INSERT INTO public.member_debts (event_id, user_id, guest_id, debt_type, description, amount, status)
            VALUES (p_event_id, v_user_id, v_guest_id, v_debt_type, v_desc, v_amount, 'pendiente');
            v_count := v_count + 1;
          ELSE
            UPDATE public.member_debts
            SET amount = v_amount, description = v_desc, updated_at = now()
            WHERE event_id = p_event_id AND guest_id = v_guest_id AND status = 'pendiente';
          END IF;
        ELSE
          IF NOT EXISTS (
            SELECT 1 FROM public.member_debts
            WHERE event_id = p_event_id AND user_id = v_user_id AND debt_type = 'partido_propio'
          ) THEN
            INSERT INTO public.member_debts (event_id, user_id, debt_type, description, amount, status)
            VALUES (p_event_id, v_user_id, v_debt_type, v_desc, v_amount, 'pendiente');
            v_count := v_count + 1;
          ELSE
            UPDATE public.member_debts
            SET amount = v_amount, description = v_desc, updated_at = now()
            WHERE event_id = p_event_id AND user_id = v_user_id AND debt_type = 'partido_propio' AND status = 'pendiente';
          END IF;
        END IF;
      END IF;
    END LOOP;
  ELSE
    -- Run standard prorated generation
    PERFORM public.generate_event_debts(p_event_id);
  END IF;

  -- Mark event as financially closed
  UPDATE public.events
  SET financial_closed = true,
      financial_closed_at = now()
  WHERE id = p_event_id;

  RETURN jsonb_build_object('success', true, 'processed', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

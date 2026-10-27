-- Migration: 013_club_visibility_and_search.sql
-- Description: Adds is_private visibility flag to clubs table, updates create_new_club RPC,
-- and optimizes indexes for public club directory discovery and search.

-- 1. Add is_private column to clubs table (default false = public)
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- 2. Index for filtering public clubs quickly in search/directory
CREATE INDEX IF NOT EXISTS idx_clubs_is_private ON public.clubs(is_private);

-- 3. Update create_new_club RPC to support p_is_private parameter
CREATE OR REPLACE FUNCTION public.create_new_club(
  p_name text,
  p_slug text,
  p_description text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_is_private boolean DEFAULT false
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_club_id uuid;
  v_clean_slug text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para crear un club';
  END IF;

  v_clean_slug := lower(regexp_replace(trim(p_slug), '[^a-zA-Z0-9\-]', '', 'g'));
  IF length(v_clean_slug) < 3 THEN
    RAISE EXCEPTION 'El identificador (slug) debe tener al menos 3 caracteres alfanuméricos';
  END IF;

  IF EXISTS (SELECT 1 FROM public.clubs WHERE slug = v_clean_slug) THEN
    RAISE EXCEPTION 'El identificador "%" ya está en uso. Elige otro por favor.', v_clean_slug;
  END IF;

  INSERT INTO public.clubs (
    name,
    slug,
    description,
    logo_url,
    is_private,
    created_by,
    settings
  )
  VALUES (
    trim(p_name),
    v_clean_slug,
    trim(p_description),
    p_logo_url,
    COALESCE(p_is_private, false),
    v_user_id,
    '{"bank_details": {"banco": "", "tipo_cuenta": "", "numero_cuenta": "", "titular": "", "rut": "", "email": ""}}'::jsonb
  )
  RETURNING id INTO v_club_id;

  -- Creator becomes first admin of the club
  INSERT INTO public.club_members (
    club_id,
    user_id,
    system_role,
    sports_role,
    approval_status
  ) VALUES (
    v_club_id,
    v_user_id,
    'admin',
    'jugador',
    'aprobado'
  )
  ON CONFLICT (club_id, user_id)
  DO UPDATE SET system_role = 'admin', approval_status = 'aprobado';

  -- Seed default profile field definitions for the new club
  INSERT INTO public.profile_field_definitions (club_id, field_key, label, field_type, options, is_required, display_order)
  VALUES
    (v_club_id, 'posicion', 'Posición habitual', 'select', '["Arquero", "Defensor", "Mediocampista", "Delantero"]'::jsonb, false, 1),
    (v_club_id, 'numero_camiseta', 'Número de camiseta preferido', 'number', '[]'::jsonb, false, 2),
    (v_club_id, 'pie_habil', 'Pie hábil', 'select', '["Derecho", "Izquierdo", "Ambidiestro"]'::jsonb, false, 3)
  ON CONFLICT DO NOTHING;

  -- Seed initial user stats for creator in this club
  INSERT INTO public.user_stats (user_id, club_id)
  VALUES (v_user_id, v_club_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'club_id', v_club_id,
    'slug', v_clean_slug,
    'is_private', COALESCE(p_is_private, false)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

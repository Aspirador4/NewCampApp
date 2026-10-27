-- Migration: 014_user_notification_preferences.sql
-- Description: User notification preferences table, multi-club overrides, and preference query functions

-- ==============================================================================
-- 1. USER_NOTIFICATION_PREFERENCES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE,

  -- Master Channels
  push_enabled boolean NOT NULL DEFAULT true,
  in_app_enabled boolean NOT NULL DEFAULT true,

  -- Individual Categories
  convocatorias boolean NOT NULL DEFAULT true,   -- Nuevas convocatorias y apertura de listas
  equipos boolean NOT NULL DEFAULT true,         -- Equipos publicados / formaciones armadas
  recordatorios boolean NOT NULL DEFAULT true,   -- Recordatorio 24 horas antes del partido
  espera boolean NOT NULL DEFAULT true,          -- Ascenso automático de lista de espera a confirmado
  finanzas boolean NOT NULL DEFAULT true,        -- Cobros de partidos y confirmaciones de pago
  mvp boolean NOT NULL DEFAULT true,             -- Votaciones, recordatorio 4h y anuncio de ganadores MVP
  invitados boolean NOT NULL DEFAULT true,       -- Respuestas de aprobación/rechazo de invitados solicitados
  admin_alertas boolean NOT NULL DEFAULT true,   -- Alertas de capitanía (nuevos socios, cupo libre, etc.)

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique index per user and club (allowing one global default where club_id is null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notif_pref_user_club 
  ON public.user_notification_preferences(user_id, COALESCE(club_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_user_notif_pref_user_id ON public.user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notif_pref_club_id ON public.user_notification_preferences(club_id);

-- RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can view own notification preferences"
  ON public.user_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
  ON public.user_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON public.user_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can delete own notification preferences"
  ON public.user_notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 2. HELPER FUNCTIONS FOR RETRIEVAL AND UPSERT
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_effective_user_notification_preferences(
  p_user_id uuid,
  p_club_id uuid DEFAULT NULL
)
RETURNS TABLE (
  push_enabled boolean,
  in_app_enabled boolean,
  convocatorias boolean,
  equipos boolean,
  recordatorios boolean,
  espera boolean,
  finanzas boolean,
  mvp boolean,
  invitados boolean,
  admin_alertas boolean
) AS $$
BEGIN
  -- Try club-specific preference first, fallback to user global (club_id is null)
  RETURN QUERY
  SELECT
    p.push_enabled,
    p.in_app_enabled,
    p.convocatorias,
    p.equipos,
    p.recordatorios,
    p.espera,
    p.finanzas,
    p.mvp,
    p.invitados,
    p.admin_alertas
  FROM public.user_notification_preferences p
  WHERE p.user_id = p_user_id
    AND (p.club_id = p_club_id OR (p_club_id IS NOT NULL AND p.club_id IS NULL) OR (p_club_id IS NULL AND p.club_id IS NULL))
  ORDER BY (p.club_id IS NOT NULL) DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration: 005_notifications_and_reminders.sql
-- Description: In-App Notifications table, multi-club push helpers, and automated reminder tracking

-- ==============================================================================
-- 1. IN_APP_NOTIFICATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  url text DEFAULT '/',
  type text NOT NULL CHECK (type IN ('evento', 'finanzas', 'membresia', 'mvp', 'admin', 'recordatorio', 'sistema')),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_in_app_notifs_user_id ON public.in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifs_club_id ON public.in_app_notifications(club_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifs_created_at ON public.in_app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notifs_unread ON public.in_app_notifications(user_id, is_read) WHERE is_read = false;

-- RLS
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own in_app_notifications" ON public.in_app_notifications;
CREATE POLICY "Users can view own in_app_notifications"
  ON public.in_app_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own in_app_notifications" ON public.in_app_notifications;
CREATE POLICY "Users can update own in_app_notifications"
  ON public.in_app_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own in_app_notifications" ON public.in_app_notifications;
CREATE POLICY "Users can delete own in_app_notifications"
  ON public.in_app_notifications FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated can insert in_app_notifications" ON public.in_app_notifications;
CREATE POLICY "Authenticated can insert in_app_notifications"
  ON public.in_app_notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ==============================================================================
-- 2. ADD COLUMNS TO EVENTS FOR REMINDERS
-- ==============================================================================
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_mvp_sent boolean NOT NULL DEFAULT false;

-- ==============================================================================
-- 3. SECURITY DEFINER FUNCTIONS FOR MULTI-CLUB PUSH SUBSCRIPTIONS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_club_members_push_subscriptions(
  p_club_id uuid,
  p_exclude_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  endpoint text,
  keys_p256dh text,
  keys_auth text
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.user_id, s.endpoint, s.keys_p256dh, s.keys_auth
  FROM public.push_subscriptions s
  INNER JOIN public.club_members cm ON cm.user_id = s.user_id
  WHERE cm.club_id = p_club_id
    AND cm.approval_status = 'aprobado'
    AND (p_exclude_user_id IS NULL OR s.user_id <> p_exclude_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_club_admins_push_subscriptions(
  p_club_id uuid,
  p_exclude_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  endpoint text,
  keys_p256dh text,
  keys_auth text
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.user_id, s.endpoint, s.keys_p256dh, s.keys_auth
  FROM public.push_subscriptions s
  INNER JOIN public.club_members cm ON cm.user_id = s.user_id
  WHERE cm.club_id = p_club_id
    AND cm.approval_status = 'aprobado'
    AND cm.system_role = 'admin'
    AND (p_exclude_user_id IS NULL OR s.user_id <> p_exclude_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_club_admin_user_ids(
  p_club_id uuid,
  p_exclude_user_id uuid DEFAULT NULL
)
RETURNS TABLE (user_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT cm.user_id
  FROM public.club_members cm
  WHERE cm.club_id = p_club_id
    AND cm.approval_status = 'aprobado'
    AND cm.system_role = 'admin'
    AND (p_exclude_user_id IS NULL OR cm.user_id <> p_exclude_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_club_member_user_ids(
  p_club_id uuid,
  p_exclude_user_id uuid DEFAULT NULL
)
RETURNS TABLE (user_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT cm.user_id
  FROM public.club_members cm
  WHERE cm.club_id = p_club_id
    AND cm.approval_status = 'aprobado'
    AND (p_exclude_user_id IS NULL OR cm.user_id <> p_exclude_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 4. IN-APP NOTIFICATION RPC HELPERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_in_app_notification(
  p_user_id uuid,
  p_club_id uuid,
  p_title text,
  p_body text,
  p_url text DEFAULT '/',
  p_type text DEFAULT 'sistema'
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.in_app_notifications (user_id, club_id, title, body, url, type)
  VALUES (p_user_id, p_club_id, p_title, p_body, p_url, p_type)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_bulk_in_app_notifications(
  p_user_ids uuid[],
  p_club_id uuid,
  p_title text,
  p_body text,
  p_url text DEFAULT '/',
  p_type text DEFAULT 'sistema'
)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.in_app_notifications (user_id, club_id, title, body, url, type)
  SELECT u, p_club_id, p_title, p_body, p_url, p_type
  FROM unnest(p_user_ids) AS u;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read(p_club_id uuid DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE public.in_app_notifications
  SET is_read = true
  WHERE user_id = auth.uid()
    AND is_read = false
    AND (p_club_id IS NULL OR club_id = p_club_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 5. REALTIME PUBLICATION SETUP
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'in_app_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;
  END IF;
END $$;

-- 008_admin_member_evaluation.sql
-- Allow direct member evaluations by admins (nullable event_id and optional feedback comment)

ALTER TABLE public.match_player_ratings
  ALTER COLUMN event_id DROP NOT NULL;

ALTER TABLE public.match_player_ratings
  ADD COLUMN IF NOT EXISTS comment text;

-- Allow 1 direct scout/baseline rating per (club_id, evaluator_id, evaluated_player_id) when event_id is null
CREATE UNIQUE INDEX IF NOT EXISTS uq_match_evaluator_evaluated_no_event 
  ON public.match_player_ratings(club_id, evaluator_id, evaluated_player_id) 
  WHERE event_id IS NULL;

-- Allow update policy for admins or evaluators
DROP POLICY IF EXISTS "Admins or evaluators can update peer ratings" ON public.match_player_ratings;
CREATE POLICY "Admins or evaluators can update peer ratings"
  ON public.match_player_ratings FOR UPDATE
  USING (
    evaluator_id = auth.uid() OR public.is_club_admin(club_id, auth.uid())
  );

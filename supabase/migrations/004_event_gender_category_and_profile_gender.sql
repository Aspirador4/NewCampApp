-- Migration 004: Event Gender Category and Profile Gender

-- 1. Add gender column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('masculino', 'femenino', 'otro'));

-- 2. Add gender_category column to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS gender_category text NOT NULL DEFAULT 'mixto'
  CHECK (gender_category IN ('masculino', 'femenino', 'mixto'));

-- 3. Allow users to update their own approval_status to 'pendiente' (for re-applying when rejected)
-- Ensure trigger / RLS allows it

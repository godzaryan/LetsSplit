-- Update maids table to support soft deletion and history tracking
ALTER TABLE public.maids ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.maids ADD COLUMN IF NOT EXISTS left_date DATE;

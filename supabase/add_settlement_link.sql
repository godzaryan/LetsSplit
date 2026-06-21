-- ============================================
-- Link Scheduled Payments to Settlements
-- ============================================

ALTER TABLE public.scheduled_expense_payments ADD COLUMN settlement_id UUID REFERENCES public.settlements(id) ON DELETE CASCADE;

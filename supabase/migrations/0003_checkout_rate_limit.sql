-- Migration 0003: Checkout rate-limit tracking
-- Adds a timestamptz column to profiles so the polar-checkout Edge Function
-- can enforce a per-user cooldown (60 s) and block duplicate checkouts when
-- the user already has an active paid subscription.

alter table public.profiles
  add column if not exists checkout_attempt_at timestamptz;

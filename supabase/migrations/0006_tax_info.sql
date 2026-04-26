-- Migration 0006: Turkish tax information
-- Stores optional billing/invoice details for Turkish legal compliance.
-- VKN = Vergi Kimlik Numarası (10 digits, companies)
-- TCKN = TC Kimlik Numarası (11 digits, individuals)
-- These are sent as metadata in Polar checkout sessions so invoices can be
-- generated with correct tax IDs. Data stays in our DB for record keeping.

alter table public.profiles
  add column if not exists tax_id text,         -- VKN (10) or TCKN (11)
  add column if not exists tax_name text,        -- Company/individual name for invoice
  add column if not exists tax_address text;     -- Billing address

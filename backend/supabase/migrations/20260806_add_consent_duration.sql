-- Migration: Add consent duration and expiration columns to medical_records
ALTER TABLE public.medical_records 
ADD COLUMN IF NOT EXISTS consent_duration_type text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS consent_expires_at timestamp with time zone;

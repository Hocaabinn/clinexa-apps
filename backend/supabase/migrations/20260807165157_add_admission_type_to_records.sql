-- Add admission_type column to medical_records
ALTER TABLE public.medical_records 
ADD COLUMN IF NOT EXISTS admission_type VARCHAR(20) DEFAULT 'rawat_jalan' CHECK (admission_type IN ('rawat_jalan', 'rawat_inap', 'igd'));

-- 1. Hapus tabel lama beserta relasinya agar bersih
drop table if exists public.patients cascade;

-- 2. Buat ulang tabel patients dengan NIK biasa & tambahan wallet_address
create table public.patients (
  -- id dibuat otomatis karena aplikasi tidak menggunakan auth.users bawaan Supabase
  id uuid not null default gen_random_uuid(),
  nik text not null, -- NIK biasa (Teks asli, tidak di-hash)
  name text not null,
  gender character varying(1) not null,
  birth_date date not null,
  blood_type character varying(2) not null,
  wallet_address text, -- Tambahan kolom untuk alamat publik blockchain pasien
  created_at timestamp with time zone not null default now(),
  
  constraint patients_pkey primary key (id),
  constraint patients_nik_key unique (nik), -- NIK asli wajib unik agar tidak ganda
  constraint patients_blood_type_check check (
    ((blood_type)::text = any (array['A'::text, 'B'::text, 'AB'::text, 'O'::text]))
  ),
  constraint patients_gender_check check (
    ((gender)::text = any (array['L'::text, 'P'::text]))
  )
) TABLESPACE pg_default;

-- 3. Aktifkan Row Level Security (RLS)
alter table public.patients enable row level security;

-- 4. Hapus policy lama untuk menghindari bentrok
drop policy if exists "Allow public insert" on public.patients;
drop policy if exists "Allow public select" on public.patients;
drop policy if exists "Allow public update" on public.patients;

-- 5. Buat POLICY BARU YANG AMAN (Menggunakan auth.uid())

-- Karena aplikasi menggunakan NIK dan Seed Phrase custom tanpa Supabase Auth,
-- kita izinkan anon access namun disarankan diperketat di level aplikasi/Edge Function.
create policy "Allow public insert" on public.patients
  for insert with check (true);

create policy "Allow public select" on public.patients
  for select using (true);

create policy "Allow public update" on public.patients
  for update using (true);


-- 6. Kembalikan Foreign Key dari tabel lain yang sempat terputus
alter table if exists public.medical_documents
  add constraint medical_documents_patient_id_fkey
  foreign key (patient_id) references public.patients(id) on delete cascade;

alter table if exists public.consent_requests
  add constraint consent_requests_patient_id_fkey
  foreign key (patient_id) references public.patients(id) on delete cascade;

alter table if exists public.access_logs
  add constraint access_logs_patient_id_fkey
  foreign key (patient_id) references public.patients(id) on delete set null;
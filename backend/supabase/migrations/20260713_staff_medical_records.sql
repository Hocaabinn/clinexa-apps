create table public.staff (
  id uuid not null default gen_random_uuid(),
  email text not null,
  name text not null,
  specialization text,
  registration_number text,
  institution text,
  address text,
  blood_type character varying(3),
  nationality text default 'WNI (Warga Negara Indonesia)',
  created_at timestamp with time zone not null default now(),

  constraint staff_pkey primary key (id),
  constraint staff_email_key unique (email)
) TABLESPACE pg_default;

alter table public.staff enable row level security;

create policy "Allow public insert" on public.staff
  for insert with check (true);

create policy "Allow public select" on public.staff
  for select using (true);

create policy "Allow public update" on public.staff
  for update using (true);

create table public.medical_records (
  id uuid not null default gen_random_uuid(),
  patient_id uuid not null,
  staff_id uuid,
  record_type text not null default 'pemeriksaan',
  chief_complaint text,
  blood_pressure text,
  heart_rate text,
  temperature text,
  oxygen_saturation text,
  weight text,
  height text,
  diagnosis text,
  therapy text,
  notes text,
  lab_type text,
  lab_date date,
  lab_notes text,
  prescriptions jsonb,
  prescription_notes text,
  consent_status text not null default 'pending',
  blockchain_hash text,
  created_at timestamp with time zone not null default now(),

  constraint medical_records_pkey primary key (id),
  constraint medical_records_patient_id_fkey foreign key (patient_id) references public.patients(id) on delete cascade,
  constraint medical_records_staff_id_fkey foreign key (staff_id) references public.staff(id) on delete set null,
  constraint medical_records_record_type_check check (
    record_type in ('pemeriksaan', 'laboratorium', 'resep')
  ),
  constraint medical_records_consent_status_check check (
    consent_status in ('granted', 'denied', 'pending')
  )
) TABLESPACE pg_default;

alter table public.medical_records enable row level security;

create policy "Allow public insert" on public.medical_records
  for insert with check (true);

create policy "Allow public select" on public.medical_records
  for select using (true);

create policy "Allow public update" on public.medical_records
  for update using (true);

create policy "Allow public delete" on public.medical_records
  for delete using (true);

insert into public.staff (email, name, specialization, registration_number, institution, address, blood_type)
values (
  'agung@clinexa.com',
  'Dr. Agung Setya',
  'Dokter Umum',
  '19860102010011001',
  'RS Semen Gresik',
  'Jl Kartini, Kebomas, Gresik, Jawa Timur 61111',
  'B'
);

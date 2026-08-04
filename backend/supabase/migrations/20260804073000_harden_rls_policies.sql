-- Harden public access for medical data.
-- Staff workflows use Supabase Auth, so medical records and staff profiles are
-- limited to authenticated users. Patient self-service flows go through the
-- patient-access Edge Function, which uses the service role on the server.

alter table public.patients enable row level security;
alter table public.staff enable row level security;
alter table public.medical_records enable row level security;

drop policy if exists "Allow public insert" on public.patients;
drop policy if exists "Allow public select" on public.patients;
drop policy if exists "Allow public update" on public.patients;
drop policy if exists "Allow authenticated patient read" on public.patients;
drop policy if exists "Allow authenticated patient update" on public.patients;
drop policy if exists "Allow authenticated patient insert" on public.patients;

create policy "Allow authenticated patient read" on public.patients
  for select
  to authenticated
  using (true);

create policy "Allow authenticated patient update" on public.patients
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated patient insert" on public.patients
  for insert
  to authenticated
  with check (true);

drop policy if exists "Allow public insert" on public.staff;
drop policy if exists "Allow public select" on public.staff;
drop policy if exists "Allow public update" on public.staff;
drop policy if exists "Allow authenticated staff read" on public.staff;
drop policy if exists "Allow staff profile update" on public.staff;

create policy "Allow authenticated staff read" on public.staff
  for select
  to authenticated
  using (true);

create policy "Allow staff profile update" on public.staff
  for update
  to authenticated
  using (email = auth.jwt() ->> 'email')
  with check (email = auth.jwt() ->> 'email');

drop policy if exists "Allow public insert" on public.medical_records;
drop policy if exists "Allow public select" on public.medical_records;
drop policy if exists "Allow public update" on public.medical_records;
drop policy if exists "Allow public delete" on public.medical_records;
drop policy if exists "Allow authenticated medical record read" on public.medical_records;
drop policy if exists "Allow authenticated medical record insert" on public.medical_records;
drop policy if exists "Allow authenticated medical record update" on public.medical_records;
drop policy if exists "Allow authenticated medical record delete" on public.medical_records;

create policy "Allow authenticated medical record read" on public.medical_records
  for select
  to authenticated
  using (true);

create policy "Allow authenticated medical record insert" on public.medical_records
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated medical record update" on public.medical_records
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated medical record delete" on public.medical_records
  for delete
  to authenticated
  using (true);

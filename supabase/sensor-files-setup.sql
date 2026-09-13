-- Thermal Validation Studio
-- Adds cloud storage for uploaded datalogger CSV data (sensor_files), scoped
-- per-document so re-opening a document (from any device/browser, by any
-- organization member) shows the same uploaded sensor data without needing
-- to re-upload, while keeping each document's data fully independent from
-- other documents. Run this in the Supabase SQL Editor.

create table if not exists public.sensor_files (
  id text not null,
  document_id uuid not null references public.documents(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (document_id, id)
);

create index if not exists sensor_files_document_id_idx
  on public.sensor_files(document_id);
create index if not exists sensor_files_organization_id_idx
  on public.sensor_files(organization_id);

alter table public.sensor_files enable row level security;

create policy "Members can view organization sensor files"
  on public.sensor_files for select
  using (public.is_organization_member(organization_id));

create policy "Editors can create organization sensor files"
  on public.sensor_files for insert
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

create policy "Editors can update organization sensor files"
  on public.sensor_files for update
  using (public.has_organization_role(organization_id, array['owner', 'admin', 'editor']))
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

create policy "Editors can delete organization sensor files"
  on public.sensor_files for delete
  using (public.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

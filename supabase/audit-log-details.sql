-- Store the complete audit event in Supabase so it is available on every device.
alter table public.audit_logs
  add column if not exists username text not null default '',
  add column if not exists user_display_name text not null default '',
  add column if not exists user_role text not null default '',
  add column if not exists session_id text not null default '',
  add column if not exists severity text not null default 'low',
  add column if not exists document_number text,
  add column if not exists document_type text,
  add column if not exists field_path text,
  add column if not exists old_value text,
  add column if not exists new_value text,
  add column if not exists failure_reason text;

create index if not exists audit_logs_organization_created_at_idx
  on public.audit_logs(organization_id, created_at desc);

-- Oxford Finance Hub: private Supabase persistence and document storage
-- Apply in Supabase SQL Editor. All application data is server-only; the browser
-- must never receive the Supabase secret key.

create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  identity_user_id uuid not null unique,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_roles (
  identity_user_id uuid primary key,
  role text not null check (role in ('Administrator','Office staff','Application reviewer','Customer support')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid not null references public.customers(id),
  applicant_type text not null check (applicant_type in ('individual','business')),
  category text not null check (category in ('vehicle','equipment','commercial-asset','other')),
  status text not null default 'Submitted' check (status in ('Draft','Submitted','Under review','Awaiting documents','With finance provider','Provider decision received','Closed')),
  application_data jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id, idempotency_key)
);
create index if not exists finance_applications_customer_idx on public.finance_applications(customer_id, submitted_at desc);
create index if not exists finance_applications_status_idx on public.finance_applications(status, submitted_at desc);

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.finance_applications(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  storage_bucket text not null,
  storage_path text not null unique,
  original_filename text not null,
  content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists application_documents_application_idx on public.application_documents(application_id, created_at);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_identity_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);

-- The application uses Netlify Identity, not Supabase Auth. Therefore no
-- browser role can safely be inferred from auth.uid(). Deny all direct access.
alter table public.customers enable row level security;
alter table public.staff_roles enable row level security;
alter table public.finance_applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.audit_events enable row level security;

revoke all on public.customers, public.staff_roles, public.finance_applications,
  public.application_documents, public.audit_events from anon, authenticated;
grant all on public.customers, public.staff_roles, public.finance_applications,
  public.application_documents, public.audit_events to service_role;

-- Keep the named bucket private and enforce server-side-compatible limits.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('oxford-customer-documents','oxford-customer-documents',false,10485760,
  array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

-- A restrictive policy also blocks this bucket if a broader permissive policy is
-- added elsewhere later. It affects only this bucket, not other project buckets.
drop policy if exists oxford_private_bucket_deny_client_access on storage.objects;
create policy oxford_private_bucket_deny_client_access
on storage.objects as restrictive for all to anon, authenticated
using (bucket_id <> 'oxford-customer-documents')
with check (bucket_id <> 'oxford-customer-documents');

-- Server functions use the Supabase secret key; never expose it in the browser.

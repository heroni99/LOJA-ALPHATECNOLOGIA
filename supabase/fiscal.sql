create table if not exists public.fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  sale_id uuid not null references public.sales(id) on delete restrict,
  receipt_number text not null unique,
  status text not null default 'ISSUED',
  html_content text,
  cancelled_at timestamptz,
  cancel_reason text,
  cancelled_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint fiscal_documents_sale_id_key unique (sale_id),
  constraint fiscal_documents_status_check check (status in ('ISSUED', 'CANCELLED'))
);

create table if not exists public.product_attachments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size_kb integer,
  description text,
  attachment_type text not null default 'INVOICE',
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint product_attachments_file_size_kb_check check (
    file_size_kb is null or file_size_kb > 0
  ),
  constraint product_attachments_type_check check (
    attachment_type in ('INVOICE', 'WARRANTY', 'MANUAL', 'OTHER')
  )
);

create index if not exists idx_fiscal_documents_store_status
  on public.fiscal_documents(store_id, status);
create index if not exists idx_fiscal_documents_issued_at
  on public.fiscal_documents(issued_at desc);
create index if not exists idx_fiscal_documents_cancelled_at
  on public.fiscal_documents(cancelled_at desc);

create index if not exists idx_product_attachments_product_id
  on public.product_attachments(product_id);
create index if not exists idx_product_attachments_created_at
  on public.product_attachments(created_at desc);

alter table public.fiscal_documents enable row level security;
alter table public.product_attachments enable row level security;

drop policy if exists fiscal_documents_tenant_policy on public.fiscal_documents;
create policy fiscal_documents_tenant_policy
on public.fiscal_documents
for all
to authenticated
using (
  public.same_store(store_id)
  and public.sale_in_current_store(sale_id)
)
with check (
  public.same_store(store_id)
  and public.sale_in_current_store(sale_id)
);

drop policy if exists product_attachments_tenant_policy on public.product_attachments;
create policy product_attachments_tenant_policy
on public.product_attachments
for all
to authenticated
using (public.product_in_current_store(product_id))
with check (public.product_in_current_store(product_id));

begin;

create extension if not exists pgcrypto with schema extensions;

do $$
begin
  create type public.code_type_enum as enum (
    'INTERNAL',
    'SKU',
    'EAN',
    'UPC',
    'IMEI',
    'SERIAL',
    'CUSTOM'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.code_scope_enum as enum ('PRODUCT', 'UNIT');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_unit_status_enum as enum (
    'IN_STOCK',
    'RESERVED',
    'SOLD',
    'IN_SERVICE',
    'RETURNED',
    'TRANSFERRED',
    'DAMAGED',
    'LOST'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.stock_movement_type_enum as enum (
    'IN',
    'OUT',
    'ADJUSTMENT_POSITIVE',
    'ADJUSTMENT_NEGATIVE',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'SALE',
    'PURCHASE',
    'RETURN_IN',
    'RETURN_OUT',
    'SERVICE_CONSUMPTION',
    'SERVICE_RETURN'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.reference_type_enum as enum (
    'SALE',
    'PURCHASE_ORDER',
    'SERVICE_ORDER',
    'SALE_RETURN',
    'CASH_SESSION',
    'MANUAL',
    'INVENTORY_ADJUSTMENT'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method_enum as enum (
    'CASH',
    'PIX',
    'CREDIT_CARD',
    'DEBIT_CARD',
    'BANK_TRANSFER',
    'BOLETO',
    'STORE_CREDIT',
    'OTHER'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.cash_session_status_enum as enum (
    'OPEN',
    'CLOSED',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.cash_movement_type_enum as enum (
    'OPENING',
    'SALE',
    'WITHDRAWAL',
    'SUPPLY',
    'REFUND',
    'ADJUSTMENT',
    'CLOSING'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.sale_status_enum as enum (
    'PENDING',
    'COMPLETED',
    'CANCELLED',
    'PARTIALLY_REFUNDED',
    'REFUNDED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.service_order_status_enum as enum (
    'OPEN',
    'WAITING_APPROVAL',
    'APPROVED',
    'IN_PROGRESS',
    'READY_FOR_DELIVERY',
    'DELIVERED',
    'REJECTED',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.service_order_item_type_enum as enum (
    'PART',
    'SERVICE',
    'ACCESSORY',
    'FEE',
    'DISCOUNT'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.purchase_order_status_enum as enum (
    'DRAFT',
    'ORDERED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.refund_type_enum as enum (
    'CASH',
    'PIX',
    'CARD_REVERSAL',
    'STORE_CREDIT',
    'EXCHANGE',
    'OTHER'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payable_status_enum as enum (
    'PENDING',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.receivable_status_enum as enum (
    'PENDING',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'OVERDUE',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  display_name text,
  active boolean not null default true,
  primary_color text not null default '#F97316',
  secondary_color text not null default '#111827',
  accent_color text,
  logo_url text,
  banner_url text,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  active boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission text not null,
  created_at timestamptz not null default now(),
  constraint role_permissions_role_id_permission_key unique (role_id, permission)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete restrict,
  role_id uuid not null references public.roles(id) on delete restrict,
  name text not null,
  phone text,
  active boolean not null default true,
  must_change_password boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- store_id was added to tenant-scoped catalogs so RLS can isolate each loja.
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  name text not null,
  cpf_cnpj text,
  email text,
  phone text,
  phone2 text,
  zip_code text,
  address text,
  city text,
  state text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  name text not null,
  trade_name text,
  cnpj text,
  email text,
  phone text,
  contact_name text,
  zip_code text,
  address text,
  city text,
  state text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  name text not null,
  prefix text not null,
  description text,
  default_serialized boolean not null default false,
  sequence_name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_store_id_name_key unique (store_id, name),
  constraint categories_store_id_prefix_key unique (store_id, prefix)
);

create table if not exists public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  name text not null,
  description text,
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint stock_locations_store_id_name_key unique (store_id, name)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  name text not null,
  description text,
  brand text,
  model text,
  image_url text,
  internal_code text not null,
  supplier_code text,
  ncm text,
  cest text,
  cfop_default text,
  origin_code text,
  tax_category text,
  cost_price numeric(14,2) not null default 0,
  sale_price numeric(14,2) not null default 0,
  stock_min numeric(14,3) not null default 0,
  has_serial_control boolean not null default false,
  needs_price_review boolean not null default false,
  is_service boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_store_id_internal_code_key unique (store_id, internal_code),
  constraint products_cost_price_check check (cost_price >= 0),
  constraint products_sale_price_check check (sale_price >= 0),
  constraint products_stock_min_check check (stock_min >= 0)
);

create table if not exists public.product_units (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  imei text,
  imei2 text,
  serial_number text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  current_location_id uuid references public.stock_locations(id) on delete set null,
  purchase_price numeric(14,2) not null default 0,
  unit_status public.product_unit_status_enum not null default 'IN_STOCK',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_units_purchase_price_check check (purchase_price >= 0)
);

create table if not exists public.product_codes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  product_unit_id uuid references public.product_units(id) on delete cascade,
  code text not null,
  code_type public.code_type_enum not null,
  scope public.code_scope_enum not null default 'PRODUCT',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint product_codes_code_key unique (code)
);

create table if not exists public.stock_balances (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid not null references public.stock_locations(id) on delete cascade,
  quantity numeric(14,3) not null default 0,
  updated_at timestamptz not null default now(),
  constraint stock_balances_product_location_key unique (product_id, location_id)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  product_unit_id uuid references public.product_units(id) on delete set null,
  location_id uuid not null references public.stock_locations(id) on delete restrict,
  movement_type public.stock_movement_type_enum not null,
  quantity numeric(14,3) not null,
  unit_cost numeric(14,2) not null default 0,
  reference_type public.reference_type_enum,
  reference_id uuid,
  notes text,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_movements_quantity_check check (quantity > 0),
  constraint stock_movements_unit_cost_check check (unit_cost >= 0)
);

create table if not exists public.cash_terminals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint cash_terminals_store_id_name_key unique (store_id, name)
);

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  cash_terminal_id uuid not null references public.cash_terminals(id) on delete restrict,
  opened_by uuid not null references public.profiles(id) on delete restrict,
  closed_by uuid references public.profiles(id) on delete set null,
  status public.cash_session_status_enum not null default 'OPEN',
  opening_amount numeric(14,2) not null default 0,
  expected_amount numeric(14,2) not null default 0,
  closing_amount numeric(14,2),
  difference numeric(14,2),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  notes text,
  constraint cash_sessions_opening_amount_check check (opening_amount >= 0),
  constraint cash_sessions_expected_amount_check check (expected_amount >= 0),
  constraint cash_sessions_closing_amount_check check (closing_amount is null or closing_amount >= 0)
);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null references public.cash_sessions(id) on delete cascade,
  movement_type public.cash_movement_type_enum not null,
  amount numeric(14,2) not null,
  payment_method public.payment_method_enum,
  reference_type public.reference_type_enum,
  reference_id uuid,
  description text,
  user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint cash_movements_amount_check check (amount > 0)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null,
  store_id uuid not null references public.stores(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete restrict,
  cash_session_id uuid references public.cash_sessions(id) on delete set null,
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  status public.sale_status_enum not null default 'PENDING',
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_store_id_sale_number_key unique (store_id, sale_number),
  constraint sales_subtotal_check check (subtotal >= 0),
  constraint sales_discount_amount_check check (discount_amount >= 0),
  constraint sales_total_check check (total >= 0)
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_unit_id uuid references public.product_units(id) on delete set null,
  quantity numeric(14,3) not null,
  unit_price numeric(14,2) not null,
  discount_amount numeric(14,2) not null default 0,
  total_price numeric(14,2) not null,
  created_at timestamptz not null default now(),
  constraint sale_items_quantity_check check (quantity > 0),
  constraint sale_items_unit_price_check check (unit_price >= 0),
  constraint sale_items_discount_amount_check check (discount_amount >= 0),
  constraint sale_items_total_price_check check (total_price >= 0)
);

create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  method public.payment_method_enum not null,
  amount numeric(14,2) not null,
  installments integer not null default 1,
  reference_code text,
  created_at timestamptz not null default now(),
  constraint sale_payments_amount_check check (amount > 0),
  constraint sale_payments_installments_check check (installments > 0)
);

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  assigned_to_user_id uuid references public.profiles(id) on delete set null,
  order_number text not null,
  status public.service_order_status_enum not null default 'OPEN',
  device_type text not null,
  brand text,
  model text,
  imei text,
  serial_number text,
  color text,
  accessories text,
  reported_issue text not null,
  found_issue text,
  technical_notes text,
  estimated_completion_date date,
  total_estimated numeric(14,2) not null default 0,
  total_final numeric(14,2) not null default 0,
  approved_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_orders_store_id_order_number_key unique (store_id, order_number),
  constraint service_orders_total_estimated_check check (total_estimated >= 0),
  constraint service_orders_total_final_check check (total_final >= 0)
);

create table if not exists public.service_order_items (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  item_type public.service_order_item_type_enum not null default 'PART',
  description text not null,
  quantity numeric(14,3) not null default 1,
  unit_price numeric(14,2) not null default 0,
  total_price numeric(14,2) not null default 0,
  stock_consumed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint service_order_items_quantity_check check (quantity > 0),
  constraint service_order_items_unit_price_check check (unit_price >= 0),
  constraint service_order_items_total_price_check check (total_price >= 0)
);

create table if not exists public.service_order_status_history (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  old_status public.service_order_status_enum,
  new_status public.service_order_status_enum not null,
  notes text,
  changed_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.service_order_attachments (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_url text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  constraint service_order_attachments_size_bytes_check check (size_bytes > 0)
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  order_number text not null,
  status public.purchase_order_status_enum not null default 'DRAFT',
  notes text,
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  ordered_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_orders_store_id_order_number_key unique (store_id, order_number),
  constraint purchase_orders_subtotal_check check (subtotal >= 0),
  constraint purchase_orders_discount_amount_check check (discount_amount >= 0),
  constraint purchase_orders_total_check check (total >= 0)
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  quantity numeric(14,3) not null,
  unit_cost numeric(14,2) not null,
  total_cost numeric(14,2) not null,
  received_quantity numeric(14,3) not null default 0,
  created_at timestamptz not null default now(),
  constraint purchase_order_items_quantity_check check (quantity > 0),
  constraint purchase_order_items_unit_cost_check check (unit_cost >= 0),
  constraint purchase_order_items_total_cost_check check (total_cost >= 0),
  constraint purchase_order_items_received_quantity_check check (received_quantity >= 0)
);

create table if not exists public.sale_returns (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  return_number text not null unique,
  reason text not null,
  refund_type public.refund_type_enum not null,
  total_amount numeric(14,2) not null,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint sale_returns_total_amount_check check (total_amount >= 0)
);

create table if not exists public.sale_return_items (
  id uuid primary key default gen_random_uuid(),
  sale_return_id uuid not null references public.sale_returns(id) on delete cascade,
  sale_item_id uuid not null references public.sale_items(id) on delete restrict,
  quantity numeric(14,3) not null,
  return_to_stock boolean not null default true,
  amount numeric(14,2) not null,
  created_at timestamptz not null default now(),
  constraint sale_return_items_quantity_check check (quantity > 0),
  constraint sale_return_items_amount_check check (amount >= 0)
);

create table if not exists public.accounts_payable (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  description text not null,
  amount numeric(14,2) not null,
  due_date date not null,
  paid_at timestamptz,
  status public.payable_status_enum not null default 'PENDING',
  payment_method public.payment_method_enum,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_payable_amount_check check (amount > 0)
);

create table if not exists public.accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  description text not null,
  amount numeric(14,2) not null,
  due_date date not null,
  received_at timestamptz,
  status public.receivable_status_enum not null default 'PENDING',
  payment_method public.payment_method_enum,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_receivable_amount_check check (amount > 0)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_store_id on public.profiles(store_id);
create index if not exists idx_profiles_role_id on public.profiles(role_id);
create index if not exists idx_profiles_active on public.profiles(active);

create index if not exists idx_customers_store_name on public.customers(store_id, name);
create index if not exists idx_customers_store_phone on public.customers(store_id, phone);
create index if not exists idx_customers_store_active on public.customers(store_id, active);
create unique index if not exists idx_customers_store_cpf_cnpj_unique
  on public.customers(store_id, cpf_cnpj)
  where cpf_cnpj is not null and btrim(cpf_cnpj) <> '';

create index if not exists idx_suppliers_store_name on public.suppliers(store_id, name);
create index if not exists idx_suppliers_store_phone on public.suppliers(store_id, phone);
create index if not exists idx_suppliers_store_active on public.suppliers(store_id, active);
create unique index if not exists idx_suppliers_store_cnpj_unique
  on public.suppliers(store_id, cnpj)
  where cnpj is not null and btrim(cnpj) <> '';

create index if not exists idx_categories_store_active on public.categories(store_id, active);
create index if not exists idx_products_store_name on public.products(store_id, name);
create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_supplier_id on public.products(supplier_id);
create index if not exists idx_products_store_brand_model on public.products(store_id, brand, model);
create index if not exists idx_products_store_active on public.products(store_id, active);

create index if not exists idx_product_units_product_id on public.product_units(product_id);
create index if not exists idx_product_units_location_id on public.product_units(current_location_id);
create index if not exists idx_product_units_status on public.product_units(unit_status);
create unique index if not exists idx_product_units_imei_unique
  on public.product_units(imei)
  where imei is not null and btrim(imei) <> '';
create unique index if not exists idx_product_units_imei2_unique
  on public.product_units(imei2)
  where imei2 is not null and btrim(imei2) <> '';
create unique index if not exists idx_product_units_serial_number_unique
  on public.product_units(serial_number)
  where serial_number is not null and btrim(serial_number) <> '';

create index if not exists idx_product_codes_product_id on public.product_codes(product_id);
create index if not exists idx_product_codes_product_unit_id on public.product_codes(product_unit_id);
create index if not exists idx_product_codes_scope on public.product_codes(scope);

create index if not exists idx_stock_locations_store_active on public.stock_locations(store_id, active);
create index if not exists idx_stock_balances_location_id on public.stock_balances(location_id);
create index if not exists idx_stock_movements_product_id on public.stock_movements(product_id);
create index if not exists idx_stock_movements_product_unit_id on public.stock_movements(product_unit_id);
create index if not exists idx_stock_movements_location_id on public.stock_movements(location_id);
create index if not exists idx_stock_movements_reference on public.stock_movements(reference_type, reference_id);
create index if not exists idx_stock_movements_created_at on public.stock_movements(created_at desc);

create index if not exists idx_cash_terminals_store_active on public.cash_terminals(store_id, active);
create index if not exists idx_cash_sessions_terminal_status on public.cash_sessions(cash_terminal_id, status);
create index if not exists idx_cash_sessions_opened_at on public.cash_sessions(opened_at desc);
create index if not exists idx_cash_movements_session_id on public.cash_movements(cash_session_id);
create index if not exists idx_cash_movements_reference on public.cash_movements(reference_type, reference_id);
create index if not exists idx_cash_movements_created_at on public.cash_movements(created_at desc);

create index if not exists idx_sales_store_status on public.sales(store_id, status);
create index if not exists idx_sales_customer_id on public.sales(customer_id);
create index if not exists idx_sales_user_id on public.sales(user_id);
create index if not exists idx_sales_cash_session_id on public.sales(cash_session_id);
create index if not exists idx_sales_completed_at on public.sales(completed_at desc);
create index if not exists idx_sales_created_at on public.sales(created_at desc);
create index if not exists idx_sale_items_sale_id on public.sale_items(sale_id);
create index if not exists idx_sale_items_product_id on public.sale_items(product_id);
create index if not exists idx_sale_payments_sale_id on public.sale_payments(sale_id);

create index if not exists idx_service_orders_store_status on public.service_orders(store_id, status);
create index if not exists idx_service_orders_customer_id on public.service_orders(customer_id);
create index if not exists idx_service_orders_assigned_to_user_id on public.service_orders(assigned_to_user_id);
create index if not exists idx_service_orders_estimated_completion_date on public.service_orders(estimated_completion_date);
create index if not exists idx_service_orders_created_at on public.service_orders(created_at desc);
create index if not exists idx_service_order_items_service_order_id on public.service_order_items(service_order_id);
create index if not exists idx_service_order_items_product_id on public.service_order_items(product_id);
create index if not exists idx_service_order_history_service_order_id on public.service_order_status_history(service_order_id);
create index if not exists idx_service_order_history_created_at on public.service_order_status_history(created_at desc);
create index if not exists idx_service_order_attachments_service_order_id on public.service_order_attachments(service_order_id);
create index if not exists idx_service_order_attachments_created_at on public.service_order_attachments(created_at desc);
create unique index if not exists idx_service_order_attachments_file_path on public.service_order_attachments(file_path);

create index if not exists idx_purchase_orders_store_status on public.purchase_orders(store_id, status);
create index if not exists idx_purchase_orders_supplier_id on public.purchase_orders(supplier_id);
create index if not exists idx_purchase_orders_ordered_at on public.purchase_orders(ordered_at desc);
create index if not exists idx_purchase_order_items_purchase_order_id on public.purchase_order_items(purchase_order_id);
create index if not exists idx_purchase_order_items_product_id on public.purchase_order_items(product_id);

create index if not exists idx_sale_returns_sale_id on public.sale_returns(sale_id);
create index if not exists idx_sale_returns_customer_id on public.sale_returns(customer_id);
create index if not exists idx_sale_returns_created_at on public.sale_returns(created_at desc);
create index if not exists idx_sale_return_items_sale_return_id on public.sale_return_items(sale_return_id);
create index if not exists idx_sale_return_items_sale_item_id on public.sale_return_items(sale_item_id);

create index if not exists idx_accounts_payable_store_status_due_date
  on public.accounts_payable(store_id, status, due_date);
create index if not exists idx_accounts_payable_supplier_id on public.accounts_payable(supplier_id);
create index if not exists idx_accounts_payable_purchase_order_id on public.accounts_payable(purchase_order_id);

create index if not exists idx_accounts_receivable_store_status_due_date
  on public.accounts_receivable(store_id, status, due_date);
create index if not exists idx_accounts_receivable_customer_id on public.accounts_receivable(customer_id);
create index if not exists idx_accounts_receivable_sale_id on public.accounts_receivable(sale_id);
create index if not exists idx_accounts_receivable_service_order_id on public.accounts_receivable(service_order_id);

create index if not exists idx_audit_logs_store_id_created_at on public.audit_logs(store_id, created_at desc);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

create or replace function public.ensure_category_sequence()
returns trigger
language plpgsql
as $$
begin
  if new.id is null then
    new.id = gen_random_uuid();
  end if;

  if new.sequence_name is null or btrim(new.sequence_name) = '' then
    new.sequence_name = format(
      'category_seq_%s',
      replace(new.id::text, '-', '_')
    );
  end if;

  execute format('create sequence if not exists %I start 1', new.sequence_name);

  return new;
end;
$$;

create or replace function public.set_product_internal_code()
returns trigger
language plpgsql
as $$
declare
  v_sequence_name text;
  v_prefix text;
  v_next bigint;
begin
  if new.internal_code is not null and btrim(new.internal_code) <> '' then
    return new;
  end if;

  select
    c.sequence_name,
    upper(coalesce(nullif(c.prefix, ''), 'PRD'))
  into
    v_sequence_name,
    v_prefix
  from public.categories c
  where c.id = new.category_id;

  if v_sequence_name is null then
    raise exception 'Category % does not have a sequence configured', new.category_id;
  end if;

  execute format('select nextval(%L)', v_sequence_name) into v_next;

  new.internal_code = format('%s-%s', v_prefix, lpad(v_next::text, 6, '0'));

  return new;
end;
$$;

drop trigger if exists trg_stores_set_updated_at on public.stores;
create trigger trg_stores_set_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_set_updated_at on public.customers;
create trigger trg_customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists trg_suppliers_set_updated_at on public.suppliers;
create trigger trg_suppliers_set_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_set_updated_at on public.categories;
create trigger trg_categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_ensure_sequence on public.categories;
create trigger trg_categories_ensure_sequence
before insert or update of sequence_name on public.categories
for each row execute function public.ensure_category_sequence();

drop trigger if exists trg_products_set_updated_at on public.products;
create trigger trg_products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_internal_code on public.products;
create trigger trg_products_internal_code
before insert on public.products
for each row execute function public.set_product_internal_code();

drop trigger if exists trg_product_units_set_updated_at on public.product_units;
create trigger trg_product_units_set_updated_at
before update on public.product_units
for each row execute function public.set_updated_at();

drop trigger if exists trg_stock_balances_set_updated_at on public.stock_balances;
create trigger trg_stock_balances_set_updated_at
before update on public.stock_balances
for each row execute function public.set_updated_at();

drop trigger if exists trg_sales_set_updated_at on public.sales;
create trigger trg_sales_set_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

drop trigger if exists trg_service_orders_set_updated_at on public.service_orders;
create trigger trg_service_orders_set_updated_at
before update on public.service_orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_purchase_orders_set_updated_at on public.purchase_orders;
create trigger trg_purchase_orders_set_updated_at
before update on public.purchase_orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_accounts_payable_set_updated_at on public.accounts_payable;
create trigger trg_accounts_payable_set_updated_at
before update on public.accounts_payable
for each row execute function public.set_updated_at();

drop trigger if exists trg_accounts_receivable_set_updated_at on public.accounts_receivable;
create trigger trg_accounts_receivable_set_updated_at
before update on public.accounts_receivable
for each row execute function public.set_updated_at();

create or replace function public.current_store_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.store_id
  from public.profiles p
  where p.id = auth.uid()
    and p.active is true
  limit 1;
$$;

create or replace function public.same_store(target_store_id uuid)
returns boolean
language sql
stable
as $$
  select auth.uid() is not null
    and target_store_id is not null
    and target_store_id = public.current_store_id();
$$;

create or replace function public.product_in_current_store(target_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.products p
    where p.id = target_product_id
      and p.store_id = public.current_store_id()
  );
$$;

create or replace function public.location_in_current_store(target_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stock_locations l
    where l.id = target_location_id
      and l.store_id = public.current_store_id()
  );
$$;

create or replace function public.cash_terminal_in_current_store(target_cash_terminal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cash_terminals ct
    where ct.id = target_cash_terminal_id
      and ct.store_id = public.current_store_id()
  );
$$;

create or replace function public.cash_session_in_current_store(target_cash_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cash_sessions cs
    join public.cash_terminals ct on ct.id = cs.cash_terminal_id
    where cs.id = target_cash_session_id
      and ct.store_id = public.current_store_id()
  );
$$;

create or replace function public.sale_in_current_store(target_sale_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sales s
    where s.id = target_sale_id
      and s.store_id = public.current_store_id()
  );
$$;

create or replace function public.service_order_in_current_store(target_service_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.service_orders so
    where so.id = target_service_order_id
      and so.store_id = public.current_store_id()
  );
$$;

create or replace function public.purchase_order_in_current_store(target_purchase_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.purchase_orders po
    where po.id = target_purchase_order_id
      and po.store_id = public.current_store_id()
  );
$$;

create or replace function public.sale_return_in_current_store(target_sale_return_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sale_returns sr
    join public.sales s on s.id = sr.sale_id
    where sr.id = target_sale_return_id
      and s.store_id = public.current_store_id()
  );
$$;

alter table public.stores enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_codes enable row level security;
alter table public.product_units enable row level security;
alter table public.stock_locations enable row level security;
alter table public.stock_balances enable row level security;
alter table public.stock_movements enable row level security;
alter table public.cash_terminals enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_payments enable row level security;
alter table public.service_orders enable row level security;
alter table public.service_order_items enable row level security;
alter table public.service_order_status_history enable row level security;
alter table public.service_order_attachments enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.sale_returns enable row level security;
alter table public.sale_return_items enable row level security;
alter table public.accounts_payable enable row level security;
alter table public.accounts_receivable enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists stores_tenant_policy on public.stores;
create policy stores_tenant_policy
on public.stores
for all
to authenticated
using (public.same_store(id))
with check (public.same_store(id));

drop policy if exists roles_authenticated_select on public.roles;
create policy roles_authenticated_select
on public.roles
for select
to authenticated
using (true);

drop policy if exists role_permissions_authenticated_select on public.role_permissions;
create policy role_permissions_authenticated_select
on public.role_permissions
for select
to authenticated
using (true);

drop policy if exists profiles_tenant_policy on public.profiles;
create policy profiles_tenant_policy
on public.profiles
for all
to authenticated
using (public.same_store(store_id))
with check (public.same_store(store_id));

drop policy if exists customers_tenant_policy on public.customers;
create policy customers_tenant_policy
on public.customers
for all
to authenticated
using (public.same_store(store_id))
with check (public.same_store(store_id));

drop policy if exists suppliers_tenant_policy on public.suppliers;
create policy suppliers_tenant_policy
on public.suppliers
for all
to authenticated
using (public.same_store(store_id))
with check (public.same_store(store_id));

drop policy if exists categories_tenant_policy on public.categories;
create policy categories_tenant_policy
on public.categories
for all
to authenticated
using (public.same_store(store_id))
with check (public.same_store(store_id));

drop policy if exists products_tenant_policy on public.products;
create policy products_tenant_policy
on public.products
for all
to authenticated
using (public.same_store(store_id))
with check (public.same_store(store_id));

drop policy if exists product_codes_tenant_policy on public.product_codes;
create policy product_codes_tenant_policy
on public.product_codes
for all
to authenticated
using (public.product_in_current_store(product_id))
with check (public.product_in_current_store(product_id));

drop policy if exists product_units_tenant_policy on public.product_units;
create policy product_units_tenant_policy
on public.product_units
for all
to authenticated
using (public.product_in_current_store(product_id))
with check (public.product_in_current_store(product_id));

drop policy if exists stock_locations_tenant_policy on public.stock_locations;
create policy stock_locations_tenant_policy
on public.stock_locations
for all
to authenticated
using (public.same_store(store_id))
with check (public.same_store(store_id));

drop policy if exists stock_balances_tenant_policy on public.stock_balances;
create policy stock_balances_tenant_policy
on public.stock_balances
for all
to authenticated
using (public.location_in_current_store(location_id))
with check (public.location_in_current_store(location_id));

drop policy if exists stock_movements_tenant_policy on public.stock_movements;
create policy stock_movements_tenant_policy
on public.stock_movements
for all
to authenticated
using (public.location_in_current_store(location_id))
with check (public.location_in_current_store(location_id));

drop policy if exists cash_terminals_tenant_policy on public.cash_terminals;
create policy cash_terminals_tenant_policy
on public.cash_terminals
for all
to authenticated
using (public.same_store(store_id))
with check (public.same_store(store_id));

drop policy if exists cash_sessions_tenant_policy on public.cash_sessions;
create policy cash_sessions_tenant_policy
on public.cash_sessions
for all
to authenticated
using (public.cash_terminal_in_current_store(cash_terminal_id))
with check (public.cash_terminal_in_current_store(cash_terminal_id));

drop policy if exists cash_movements_tenant_policy on public.cash_movements;
create policy cash_movements_tenant_policy
on public.cash_movements
for all
to authenticated
using (public.cash_session_in_current_store(cash_session_id))
with check (public.cash_session_in_current_store(cash_session_id));

drop policy if exists sales_tenant_policy on public.sales;
create policy sales_tenant_policy
on public.sales
for all
to authenticated
using (public.same_store(store_id))
with check (public.same_store(store_id));

drop policy if exists sale_items_tenant_policy on public.sale_items;
create policy sale_items_tenant_policy
on public.sale_items
for all
to authenticated
using (public.sale_in_current_store(sale_id))
with check (public.sale_in_current_store(sale_id));

drop policy if exists sale_payments_tenant_policy on public.sale_payments;
create policy sale_payments_tenant_policy
on public.sale_payments
for all
to authenticated
using (public.sale_in_current_store(sale_id))
with check (public.sale_in_current_store(sale_id));

drop policy if exists service_orders_tenant_policy on public.service_orders;
create policy service_orders_tenant_policy
on public.service_orders
for all
to authenticated
using (public.same_store(store_id))
with check (public.same_store(store_id));

drop policy if exists service_order_items_tenant_policy on public.service_order_items;
create policy service_order_items_tenant_policy
on public.service_order_items
for all
to authenticated
using (public.service_order_in_current_store(service_order_id))
with check (public.service_order_in_current_store(service_order_id));

drop policy if exists service_order_status_history_tenant_policy on public.service_order_status_history;
create policy service_order_status_history_tenant_policy
on public.service_order_status_history
for all
to authenticated
using (public.service_order_in_current_store(service_order_id))
with check (public.service_order_in_current_store(service_order_id));

drop policy if exists service_order_attachments_tenant_policy on public.service_order_attachments;
create policy service_order_attachments_tenant_policy
on public.service_order_attachments
for all
to authenticated
using (public.service_order_in_current_store(service_order_id))
with check (public.service_order_in_current_store(service_order_id));

drop policy if exists purchase_orders_tenant_policy on public.purchase_orders;
create policy purchase_orders_tenant_policy
on public.purchase_orders
for all
to authenticated
using (public.same_store(store_id))
with check (public.same_store(store_id));

drop policy if exists purchase_order_items_tenant_policy on public.purchase_order_items;
create policy purchase_order_items_tenant_policy
on public.purchase_order_items
for all
to authenticated
using (public.purchase_order_in_current_store(purchase_order_id))
with check (public.purchase_order_in_current_store(purchase_order_id));

drop policy if exists sale_returns_tenant_policy on public.sale_returns;
create policy sale_returns_tenant_policy
on public.sale_returns
for all
to authenticated
using (public.sale_in_current_store(sale_id))
with check (public.sale_in_current_store(sale_id));

drop policy if exists sale_return_items_tenant_policy on public.sale_return_items;
create policy sale_return_items_tenant_policy
on public.sale_return_items
for all
to authenticated
using (public.sale_return_in_current_store(sale_return_id))
with check (public.sale_return_in_current_store(sale_return_id));

drop policy if exists accounts_payable_tenant_policy on public.accounts_payable;
create policy accounts_payable_tenant_policy
on public.accounts_payable
for all
to authenticated
using (public.same_store(store_id))
with check (public.same_store(store_id));

drop policy if exists accounts_receivable_tenant_policy on public.accounts_receivable;
create policy accounts_receivable_tenant_policy
on public.accounts_receivable
for all
to authenticated
using (public.same_store(store_id))
with check (public.same_store(store_id));

drop policy if exists audit_logs_tenant_policy on public.audit_logs;
create policy audit_logs_tenant_policy
on public.audit_logs
for all
to authenticated
using (public.same_store(store_id))
with check (public.same_store(store_id));

commit;

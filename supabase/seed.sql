begin;

-- IMPORTANT:
-- Replace the admin profile UUID below in the cash session block before running.
-- It must be an existing public.profiles.id for store LOJA-001.

insert into public.stores (
  id,
  code,
  name,
  display_name,
  active,
  primary_color,
  secondary_color,
  accent_color,
  logo_url,
  banner_url,
  timezone
)
values (
  '11111111-1111-1111-1111-111111111111',
  'LOJA-001',
  'ALPHA TECNOLOGIA',
  'Alpha Tecnologia',
  true,
  '#F97316',
  '#111827',
  '#ffffff',
  null,
  null,
  'America/Sao_Paulo'
)
on conflict (code) do update
set
  name = excluded.name,
  display_name = excluded.display_name,
  active = excluded.active,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  accent_color = excluded.accent_color,
  logo_url = excluded.logo_url,
  banner_url = excluded.banner_url,
  timezone = excluded.timezone,
  updated_at = now();

insert into public.roles (
  id,
  name,
  description,
  active,
  is_system
)
values
  (
    '22222222-2222-2222-2222-222222222221',
    'OWNER',
    'Acesso total ao sistema.',
    true,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'MANAGER',
    'Gestao geral sem configuracoes criticas.',
    true,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    'OPERATOR',
    'Operacao de balcao, PDV, caixa e ordens de servico.',
    true,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222224',
    'VIEWER',
    'Acesso somente leitura.',
    true,
    true
  )
on conflict (name) do update
set
  description = excluded.description,
  active = excluded.active,
  is_system = excluded.is_system;

with desired_permissions(role_name, permission) as (
  values
    ('OWNER', '*'),
    ('MANAGER', 'products.*'),
    ('MANAGER', 'inventory.*'),
    ('MANAGER', 'sales.*'),
    ('MANAGER', 'cash.*'),
    ('MANAGER', 'service_orders.*'),
    ('MANAGER', 'purchase_orders.*'),
    ('MANAGER', 'customers.*'),
    ('MANAGER', 'suppliers.*'),
    ('MANAGER', 'reports.*'),
    ('OPERATOR', 'sales.*'),
    ('OPERATOR', 'cash.*'),
    ('OPERATOR', 'pdv.*'),
    ('OPERATOR', 'service_orders.read'),
    ('OPERATOR', 'inventory.read'),
    ('OPERATOR', 'products.read'),
    ('OPERATOR', 'customers.*'),
    ('VIEWER', 'dashboard.read'),
    ('VIEWER', 'products.read'),
    ('VIEWER', 'inventory.read'),
    ('VIEWER', 'sales.read'),
    ('VIEWER', 'cash.read'),
    ('VIEWER', 'pdv.read'),
    ('VIEWER', 'service_orders.read'),
    ('VIEWER', 'purchase_orders.read'),
    ('VIEWER', 'customers.read'),
    ('VIEWER', 'suppliers.read'),
    ('VIEWER', 'reports.read'),
    ('VIEWER', 'settings.read')
),
seeded_roles as (
  select id, name
  from public.roles
  where name in ('OWNER', 'MANAGER', 'OPERATOR', 'VIEWER')
)
delete from public.role_permissions rp
using seeded_roles sr
where rp.role_id = sr.id
  and not exists (
    select 1
    from desired_permissions dp
    where dp.role_name = sr.name
      and dp.permission = rp.permission
  );

with desired_permissions(role_name, permission) as (
  values
    ('OWNER', '*'),
    ('MANAGER', 'products.*'),
    ('MANAGER', 'inventory.*'),
    ('MANAGER', 'sales.*'),
    ('MANAGER', 'cash.*'),
    ('MANAGER', 'service_orders.*'),
    ('MANAGER', 'purchase_orders.*'),
    ('MANAGER', 'customers.*'),
    ('MANAGER', 'suppliers.*'),
    ('MANAGER', 'reports.*'),
    ('OPERATOR', 'sales.*'),
    ('OPERATOR', 'cash.*'),
    ('OPERATOR', 'pdv.*'),
    ('OPERATOR', 'service_orders.read'),
    ('OPERATOR', 'inventory.read'),
    ('OPERATOR', 'products.read'),
    ('OPERATOR', 'customers.*'),
    ('VIEWER', 'dashboard.read'),
    ('VIEWER', 'products.read'),
    ('VIEWER', 'inventory.read'),
    ('VIEWER', 'sales.read'),
    ('VIEWER', 'cash.read'),
    ('VIEWER', 'pdv.read'),
    ('VIEWER', 'service_orders.read'),
    ('VIEWER', 'purchase_orders.read'),
    ('VIEWER', 'customers.read'),
    ('VIEWER', 'suppliers.read'),
    ('VIEWER', 'reports.read'),
    ('VIEWER', 'settings.read')
)
insert into public.role_permissions (
  role_id,
  permission
)
select
  r.id,
  dp.permission
from desired_permissions dp
join public.roles r on r.name = dp.role_name
on conflict (role_id, permission) do nothing;

with store as (
  select id
  from public.stores
  where code = 'LOJA-001'
),
seed_categories(id, name, prefix, description, default_serialized, sequence_name) as (
  values
    (
      '33333333-3333-3333-3333-333333333301',
      'Celulares',
      'CEL',
      'Smartphones e celulares.',
      true,
      'category_seq_loja_001_cel'
    ),
    (
      '33333333-3333-3333-3333-333333333302',
      'Acessorios',
      'ACE',
      'Acessorios em geral.',
      false,
      'category_seq_loja_001_ace'
    ),
    (
      '33333333-3333-3333-3333-333333333303',
      'Capas',
      'CAP',
      'Capas de protecao.',
      false,
      'category_seq_loja_001_cap'
    ),
    (
      '33333333-3333-3333-3333-333333333304',
      'Peliculas',
      'PEL',
      'Peliculas e vidros de protecao.',
      false,
      'category_seq_loja_001_pel'
    ),
    (
      '33333333-3333-3333-3333-333333333305',
      'Carregadores',
      'CAR',
      'Carregadores e fontes.',
      false,
      'category_seq_loja_001_car'
    ),
    (
      '33333333-3333-3333-3333-333333333306',
      'Fones',
      'FON',
      'Fones de ouvido.',
      false,
      'category_seq_loja_001_fon'
    ),
    (
      '33333333-3333-3333-3333-333333333307',
      'Smartwatches',
      'SWT',
      'Relogios inteligentes.',
      true,
      'category_seq_loja_001_swt'
    ),
    (
      '33333333-3333-3333-3333-333333333308',
      'Tablets',
      'TAB',
      'Tablets e dispositivos similares.',
      true,
      'category_seq_loja_001_tab'
    ),
    (
      '33333333-3333-3333-3333-333333333309',
      'Notebooks',
      'NOT',
      'Notebooks e ultrabooks.',
      true,
      'category_seq_loja_001_not'
    ),
    (
      '33333333-3333-3333-3333-333333333310',
      'Pecas',
      'PEC',
      'Componentes e pecas tecnicas.',
      true,
      'category_seq_loja_001_pec'
    ),
    (
      '33333333-3333-3333-3333-333333333311',
      'Servicos',
      'SRV',
      'Servicos tecnicos.',
      false,
      'category_seq_loja_001_srv'
    )
)
insert into public.categories (
  id,
  store_id,
  name,
  prefix,
  description,
  default_serialized,
  sequence_name,
  active
)
select
  sc.id,
  s.id,
  sc.name,
  sc.prefix,
  sc.description,
  sc.default_serialized,
  sc.sequence_name,
  true
from seed_categories sc
cross join store s
on conflict (store_id, prefix) do update
set
  name = excluded.name,
  description = excluded.description,
  default_serialized = excluded.default_serialized,
  sequence_name = excluded.sequence_name,
  active = excluded.active,
  updated_at = now();

create sequence if not exists public.category_seq_loja_001_cel start 1;
create sequence if not exists public.category_seq_loja_001_ace start 1;
create sequence if not exists public.category_seq_loja_001_cap start 1;
create sequence if not exists public.category_seq_loja_001_pel start 1;
create sequence if not exists public.category_seq_loja_001_car start 1;
create sequence if not exists public.category_seq_loja_001_fon start 1;
create sequence if not exists public.category_seq_loja_001_swt start 1;
create sequence if not exists public.category_seq_loja_001_tab start 1;
create sequence if not exists public.category_seq_loja_001_not start 1;
create sequence if not exists public.category_seq_loja_001_pec start 1;
create sequence if not exists public.category_seq_loja_001_srv start 1;

insert into public.suppliers (
  id,
  store_id,
  name,
  trade_name,
  cnpj,
  email,
  phone,
  contact_name,
  zip_code,
  address,
  city,
  state,
  notes,
  active
)
select
  '44444444-4444-4444-4444-444444444401',
  s.id,
  'PMCELL Sao Paulo',
  'PMCELL Sao Paulo',
  null,
  null,
  null,
  null,
  null,
  null,
  'Sao Paulo',
  'SP',
  'Fornecedor inicial do sistema.',
  true
from public.stores s
where s.code = 'LOJA-001'
on conflict (id) do update
set
  store_id = excluded.store_id,
  name = excluded.name,
  trade_name = excluded.trade_name,
  cnpj = excluded.cnpj,
  email = excluded.email,
  phone = excluded.phone,
  contact_name = excluded.contact_name,
  zip_code = excluded.zip_code,
  address = excluded.address,
  city = excluded.city,
  state = excluded.state,
  notes = excluded.notes,
  active = excluded.active,
  updated_at = now();

insert into public.cash_terminals (
  id,
  store_id,
  name,
  active
)
select
  '55555555-5555-5555-5555-555555555501',
  s.id,
  'Caixa Principal',
  true
from public.stores s
where s.code = 'LOJA-001'
on conflict (store_id, name) do update
set
  active = excluded.active;

insert into public.stock_locations (
  id,
  store_id,
  name,
  description,
  is_default,
  active
)
select
  '66666666-6666-6666-6666-666666666601',
  s.id,
  'Estoque Principal',
  'Local padrao para os produtos da loja.',
  true,
  true
from public.stores s
where s.code = 'LOJA-001'
on conflict (store_id, name) do update
set
  description = excluded.description,
  is_default = excluded.is_default,
  active = excluded.active;

with store as (
  select id
  from public.stores
  where code = 'LOJA-001'
),
product_seed(
  internal_code,
  category_prefix,
  supplier_id,
  name,
  description,
  brand,
  model,
  cost_price,
  sale_price,
  stock_min,
  has_serial_control,
  needs_price_review,
  is_service,
  active
) as (
  values
    (
      'CEL-000001',
      'CEL',
      '44444444-4444-4444-4444-444444444401'::uuid,
      'iPhone 15 128GB',
      'Smartphone Apple iPhone 15 com 128GB.',
      'Apple',
      'iPhone 15',
      0::numeric(14,2),
      0::numeric(14,2),
      0::numeric(14,3),
      true,
      false,
      false,
      true
    ),
    (
      'CEL-000002',
      'CEL',
      '44444444-4444-4444-4444-444444444401'::uuid,
      'Samsung Galaxy A55',
      'Smartphone Samsung Galaxy A55.',
      'Samsung',
      'Galaxy A55',
      0::numeric(14,2),
      0::numeric(14,2),
      0::numeric(14,3),
      true,
      false,
      false,
      true
    ),
    (
      'CAP-000001',
      'CAP',
      '44444444-4444-4444-4444-444444444401'::uuid,
      'Capa iPhone 15 Silicone',
      'Capa de silicone para iPhone 15.',
      null,
      'iPhone 15',
      0::numeric(14,2),
      0::numeric(14,2),
      0::numeric(14,3),
      false,
      false,
      false,
      true
    ),
    (
      'PEL-000001',
      'PEL',
      '44444444-4444-4444-4444-444444444401'::uuid,
      'Pelicula Vidro iPhone 15',
      'Pelicula de vidro para iPhone 15.',
      null,
      'iPhone 15',
      0::numeric(14,2),
      0::numeric(14,2),
      0::numeric(14,3),
      false,
      false,
      false,
      true
    ),
    (
      'CAR-000001',
      'CAR',
      '44444444-4444-4444-4444-444444444401'::uuid,
      'Carregador USB-C 20W',
      'Carregador USB-C de 20W.',
      null,
      '20W',
      0::numeric(14,2),
      0::numeric(14,2),
      0::numeric(14,3),
      false,
      false,
      false,
      true
    ),
    (
      'FON-000001',
      'FON',
      '44444444-4444-4444-4444-444444444401'::uuid,
      'Fone Bluetooth JBL',
      'Fone Bluetooth JBL.',
      'JBL',
      null,
      0::numeric(14,2),
      0::numeric(14,2),
      0::numeric(14,3),
      false,
      false,
      false,
      true
    ),
    (
      'ACE-000001',
      'ACE',
      '44444444-4444-4444-4444-444444444401'::uuid,
      'Cabo USB-C 1m',
      'Cabo USB-C com 1 metro.',
      null,
      '1m',
      0::numeric(14,2),
      0::numeric(14,2),
      0::numeric(14,3),
      false,
      false,
      false,
      true
    ),
    (
      'PEL-000002',
      'PEL',
      '44444444-4444-4444-4444-444444444401'::uuid,
      'Pelicula Samsung A55',
      'Pelicula de protecao para Samsung Galaxy A55.',
      null,
      'Galaxy A55',
      0::numeric(14,2),
      0::numeric(14,2),
      0::numeric(14,3),
      false,
      false,
      false,
      true
    ),
    (
      'CAP-000002',
      'CAP',
      '44444444-4444-4444-4444-444444444401'::uuid,
      'Capa Samsung A55',
      'Capa de protecao para Samsung Galaxy A55.',
      null,
      'Galaxy A55',
      0::numeric(14,2),
      0::numeric(14,2),
      0::numeric(14,3),
      false,
      false,
      false,
      true
    ),
    (
      'SRV-000001',
      'SRV',
      null::uuid,
      'Troca de Tela iPhone 15',
      'Servico de troca de tela para iPhone 15.',
      'Apple',
      'iPhone 15',
      0::numeric(14,2),
      0::numeric(14,2),
      0::numeric(14,3),
      false,
      false,
      true,
      true
    )
)
insert into public.products (
  store_id,
  category_id,
  supplier_id,
  name,
  description,
  brand,
  model,
  image_url,
  internal_code,
  supplier_code,
  ncm,
  cest,
  cfop_default,
  origin_code,
  tax_category,
  cost_price,
  sale_price,
  stock_min,
  has_serial_control,
  needs_price_review,
  is_service,
  active
)
select
  s.id,
  c.id,
  ps.supplier_id,
  ps.name,
  ps.description,
  ps.brand,
  ps.model,
  null,
  ps.internal_code,
  null,
  null,
  null,
  null,
  null,
  null,
  ps.cost_price,
  ps.sale_price,
  ps.stock_min,
  ps.has_serial_control,
  ps.needs_price_review,
  ps.is_service,
  ps.active
from product_seed ps
cross join store s
join public.categories c
  on c.store_id = s.id
 and c.prefix = ps.category_prefix
on conflict (store_id, internal_code) do update
set
  category_id = excluded.category_id,
  supplier_id = excluded.supplier_id,
  name = excluded.name,
  description = excluded.description,
  brand = excluded.brand,
  model = excluded.model,
  cost_price = excluded.cost_price,
  sale_price = excluded.sale_price,
  stock_min = excluded.stock_min,
  has_serial_control = excluded.has_serial_control,
  needs_price_review = excluded.needs_price_review,
  is_service = excluded.is_service,
  active = excluded.active,
  updated_at = now();

-- Align category sequences with the seeded internal codes to avoid future collisions.
select setval('public.category_seq_loja_001_cel', 2, true);
select setval('public.category_seq_loja_001_ace', 1, true);
select setval('public.category_seq_loja_001_cap', 2, true);
select setval('public.category_seq_loja_001_pel', 2, true);
select setval('public.category_seq_loja_001_car', 1, true);
select setval('public.category_seq_loja_001_fon', 1, true);
select setval('public.category_seq_loja_001_swt', 1, false);
select setval('public.category_seq_loja_001_tab', 1, false);
select setval('public.category_seq_loja_001_not', 1, false);
select setval('public.category_seq_loja_001_pec', 1, false);
select setval('public.category_seq_loja_001_srv', 1, true);

do $$
declare
  v_cash_session_id constant uuid := '77777777-7777-7777-7777-777777777701';
  v_admin_profile_id constant uuid := '00000000-0000-0000-0000-000000000000';
  v_store_id uuid;
  v_cash_terminal_id uuid;
begin
  if exists (
    select 1
    from public.cash_sessions
    where id = v_cash_session_id
  ) then
    return;
  end if;

  if v_admin_profile_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception
      'Replace v_admin_profile_id in supabase/seed.sql with an existing public.profiles.id before running the seed.';
  end if;

  select id
  into v_store_id
  from public.stores
  where code = 'LOJA-001'
  limit 1;

  if v_store_id is null then
    raise exception 'Store LOJA-001 was not found.';
  end if;

  select ct.id
  into v_cash_terminal_id
  from public.cash_terminals ct
  where ct.store_id = v_store_id
    and ct.name = 'Caixa Principal'
  limit 1;

  if v_cash_terminal_id is null then
    raise exception 'Cash terminal Caixa Principal was not found for store LOJA-001.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_admin_profile_id
      and p.store_id = v_store_id
  ) then
    raise exception
      'Profile % was not found in public.profiles for store LOJA-001.',
      v_admin_profile_id;
  end if;

  insert into public.cash_sessions (
    id,
    cash_terminal_id,
    opened_by,
    closed_by,
    status,
    opening_amount,
    expected_amount,
    closing_amount,
    difference,
    opened_at,
    closed_at,
    notes
  )
  values (
    v_cash_session_id,
    v_cash_terminal_id,
    v_admin_profile_id,
    null,
    'OPEN',
    0,
    0,
    null,
    null,
    now(),
    null,
    'Sessao inicial do sistema'
  );
end $$;

commit;

begin;

create or replace function public.inventory_entry(
  p_store_id uuid,
  p_user_id uuid,
  p_product_id uuid,
  p_location_id uuid,
  p_quantity numeric,
  p_unit_cost numeric,
  p_notes text default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_reference_id uuid := gen_random_uuid();
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'A quantidade da entrada deve ser maior que zero.';
  end if;

  if p_unit_cost is null or p_unit_cost < 0 then
    raise exception 'O custo unitário da entrada não pode ser negativo.';
  end if;

  if not exists (
    select 1
    from public.products
    where id = p_product_id
      and store_id = p_store_id
      and is_service = false
  ) then
    raise exception 'O produto informado não pertence à loja atual ou não controla estoque.';
  end if;

  if not exists (
    select 1
    from public.stock_locations
    where id = p_location_id
      and store_id = p_store_id
  ) then
    raise exception 'O local informado não pertence à loja atual.';
  end if;

  insert into public.stock_balances (
    product_id,
    location_id,
    quantity
  )
  values (
    p_product_id,
    p_location_id,
    p_quantity
  )
  on conflict (product_id, location_id)
  do update
    set quantity = public.stock_balances.quantity + excluded.quantity,
        updated_at = now();

  insert into public.stock_movements (
    product_id,
    product_unit_id,
    location_id,
    movement_type,
    quantity,
    unit_cost,
    reference_type,
    reference_id,
    notes,
    user_id
  )
  values (
    p_product_id,
    null,
    p_location_id,
    'IN',
    p_quantity,
    p_unit_cost,
    'MANUAL',
    v_reference_id,
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_user_id
  );

  return v_reference_id;
end;
$$;

create or replace function public.inventory_adjustment(
  p_store_id uuid,
  p_user_id uuid,
  p_product_id uuid,
  p_location_id uuid,
  p_new_quantity numeric,
  p_reason text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_reference_id uuid := gen_random_uuid();
  v_current_quantity numeric := 0;
  v_difference numeric := 0;
  v_movement_type public.stock_movement_type_enum;
begin
  if p_new_quantity is null or p_new_quantity < 0 then
    raise exception 'A quantidade nova do ajuste não pode ser negativa.';
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'O motivo do ajuste é obrigatório.';
  end if;

  if not exists (
    select 1
    from public.products
    where id = p_product_id
      and store_id = p_store_id
      and is_service = false
  ) then
    raise exception 'O produto informado não pertence à loja atual ou não controla estoque.';
  end if;

  if not exists (
    select 1
    from public.stock_locations
    where id = p_location_id
      and store_id = p_store_id
  ) then
    raise exception 'O local informado não pertence à loja atual.';
  end if;

  insert into public.stock_balances (
    product_id,
    location_id,
    quantity
  )
  values (
    p_product_id,
    p_location_id,
    0
  )
  on conflict (product_id, location_id) do nothing;

  select quantity
  into v_current_quantity
  from public.stock_balances
  where product_id = p_product_id
    and location_id = p_location_id
  for update;

  v_current_quantity := coalesce(v_current_quantity, 0);
  v_difference := p_new_quantity - v_current_quantity;

  if v_difference = 0 then
    raise exception 'O ajuste precisa alterar o saldo atual.';
  end if;

  update public.stock_balances
  set quantity = p_new_quantity,
      updated_at = now()
  where product_id = p_product_id
    and location_id = p_location_id;

  v_movement_type := case
    when v_difference > 0 then 'ADJUSTMENT_POSITIVE'
    else 'ADJUSTMENT_NEGATIVE'
  end;

  insert into public.stock_movements (
    product_id,
    product_unit_id,
    location_id,
    movement_type,
    quantity,
    unit_cost,
    reference_type,
    reference_id,
    notes,
    user_id
  )
  values (
    p_product_id,
    null,
    p_location_id,
    v_movement_type,
    abs(v_difference),
    0,
    'INVENTORY_ADJUSTMENT',
    v_reference_id,
    btrim(p_reason),
    p_user_id
  );

  return v_reference_id;
end;
$$;

create or replace function public.inventory_transfer(
  p_store_id uuid,
  p_user_id uuid,
  p_product_id uuid,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_quantity numeric,
  p_notes text default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_reference_id uuid := gen_random_uuid();
  v_source_quantity numeric := 0;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'A quantidade da transferência deve ser maior que zero.';
  end if;

  if p_from_location_id = p_to_location_id then
    raise exception 'Os locais de origem e destino precisam ser diferentes.';
  end if;

  if not exists (
    select 1
    from public.products
    where id = p_product_id
      and store_id = p_store_id
      and is_service = false
  ) then
    raise exception 'O produto informado não pertence à loja atual ou não controla estoque.';
  end if;

  if not exists (
    select 1
    from public.stock_locations
    where id = p_from_location_id
      and store_id = p_store_id
  ) then
    raise exception 'O local de origem não pertence à loja atual.';
  end if;

  if not exists (
    select 1
    from public.stock_locations
    where id = p_to_location_id
      and store_id = p_store_id
  ) then
    raise exception 'O local de destino não pertence à loja atual.';
  end if;

  insert into public.stock_balances (
    product_id,
    location_id,
    quantity
  )
  values (
    p_product_id,
    p_from_location_id,
    0
  )
  on conflict (product_id, location_id) do nothing;

  select quantity
  into v_source_quantity
  from public.stock_balances
  where product_id = p_product_id
    and location_id = p_from_location_id
  for update;

  v_source_quantity := coalesce(v_source_quantity, 0);

  if v_source_quantity < p_quantity then
    raise exception 'Estoque insuficiente no local de origem.';
  end if;

  update public.stock_balances
  set quantity = quantity - p_quantity,
      updated_at = now()
  where product_id = p_product_id
    and location_id = p_from_location_id;

  insert into public.stock_balances (
    product_id,
    location_id,
    quantity
  )
  values (
    p_product_id,
    p_to_location_id,
    p_quantity
  )
  on conflict (product_id, location_id)
  do update
    set quantity = public.stock_balances.quantity + excluded.quantity,
        updated_at = now();

  insert into public.stock_movements (
    product_id,
    product_unit_id,
    location_id,
    movement_type,
    quantity,
    unit_cost,
    reference_type,
    reference_id,
    notes,
    user_id
  )
  values
  (
    p_product_id,
    null,
    p_from_location_id,
    'TRANSFER_OUT',
    p_quantity,
    0,
    'MANUAL',
    v_reference_id,
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_user_id
  ),
  (
    p_product_id,
    null,
    p_to_location_id,
    'TRANSFER_IN',
    p_quantity,
    0,
    'MANUAL',
    v_reference_id,
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_user_id
  );

  return v_reference_id;
end;
$$;

create or replace function public.inventory_create_location(
  p_store_id uuid,
  p_name text,
  p_description text default null,
  p_is_default boolean default false,
  p_active boolean default true
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_location_id uuid := gen_random_uuid();
begin
  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'O nome do local é obrigatório.';
  end if;

  if p_is_default then
    update public.stock_locations
    set is_default = false
    where store_id = p_store_id
      and is_default = true;
  end if;

  insert into public.stock_locations (
    id,
    store_id,
    name,
    description,
    is_default,
    active
  )
  values (
    v_location_id,
    p_store_id,
    btrim(p_name),
    nullif(btrim(coalesce(p_description, '')), ''),
    coalesce(p_is_default, false),
    coalesce(p_active, true)
  );

  return v_location_id;
end;
$$;

commit;

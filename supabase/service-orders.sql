begin;

create or replace function public.service_order_create(
  p_store_id uuid,
  p_user_id uuid,
  p_customer_id uuid,
  p_assigned_to_user_id uuid default null,
  p_device_type text default null,
  p_brand text default null,
  p_model text default null,
  p_imei text default null,
  p_serial_number text default null,
  p_color text default null,
  p_accessories text default null,
  p_reported_issue text default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_service_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_order_sequence integer;
  v_store_timezone text := 'America/Sao_Paulo';
  v_order_date_token text;
begin
  if nullif(btrim(coalesce(p_device_type, '')), '') is null then
    raise exception 'Informe o tipo do aparelho.';
  end if;

  if nullif(btrim(coalesce(p_reported_issue, '')), '') is null then
    raise exception 'Descreva o problema relatado.';
  end if;

  if not exists (
    select 1
    from public.customers c
    where c.id = p_customer_id
      and c.store_id = p_store_id
  ) then
    raise exception 'O cliente informado não pertence à loja atual.';
  end if;

  if p_assigned_to_user_id is not null and not exists (
    select 1
    from public.profiles p
    where p.id = p_assigned_to_user_id
      and p.store_id = p_store_id
  ) then
    raise exception 'O técnico informado não pertence à loja atual.';
  end if;

  select
    coalesce(nullif(s.timezone, ''), 'America/Sao_Paulo')
  into v_store_timezone
  from public.stores s
  where s.id = p_store_id;

  if not found then
    raise exception 'A loja informada não foi encontrada.';
  end if;

  v_order_date_token := to_char(
    now() at time zone v_store_timezone,
    'YYYYMMDD'
  );

  perform pg_advisory_xact_lock(
    hashtext(p_store_id::text),
    hashtext(v_order_date_token)
  );

  select count(*) + 1
  into v_order_sequence
  from public.service_orders so
  where so.store_id = p_store_id
    and to_char(so.created_at at time zone v_store_timezone, 'YYYYMMDD') = v_order_date_token;

  v_order_number := format(
    'OS-%s-%s',
    v_order_date_token,
    lpad(v_order_sequence::text, 3, '0')
  );

  insert into public.service_orders (
    id,
    store_id,
    customer_id,
    created_by_user_id,
    assigned_to_user_id,
    order_number,
    status,
    device_type,
    brand,
    model,
    imei,
    serial_number,
    color,
    accessories,
    reported_issue
  )
  values (
    v_service_order_id,
    p_store_id,
    p_customer_id,
    p_user_id,
    p_assigned_to_user_id,
    v_order_number,
    'OPEN',
    btrim(p_device_type),
    nullif(btrim(coalesce(p_brand, '')), ''),
    nullif(btrim(coalesce(p_model, '')), ''),
    nullif(btrim(coalesce(p_imei, '')), ''),
    nullif(btrim(coalesce(p_serial_number, '')), ''),
    nullif(btrim(coalesce(p_color, '')), ''),
    nullif(btrim(coalesce(p_accessories, '')), ''),
    btrim(p_reported_issue)
  );

  insert into public.service_order_status_history (
    service_order_id,
    old_status,
    new_status,
    notes,
    changed_by_user_id
  )
  values (
    v_service_order_id,
    null,
    'OPEN',
    'OS criada',
    p_user_id
  );

  return v_service_order_id;
end;
$$;

create or replace function public.service_order_change_status(
  p_store_id uuid,
  p_user_id uuid,
  p_service_order_id uuid,
  p_new_status public.service_order_status_enum,
  p_notes text default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_current_status public.service_order_status_enum;
begin
  select so.status
  into v_current_status
  from public.service_orders so
  where so.id = p_service_order_id
    and so.store_id = p_store_id
  for update;

  if not found then
    raise exception 'A ordem de serviço informada não pertence à loja atual.';
  end if;

  if v_current_status = p_new_status then
    raise exception 'A OS já está no status %.', p_new_status;
  end if;

  case v_current_status
    when 'OPEN' then
      if p_new_status not in ('WAITING_APPROVAL', 'CANCELLED') then
        raise exception 'A OS aberta só pode seguir para aguardando aprovação ou cancelada.';
      end if;
    when 'WAITING_APPROVAL' then
      if p_new_status not in ('APPROVED', 'REJECTED', 'CANCELLED') then
        raise exception 'A OS aguardando aprovação só pode ser aprovada, rejeitada ou cancelada.';
      end if;
    when 'APPROVED' then
      if p_new_status not in ('IN_PROGRESS', 'CANCELLED') then
        raise exception 'A OS aprovada só pode iniciar o serviço ou ser cancelada.';
      end if;
    when 'IN_PROGRESS' then
      if p_new_status not in ('READY_FOR_DELIVERY', 'CANCELLED') then
        raise exception 'A OS em andamento só pode ficar pronta para entrega ou ser cancelada.';
      end if;
    when 'READY_FOR_DELIVERY' then
      if p_new_status not in ('DELIVERED', 'CANCELLED') then
        raise exception 'A OS pronta para entrega só pode ser entregue ou cancelada.';
      end if;
    else
      raise exception 'A OS está encerrada e não pode mais mudar de status.';
  end case;

  update public.service_orders
  set status = p_new_status,
      approved_at = case
        when p_new_status = 'APPROVED' and approved_at is null then now()
        else approved_at
      end,
      delivered_at = case
        when p_new_status = 'DELIVERED' then now()
        else delivered_at
      end,
      updated_at = now()
  where id = p_service_order_id
    and store_id = p_store_id;

  insert into public.service_order_status_history (
    service_order_id,
    old_status,
    new_status,
    notes,
    changed_by_user_id
  )
  values (
    p_service_order_id,
    v_current_status,
    p_new_status,
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_user_id
  );

  return p_service_order_id;
end;
$$;

create or replace function public.service_order_add_item(
  p_store_id uuid,
  p_user_id uuid,
  p_service_order_id uuid,
  p_product_id uuid,
  p_description text default null,
  p_quantity numeric default 1,
  p_unit_price numeric default 0
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_service_order_status public.service_order_status_enum;
  v_order_number text;
  v_default_location_id uuid;
  v_available_balance numeric := 0;
  v_total_price numeric := 0;
  v_product_name text;
  v_product_internal_code text;
  v_product_cost numeric := 0;
  v_has_serial_control boolean := false;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'A quantidade da peça deve ser maior que zero.';
  end if;

  if p_unit_price is null or p_unit_price < 0 then
    raise exception 'O valor unitário da peça não pode ser negativo.';
  end if;

  select
    so.status,
    so.order_number
  into
    v_service_order_status,
    v_order_number
  from public.service_orders so
  where so.id = p_service_order_id
    and so.store_id = p_store_id
  for update;

  if not found then
    raise exception 'A ordem de serviço informada não pertence à loja atual.';
  end if;

  if v_service_order_status in ('DELIVERED', 'REJECTED', 'CANCELLED') then
    raise exception 'A OS já está encerrada e não permite consumo de novas peças.';
  end if;

  select
    sl.id
  into v_default_location_id
  from public.stock_locations sl
  where sl.store_id = p_store_id
    and sl.active = true
    and sl.is_default = true
  order by sl.created_at asc
  limit 1;

  if v_default_location_id is null then
    raise exception 'Configure um local de estoque padrão antes de consumir peças na OS.';
  end if;

  select
    p.name,
    p.internal_code,
    coalesce(p.cost_price, 0),
    p.has_serial_control
  into
    v_product_name,
    v_product_internal_code,
    v_product_cost,
    v_has_serial_control
  from public.products p
  where p.id = p_product_id
    and p.store_id = p_store_id
    and p.active = true
    and p.is_service = false
  for update;

  if not found then
    raise exception 'A peça selecionada não pertence à loja atual ou está inativa.';
  end if;

  if v_has_serial_control then
    raise exception 'Peças serializadas exigem seleção da unidade específica e não podem ser lançadas por este fluxo.';
  end if;

  insert into public.stock_balances (
    product_id,
    location_id,
    quantity
  )
  values (
    p_product_id,
    v_default_location_id,
    0
  )
  on conflict (product_id, location_id) do nothing;

  select sb.quantity
  into v_available_balance
  from public.stock_balances sb
  where sb.product_id = p_product_id
    and sb.location_id = v_default_location_id
  for update;

  if coalesce(v_available_balance, 0) < p_quantity then
    raise exception 'Estoque insuficiente para a peça %.', v_product_name;
  end if;

  v_total_price := round(p_quantity * p_unit_price);

  update public.stock_balances
  set quantity = quantity - p_quantity,
      updated_at = now()
  where product_id = p_product_id
    and location_id = v_default_location_id;

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
    v_default_location_id,
    'SERVICE_CONSUMPTION',
    p_quantity,
    greatest(coalesce(v_product_cost, 0), 0),
    'SERVICE_ORDER',
    p_service_order_id,
    format('Consumo em %s - %s', v_order_number, coalesce(v_product_internal_code, v_product_name)),
    p_user_id
  );

  insert into public.service_order_items (
    service_order_id,
    product_id,
    item_type,
    description,
    quantity,
    unit_price,
    total_price,
    stock_consumed
  )
  values (
    p_service_order_id,
    p_product_id,
    'PART',
    coalesce(
      nullif(btrim(coalesce(p_description, '')), ''),
      format('%s%s', v_product_name, case when v_product_internal_code is not null then format(' (%s)', v_product_internal_code) else '' end)
    ),
    p_quantity,
    p_unit_price,
    v_total_price,
    true
  );

  update public.service_orders
  set total_estimated = coalesce(total_estimated, 0) + v_total_price,
      total_final = coalesce(total_final, 0) + v_total_price,
      updated_at = now()
  where id = p_service_order_id
    and store_id = p_store_id;

  return p_service_order_id;
end;
$$;

commit;

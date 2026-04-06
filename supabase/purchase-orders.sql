begin;

create or replace function public.purchase_order_create(
  p_store_id uuid,
  p_user_id uuid,
  p_supplier_id uuid,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_purchase_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_order_sequence integer;
  v_store_timezone text := 'America/Sao_Paulo';
  v_order_date_token text;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_item record;
begin
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Adicione pelo menos um item ao pedido de compra.';
  end if;

  if not exists (
    select 1
    from public.suppliers s
    where s.id = p_supplier_id
      and s.store_id = p_store_id
  ) then
    raise exception 'O fornecedor informado não pertence à loja atual.';
  end if;

  select
    coalesce(nullif(s.timezone, ''), 'America/Sao_Paulo')
  into v_store_timezone
  from public.stores s
  where s.id = p_store_id;

  if not found then
    raise exception 'A loja informada não foi encontrada.';
  end if;

  for v_item in
    select
      item.product_id,
      item.description,
      item.quantity,
      item.unit_cost
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      product_id uuid,
      description text,
      quantity numeric,
      unit_cost numeric
    )
  loop
    if v_item.product_id is null then
      raise exception 'Todos os itens do pedido precisam ter um produto definido.';
    end if;

    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'A quantidade dos itens do pedido precisa ser maior que zero.';
    end if;

    if v_item.unit_cost is null or v_item.unit_cost < 0 then
      raise exception 'O custo unitário dos itens do pedido não pode ser negativo.';
    end if;

    if not exists (
      select 1
      from public.products p
      where p.id = v_item.product_id
        and p.store_id = p_store_id
        and p.active = true
    ) then
      raise exception 'Um dos produtos do pedido não pertence à loja atual ou está inativo.';
    end if;

    v_subtotal := v_subtotal + round(v_item.quantity * v_item.unit_cost);
  end loop;

  v_total := v_subtotal;

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
  from public.purchase_orders po
  where po.store_id = p_store_id
    and to_char(po.created_at at time zone v_store_timezone, 'YYYYMMDD') = v_order_date_token;

  v_order_number := format(
    'PC-%s-%s',
    v_order_date_token,
    lpad(v_order_sequence::text, 3, '0')
  );

  insert into public.purchase_orders (
    id,
    store_id,
    supplier_id,
    created_by_user_id,
    order_number,
    status,
    notes,
    subtotal,
    discount_amount,
    total,
    ordered_at
  )
  values (
    v_purchase_order_id,
    p_store_id,
    p_supplier_id,
    p_user_id,
    v_order_number,
    'ORDERED',
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_subtotal,
    0,
    v_total,
    now()
  );

  for v_item in
    select
      item.product_id,
      item.description,
      item.quantity,
      item.unit_cost
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      product_id uuid,
      description text,
      quantity numeric,
      unit_cost numeric
    )
  loop
    insert into public.purchase_order_items (
      purchase_order_id,
      product_id,
      description,
      quantity,
      unit_cost,
      total_cost,
      received_quantity
    )
    select
      v_purchase_order_id,
      p.id,
      coalesce(
        nullif(btrim(coalesce(v_item.description, '')), ''),
        format('%s (%s)', p.name, p.internal_code)
      ),
      v_item.quantity,
      v_item.unit_cost,
      round(v_item.quantity * v_item.unit_cost),
      0
    from public.products p
    where p.id = v_item.product_id;
  end loop;

  return v_purchase_order_id;
end;
$$;

create or replace function public.purchase_order_update(
  p_store_id uuid,
  p_purchase_order_id uuid,
  p_supplier_id uuid,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_status public.purchase_order_status_enum;
  v_received_total numeric := 0;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_item record;
begin
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Adicione pelo menos um item ao pedido de compra.';
  end if;

  if not exists (
    select 1
    from public.suppliers s
    where s.id = p_supplier_id
      and s.store_id = p_store_id
  ) then
    raise exception 'O fornecedor informado não pertence à loja atual.';
  end if;

  select po.status
  into v_status
  from public.purchase_orders po
  where po.id = p_purchase_order_id
    and po.store_id = p_store_id
  for update;

  if not found then
    raise exception 'O pedido de compra informado não pertence à loja atual.';
  end if;

  if v_status in ('PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED') then
    raise exception 'Pedidos parcialmente recebidos, recebidos ou cancelados não podem ser editados por este fluxo.';
  end if;

  select coalesce(sum(poi.received_quantity), 0)
  into v_received_total
  from public.purchase_order_items poi
  where poi.purchase_order_id = p_purchase_order_id;

  if coalesce(v_received_total, 0) > 0 then
    raise exception 'O pedido já possui recebimentos lançados e não pode ser refeito.';
  end if;

  for v_item in
    select
      item.product_id,
      item.description,
      item.quantity,
      item.unit_cost
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      product_id uuid,
      description text,
      quantity numeric,
      unit_cost numeric
    )
  loop
    if v_item.product_id is null then
      raise exception 'Todos os itens do pedido precisam ter um produto definido.';
    end if;

    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'A quantidade dos itens do pedido precisa ser maior que zero.';
    end if;

    if v_item.unit_cost is null or v_item.unit_cost < 0 then
      raise exception 'O custo unitário dos itens do pedido não pode ser negativo.';
    end if;

    if not exists (
      select 1
      from public.products p
      where p.id = v_item.product_id
        and p.store_id = p_store_id
        and p.active = true
    ) then
      raise exception 'Um dos produtos do pedido não pertence à loja atual ou está inativo.';
    end if;

    v_subtotal := v_subtotal + round(v_item.quantity * v_item.unit_cost);
  end loop;

  v_total := v_subtotal;

  delete from public.purchase_order_items
  where purchase_order_id = p_purchase_order_id;

  for v_item in
    select
      item.product_id,
      item.description,
      item.quantity,
      item.unit_cost
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      product_id uuid,
      description text,
      quantity numeric,
      unit_cost numeric
    )
  loop
    insert into public.purchase_order_items (
      purchase_order_id,
      product_id,
      description,
      quantity,
      unit_cost,
      total_cost,
      received_quantity
    )
    select
      p_purchase_order_id,
      p.id,
      coalesce(
        nullif(btrim(coalesce(v_item.description, '')), ''),
        format('%s (%s)', p.name, p.internal_code)
      ),
      v_item.quantity,
      v_item.unit_cost,
      round(v_item.quantity * v_item.unit_cost),
      0
    from public.products p
    where p.id = v_item.product_id;
  end loop;

  update public.purchase_orders
  set supplier_id = p_supplier_id,
      notes = nullif(btrim(coalesce(p_notes, '')), ''),
      subtotal = v_subtotal,
      discount_amount = 0,
      total = v_total,
      status = 'ORDERED',
      ordered_at = coalesce(ordered_at, now()),
      updated_at = now()
  where id = p_purchase_order_id
    and store_id = p_store_id;

  return p_purchase_order_id;
end;
$$;

create or replace function public.purchase_order_receive(
  p_store_id uuid,
  p_user_id uuid,
  p_purchase_order_id uuid,
  p_due_date date,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_reference_id uuid := gen_random_uuid();
  v_default_location_id uuid;
  v_purchase_order record;
  v_item record;
  v_existing_item record;
  v_received_amount numeric := 0;
  v_remaining_items integer := 0;
  v_product_name text;
  v_product_cost numeric := 0;
  v_has_serial_control boolean := false;
begin
  if p_due_date is null then
    raise exception 'Informe a data de vencimento do contas a pagar.';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Informe pelo menos um item para recebimento.';
  end if;

  select
    po.id,
    po.order_number,
    po.supplier_id,
    po.status
  into v_purchase_order
  from public.purchase_orders po
  where po.id = p_purchase_order_id
    and po.store_id = p_store_id
  for update;

  if not found then
    raise exception 'O pedido de compra informado não pertence à loja atual.';
  end if;

  if v_purchase_order.status in ('RECEIVED', 'CANCELLED') then
    raise exception 'O pedido selecionado não permite novos recebimentos.';
  end if;

  select sl.id
  into v_default_location_id
  from public.stock_locations sl
  where sl.store_id = p_store_id
    and sl.active = true
    and sl.is_default = true
  order by sl.created_at asc
  limit 1;

  if v_default_location_id is null then
    raise exception 'Configure um local de estoque padrão antes de receber compras.';
  end if;

  for v_item in
    select
      item.purchase_order_item_id,
      item.received_quantity
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      purchase_order_item_id uuid,
      received_quantity numeric
    )
  loop
    if v_item.purchase_order_item_id is null then
      raise exception 'Todos os itens de recebimento precisam informar o item do pedido.';
    end if;

    if v_item.received_quantity is null or v_item.received_quantity <= 0 then
      raise exception 'A quantidade recebida precisa ser maior que zero.';
    end if;

    select
      poi.id,
      poi.product_id,
      poi.quantity,
      poi.unit_cost,
      poi.received_quantity
    into v_existing_item
    from public.purchase_order_items poi
    where poi.id = v_item.purchase_order_item_id
      and poi.purchase_order_id = p_purchase_order_id
    for update;

    if not found then
      raise exception 'Um dos itens informados não pertence ao pedido de compra.';
    end if;

    if v_existing_item.received_quantity + v_item.received_quantity > v_existing_item.quantity then
      raise exception 'A quantidade recebida ultrapassa o saldo pendente de um dos itens.';
    end if;

    select
      p.name,
      coalesce(p.cost_price, 0),
      p.has_serial_control
    into
      v_product_name,
      v_product_cost,
      v_has_serial_control
    from public.products p
    where p.id = v_existing_item.product_id
      and p.store_id = p_store_id
    for update;

    if not found then
      raise exception 'Um dos produtos do pedido não pertence mais à loja atual.';
    end if;

    if v_has_serial_control then
      raise exception 'Produtos com controle serial exigem entrada por unidade e não podem ser recebidos por este fluxo.';
    end if;

    insert into public.stock_balances (
      product_id,
      location_id,
      quantity
    )
    values (
      v_existing_item.product_id,
      v_default_location_id,
      0
    )
    on conflict (product_id, location_id) do nothing;

    update public.stock_balances
    set quantity = quantity + v_item.received_quantity,
        updated_at = now()
    where product_id = v_existing_item.product_id
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
      v_existing_item.product_id,
      null,
      v_default_location_id,
      'PURCHASE',
      v_item.received_quantity,
      greatest(coalesce(v_existing_item.unit_cost, v_product_cost, 0), 0),
      'PURCHASE_ORDER',
      p_purchase_order_id,
      format('Recebimento do pedido %s - %s', v_purchase_order.order_number, v_product_name),
      p_user_id
    );

    update public.purchase_order_items
    set received_quantity = received_quantity + v_item.received_quantity
    where id = v_existing_item.id;

    v_received_amount := v_received_amount + round(v_item.received_quantity * v_existing_item.unit_cost);
  end loop;

  if v_received_amount <= 0 then
    raise exception 'Nenhum valor de recebimento foi calculado para o pedido.';
  end if;

  select count(*)
  into v_remaining_items
  from public.purchase_order_items poi
  where poi.purchase_order_id = p_purchase_order_id
    and poi.received_quantity < poi.quantity;

  insert into public.accounts_payable (
    id,
    store_id,
    supplier_id,
    purchase_order_id,
    description,
    amount,
    due_date,
    status,
    notes
  )
  values (
    v_reference_id,
    p_store_id,
    v_purchase_order.supplier_id,
    p_purchase_order_id,
    format('Recebimento do pedido %s', v_purchase_order.order_number),
    v_received_amount,
    p_due_date,
    'PENDING',
    nullif(btrim(coalesce(p_notes, '')), '')
  );

  update public.purchase_orders
  set status = case
        when v_remaining_items = 0 then 'RECEIVED'
        else 'PARTIALLY_RECEIVED'
      end,
      received_at = case
        when v_remaining_items = 0 then now()
        else received_at
      end,
      updated_at = now()
  where id = p_purchase_order_id
    and store_id = p_store_id;

  return v_reference_id;
end;
$$;

commit;

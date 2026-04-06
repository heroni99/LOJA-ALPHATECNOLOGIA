begin;

create or replace function public.sale_return_create(
  p_store_id uuid,
  p_user_id uuid,
  p_sale_id uuid,
  p_refund_type public.refund_type_enum,
  p_reason text,
  p_cash_session_id uuid default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_sale_return_id uuid := gen_random_uuid();
  v_return_number text;
  v_return_sequence integer;
  v_store_timezone text := 'America/Sao_Paulo';
  v_return_date_token text;
  v_sale record;
  v_default_location_id uuid;
  v_total_amount numeric := 0;
  v_item record;
  v_sale_item record;
  v_already_returned numeric := 0;
  v_total_sale_quantity numeric := 0;
  v_total_returned_quantity numeric := 0;
  v_remaining_item_count integer := 0;
begin
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Informe o motivo da devolução.';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Selecione pelo menos um item para devolução.';
  end if;

  select
    s.id,
    s.sale_number,
    s.customer_id,
    s.cash_session_id,
    s.status
  into v_sale
  from public.sales s
  where s.id = p_sale_id
    and s.store_id = p_store_id
  for update;

  if not found then
    raise exception 'A venda informada não pertence à loja atual.';
  end if;

  if v_sale.status = 'CANCELLED' then
    raise exception 'Vendas canceladas não aceitam devolução.';
  end if;

  if p_refund_type = 'CASH' and p_cash_session_id is null then
    raise exception 'Selecione uma sessão de caixa aberta para devoluções em dinheiro.';
  end if;

  if p_cash_session_id is not null and not exists (
    select 1
    from public.cash_sessions cs
    join public.cash_terminals ct on ct.id = cs.cash_terminal_id
    where cs.id = p_cash_session_id
      and cs.status = 'OPEN'
      and ct.store_id = p_store_id
  ) then
    raise exception 'A sessão de caixa informada não está aberta para a loja atual.';
  end if;

  select
    coalesce(nullif(s.timezone, ''), 'America/Sao_Paulo')
  into v_store_timezone
  from public.stores s
  where s.id = p_store_id;

  if not found then
    raise exception 'A loja informada não foi encontrada.';
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
    raise exception 'Configure um local de estoque padrão antes de processar devoluções.';
  end if;

  v_return_date_token := to_char(
    now() at time zone v_store_timezone,
    'YYYYMMDD'
  );

  perform pg_advisory_xact_lock(
    hashtext(p_store_id::text),
    hashtext(v_return_date_token)
  );

  select count(*) + 1
  into v_return_sequence
  from public.sale_returns sr
  join public.sales s on s.id = sr.sale_id
  where s.store_id = p_store_id
    and to_char(sr.created_at at time zone v_store_timezone, 'YYYYMMDD') = v_return_date_token;

  v_return_number := format(
    'DEV-%s-%s',
    v_return_date_token,
    lpad(v_return_sequence::text, 3, '0')
  );

  insert into public.sale_returns (
    id,
    sale_id,
    customer_id,
    return_number,
    reason,
    refund_type,
    total_amount,
    created_by_user_id
  )
  values (
    v_sale_return_id,
    p_sale_id,
    v_sale.customer_id,
    v_return_number,
    btrim(p_reason),
    p_refund_type,
    0,
    p_user_id
  );

  for v_item in
    select
      item.sale_item_id,
      item.quantity,
      coalesce(item.return_to_stock, true) as return_to_stock
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      sale_item_id uuid,
      quantity numeric,
      return_to_stock boolean
    )
  loop
    if v_item.sale_item_id is null then
      raise exception 'Todos os itens da devolução precisam referenciar um item da venda.';
    end if;

    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'A quantidade devolvida precisa ser maior que zero.';
    end if;

    select
      si.id,
      si.product_id,
      si.product_unit_id,
      si.quantity,
      si.unit_price
    into v_sale_item
    from public.sale_items si
    where si.id = v_item.sale_item_id
      and si.sale_id = p_sale_id
    for update;

    if not found then
      raise exception 'Um dos itens selecionados não pertence à venda informada.';
    end if;

    select coalesce(sum(sri.quantity), 0)
    into v_already_returned
    from public.sale_return_items sri
    join public.sale_returns sr on sr.id = sri.sale_return_id
    where sri.sale_item_id = v_sale_item.id
      and sr.sale_id = p_sale_id;

    if v_already_returned + v_item.quantity > v_sale_item.quantity then
      raise exception 'A quantidade devolvida ultrapassa o saldo disponível de um dos itens.';
    end if;

    if v_sale_item.product_unit_id is not null and v_item.quantity <> 1 then
      raise exception 'Itens serializados só podem ser devolvidos com quantidade igual a 1.';
    end if;

    insert into public.sale_return_items (
      sale_return_id,
      sale_item_id,
      quantity,
      return_to_stock,
      amount
    )
    values (
      v_sale_return_id,
      v_sale_item.id,
      v_item.quantity,
      v_item.return_to_stock,
      round(v_item.quantity * v_sale_item.unit_price)
    );

    v_total_amount := v_total_amount + round(v_item.quantity * v_sale_item.unit_price);

    if v_item.return_to_stock then
      insert into public.stock_balances (
        product_id,
        location_id,
        quantity
      )
      values (
        v_sale_item.product_id,
        v_default_location_id,
        0
      )
      on conflict (product_id, location_id) do nothing;

      update public.stock_balances
      set quantity = quantity + v_item.quantity,
          updated_at = now()
      where product_id = v_sale_item.product_id
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
        v_sale_item.product_id,
        v_sale_item.product_unit_id,
        v_default_location_id,
        'RETURN_IN',
        v_item.quantity,
        0,
        'SALE_RETURN',
        v_sale_return_id,
        format('Devolução %s da venda %s', v_return_number, v_sale.sale_number),
        p_user_id
      );

      if v_sale_item.product_unit_id is not null then
        update public.product_units
        set unit_status = 'RETURNED',
            current_location_id = v_default_location_id,
            updated_at = now()
        where id = v_sale_item.product_unit_id;
      end if;
    end if;
  end loop;

  if v_total_amount <= 0 then
    raise exception 'Não foi possível calcular o valor total da devolução.';
  end if;

  update public.sale_returns
  set total_amount = v_total_amount
  where id = v_sale_return_id;

  if p_refund_type = 'CASH' then
    insert into public.cash_movements (
      cash_session_id,
      movement_type,
      amount,
      payment_method,
      reference_type,
      reference_id,
      description,
      user_id
    )
    values (
      p_cash_session_id,
      'REFUND',
      v_total_amount,
      'CASH',
      'SALE_RETURN',
      v_sale_return_id,
      format('Devolução %s da venda %s', v_return_number, v_sale.sale_number),
      p_user_id
    );
  end if;

  select coalesce(sum(si.quantity), 0)
  into v_total_sale_quantity
  from public.sale_items si
  where si.sale_id = p_sale_id;

  select coalesce(sum(sri.quantity), 0)
  into v_total_returned_quantity
  from public.sale_return_items sri
  join public.sale_returns sr on sr.id = sri.sale_return_id
  where sr.sale_id = p_sale_id;

  select count(*)
  into v_remaining_item_count
  from public.sale_items si
  where si.sale_id = p_sale_id
    and (
      select coalesce(sum(sri.quantity), 0)
      from public.sale_return_items sri
      join public.sale_returns sr on sr.id = sri.sale_return_id
      where sri.sale_item_id = si.id
        and sr.sale_id = p_sale_id
    ) < si.quantity;

  update public.sales
  set status = case
        when v_total_returned_quantity >= v_total_sale_quantity and v_remaining_item_count = 0
          then 'REFUNDED'
        else 'PARTIALLY_REFUNDED'
      end,
      updated_at = now()
  where id = p_sale_id
    and store_id = p_store_id;

  return v_sale_return_id;
end;
$$;

commit;

begin;

create or replace function public.sales_checkout(
  p_store_id uuid,
  p_user_id uuid,
  p_customer_id uuid default null,
  p_discount_amount numeric default 0,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb,
  p_payments jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_cash_session_id uuid;
  v_sale_id uuid := gen_random_uuid();
  v_sale_number text;
  v_default_location_id uuid;
  v_default_location_name text;
  v_subtotal numeric := 0;
  v_item_discount_total numeric := 0;
  v_global_discount_amount numeric := 0;
  v_discount_amount numeric := 0;
  v_total numeric := 0;
  v_total_received numeric := 0;
  v_non_cash_total numeric := 0;
  v_cash_received numeric := 0;
  v_cash_applied numeric := 0;
  v_change_amount numeric := 0;
  v_remaining_total numeric := 0;
  v_available_balance numeric := 0;
  v_item_gross_total numeric := 0;
  v_item_discount_line numeric := 0;
  v_item_net_total numeric := 0;
  v_applied_payment_amount numeric := 0;
  v_payment_count integer := 0;
  v_installments integer := 1;
  v_unit_purchase_price numeric := 0;
  v_product record;
  v_item record;
  v_requested record;
  v_payment record;
begin
  if p_store_id is null then
    raise exception 'A loja da venda é obrigatória.';
  end if;

  if p_user_id is null then
    raise exception 'O usuário responsável pela venda é obrigatório.';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Adicione pelo menos um item para concluir a venda.';
  end if;

  if jsonb_typeof(coalesce(p_payments, '[]'::jsonb)) <> 'array' then
    raise exception 'Os pagamentos da venda são inválidos.';
  end if;

  select
    sl.id,
    sl.name
  into
    v_default_location_id,
    v_default_location_name
  from public.stock_locations sl
  where sl.store_id = p_store_id
    and sl.active = true
    and sl.is_default = true
  order by sl.created_at asc
  limit 1;

  if v_default_location_id is null then
    raise exception 'Configure um local de estoque padrão antes de vender no PDV.';
  end if;

  v_cash_session_id := public.cash_get_or_create_current_session(p_store_id);

  if v_cash_session_id is null then
    raise exception 'Não foi possível abrir a sessão atual do caixa.';
  end if;

  if p_customer_id is not null and not exists (
    select 1
    from public.customers c
    where c.id = p_customer_id
      and c.store_id = p_store_id
  ) then
    raise exception 'O cliente informado não pertence à loja atual.';
  end if;

  for v_item in
    select
      item.product_id,
      item.product_unit_id,
      item.quantity,
      item.unit_price,
      coalesce(item.discount_amount, 0) as discount_amount
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      product_id uuid,
      product_unit_id uuid,
      quantity numeric,
      unit_price numeric,
      discount_amount numeric
    )
  loop
    if v_item.product_id is null then
      raise exception 'Um item da venda está sem produto definido.';
    end if;

    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'A quantidade dos itens da venda deve ser maior que zero.';
    end if;

    if v_item.unit_price is null or v_item.unit_price < 0 then
      raise exception 'O preço unitário de um item da venda é inválido.';
    end if;

    if v_item.discount_amount is null or v_item.discount_amount < 0 then
      raise exception 'O desconto de um item da venda é inválido.';
    end if;

    select
      p.id,
      p.name,
      p.internal_code,
      p.cost_price,
      p.has_serial_control
    into v_product
    from public.products p
    where p.id = v_item.product_id
      and p.store_id = p_store_id
      and p.active = true
      and p.is_service = false;

    if not found then
      raise exception 'Um dos produtos informados não pertence à loja atual, está inativo ou não é vendável no PDV.';
    end if;

    if v_product.has_serial_control then
      if v_item.product_unit_id is null then
        raise exception 'Produtos serializados exigem a seleção da unidade exata.';
      end if;

      if v_item.quantity <> 1 then
        raise exception 'Produtos serializados só podem ser vendidos com quantidade igual a 1.';
      end if;

      select
        coalesce(pu.purchase_price, 0)
      into v_unit_purchase_price
      from public.product_units pu
      where pu.id = v_item.product_unit_id
        and pu.product_id = v_item.product_id
        and pu.current_location_id = v_default_location_id
        and pu.unit_status = 'IN_STOCK'
      for update;

      if not found then
        raise exception 'A unidade serializada selecionada não está disponível no local padrão %.', v_default_location_name;
      end if;
    else
      if v_item.product_unit_id is not null then
        raise exception 'Produtos sem controle serial não devem informar unidade específica.';
      end if;
    end if;

    v_item_gross_total := round(v_item.quantity * v_item.unit_price);
    v_item_discount_line := greatest(round(v_item.discount_amount), 0);

    if v_item_discount_line > v_item_gross_total then
      raise exception 'O desconto de um item não pode ser maior que seu subtotal.';
    end if;

    v_subtotal := v_subtotal + v_item_gross_total;
    v_item_discount_total := v_item_discount_total + v_item_discount_line;
  end loop;

  for v_requested in
    select
      item.product_id,
      sum(item.quantity) as requested_quantity
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      product_id uuid,
      product_unit_id uuid,
      quantity numeric,
      unit_price numeric,
      discount_amount numeric
    )
    group by item.product_id
  loop
    insert into public.stock_balances (
      product_id,
      location_id,
      quantity
    )
    values (
      v_requested.product_id,
      v_default_location_id,
      0
    )
    on conflict (product_id, location_id) do nothing;

    select sb.quantity
    into v_available_balance
    from public.stock_balances sb
    where sb.product_id = v_requested.product_id
      and sb.location_id = v_default_location_id
    for update;

    if coalesce(v_available_balance, 0) < coalesce(v_requested.requested_quantity, 0) then
      raise exception 'Estoque insuficiente para um dos itens selecionados no local padrão %.', v_default_location_name;
    end if;
  end loop;

  if coalesce(p_discount_amount, 0) < 0 then
    raise exception 'O desconto geral da venda é inválido.';
  end if;

  v_global_discount_amount := greatest(round(coalesce(p_discount_amount, 0)), 0);
  v_discount_amount := least(v_item_discount_total + v_global_discount_amount, v_subtotal);
  v_total := greatest(v_subtotal - v_discount_amount, 0);

  for v_payment in
    select
      payment.method,
      payment.amount
    from jsonb_to_recordset(coalesce(p_payments, '[]'::jsonb)) as payment(
      method text,
      amount numeric
    )
  loop
    v_payment_count := v_payment_count + 1;

    if v_payment.method not in ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD') then
      raise exception 'Uma das formas de pagamento informadas é inválida.';
    end if;

    if v_payment.amount is null or v_payment.amount <= 0 then
      raise exception 'Todos os pagamentos devem informar um valor maior que zero.';
    end if;

    v_total_received := v_total_received + v_payment.amount;

    if v_payment.method = 'CASH' then
      v_cash_received := v_cash_received + v_payment.amount;
    else
      v_non_cash_total := v_non_cash_total + v_payment.amount;
    end if;
  end loop;

  if v_total = 0 then
    if v_payment_count > 0 then
      raise exception 'Vendas com total zerado não devem informar pagamentos.';
    end if;
  else
    if v_payment_count = 0 then
      raise exception 'Informe pelo menos uma forma de pagamento.';
    end if;

    if v_non_cash_total > v_total then
      raise exception 'Pagamentos sem troco não podem exceder o total da venda.';
    end if;

    if v_total_received < v_total then
      raise exception 'A soma dos pagamentos deve ser maior ou igual ao total da venda.';
    end if;

    if v_total_received > v_total and v_cash_received = 0 then
      raise exception 'Troco só é permitido quando houver pagamento em dinheiro.';
    end if;
  end if;

  perform pg_advisory_xact_lock(
    hashtext('sales_checkout'),
    hashtext(p_store_id::text)
  );

  loop
    v_sale_number := format(
      'VDA-%s',
      floor(extract(epoch from clock_timestamp()) * 1000)::bigint
    );

    exit when not exists (
      select 1
      from public.sales s
      where s.store_id = p_store_id
        and s.sale_number = v_sale_number
    );

    perform pg_sleep(0.001);
  end loop;

  insert into public.sales (
    id,
    sale_number,
    store_id,
    customer_id,
    user_id,
    cash_session_id,
    subtotal,
    discount_amount,
    total,
    status,
    notes,
    completed_at
  )
  values (
    v_sale_id,
    v_sale_number,
    p_store_id,
    p_customer_id,
    p_user_id,
    v_cash_session_id,
    v_subtotal,
    v_discount_amount,
    v_total,
    'COMPLETED',
    nullif(btrim(coalesce(p_notes, '')), ''),
    now()
  );

  for v_item in
    select
      item.product_id,
      item.product_unit_id,
      item.quantity,
      item.unit_price,
      coalesce(item.discount_amount, 0) as discount_amount
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      product_id uuid,
      product_unit_id uuid,
      quantity numeric,
      unit_price numeric,
      discount_amount numeric
    )
  loop
    select
      p.id,
      p.name,
      p.internal_code,
      p.cost_price,
      p.has_serial_control
    into v_product
    from public.products p
    where p.id = v_item.product_id
      and p.store_id = p_store_id
    for update;

    v_item_gross_total := round(v_item.quantity * v_item.unit_price);
    v_item_discount_line := greatest(round(coalesce(v_item.discount_amount, 0)), 0);
    v_item_net_total := greatest(v_item_gross_total - v_item_discount_line, 0);
    v_unit_purchase_price := greatest(coalesce(v_product.cost_price, 0), 0);

    if v_product.has_serial_control then
      select
        coalesce(pu.purchase_price, 0)
      into v_unit_purchase_price
      from public.product_units pu
      where pu.id = v_item.product_unit_id
      for update;
    end if;

    insert into public.sale_items (
      sale_id,
      product_id,
      product_unit_id,
      quantity,
      unit_price,
      discount_amount,
      total_price
    )
    values (
      v_sale_id,
      v_item.product_id,
      v_item.product_unit_id,
      v_item.quantity,
      v_item.unit_price,
      v_item_discount_line,
      v_item_net_total
    );

    update public.stock_balances
    set quantity = quantity - v_item.quantity,
        updated_at = now()
    where product_id = v_item.product_id
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
      v_item.product_id,
      v_item.product_unit_id,
      v_default_location_id,
      'SALE',
      v_item.quantity,
      greatest(coalesce(v_unit_purchase_price, 0), 0),
      'SALE',
      v_sale_id,
      format('Venda %s', v_sale_number),
      p_user_id
    );

    if v_product.has_serial_control then
      update public.product_units
      set unit_status = 'SOLD',
          current_location_id = null,
          updated_at = now()
      where id = v_item.product_unit_id;
    end if;
  end loop;

  v_remaining_total := v_total;

  for v_payment in
    select
      payment.method,
      payment.amount
    from jsonb_to_recordset(coalesce(p_payments, '[]'::jsonb)) as payment(
      method text,
      amount numeric
    )
  loop
    v_installments := 1;
    v_applied_payment_amount := case
      when v_payment.method = 'CASH' then least(v_payment.amount, greatest(v_remaining_total, 0))
      else v_payment.amount
    end;

    if v_applied_payment_amount > 0 then
      insert into public.sale_payments (
        sale_id,
        method,
        amount,
        installments
      )
      values (
        v_sale_id,
        v_payment.method::public.payment_method_enum,
        v_applied_payment_amount,
        v_installments
      );
    end if;

    if v_payment.method = 'CASH' then
      v_cash_applied := v_cash_applied + greatest(v_applied_payment_amount, 0);
    end if;

    v_remaining_total := greatest(v_remaining_total - v_applied_payment_amount, 0);
  end loop;

  if v_remaining_total > 0 then
    raise exception 'Os pagamentos aplicados não cobrem o total da venda.';
  end if;

  v_change_amount := greatest(v_total_received - v_total, 0);

  if v_cash_applied > 0 then
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
      v_cash_session_id,
      'SALE',
      v_cash_applied,
      'CASH',
      'SALE',
      v_sale_id,
      format('Recebimento da venda %s', v_sale_number),
      p_user_id
    );
  end if;

  return jsonb_build_object(
    'sale_id', v_sale_id,
    'sale_number', v_sale_number,
    'subtotal', v_subtotal,
    'discount_amount', v_discount_amount,
    'total', v_total,
    'change_amount', v_change_amount
  );
end;
$$;

commit;

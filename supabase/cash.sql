begin;

create or replace function public.cash_get_or_create_current_session(
  p_store_id uuid
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_session_id uuid;
  v_cash_terminal_id uuid;
begin
  if p_store_id is null then
    raise exception 'A loja do caixa é obrigatória.';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('cash_session'),
    hashtext(p_store_id::text)
  );

  select cs.id
  into v_session_id
  from public.cash_sessions cs
  join public.cash_terminals ct on ct.id = cs.cash_terminal_id
  where ct.store_id = p_store_id
    and cs.status = 'OPEN'
  order by cs.opened_at desc
  limit 1;

  if v_session_id is not null then
    return v_session_id;
  end if;

  select ct.id
  into v_cash_terminal_id
  from public.cash_terminals ct
  where ct.store_id = p_store_id
    and ct.active = true
  order by ct.created_at asc, ct.name asc
  limit 1;

  if v_cash_terminal_id is null then
    select ct.id
    into v_cash_terminal_id
    from public.cash_terminals ct
    where ct.store_id = p_store_id
    order by ct.created_at asc, ct.name asc
    limit 1;

    if v_cash_terminal_id is not null then
      update public.cash_terminals
      set active = true
      where id = v_cash_terminal_id;
    else
      insert into public.cash_terminals (
        store_id,
        name,
        active
      )
      values (
        p_store_id,
        'Caixa Principal',
        true
      )
      returning id into v_cash_terminal_id;
    end if;
  end if;

  insert into public.cash_sessions (
    cash_terminal_id,
    opened_by,
    status,
    opening_amount,
    expected_amount,
    opened_at,
    notes
  )
  values (
    v_cash_terminal_id,
    null,
    'OPEN',
    0,
    0,
    now(),
    'Sessão aberta automaticamente'
  )
  returning id into v_session_id;

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
    v_session_id,
    'OPENING',
    0,
    'CASH',
    'CASH_SESSION',
    v_session_id,
    'Sessão aberta automaticamente',
    null
  );

  return v_session_id;
end;
$$;

create or replace function public.cash_close_current_session(
  p_store_id uuid,
  p_user_id uuid,
  p_closing_amount numeric,
  p_notes text default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_session_id uuid;
  v_session_notes text;
  v_opening_amount numeric := 0;
  v_sales_amount numeric := 0;
  v_supply_amount numeric := 0;
  v_withdrawal_amount numeric := 0;
  v_refund_amount numeric := 0;
  v_expected_amount numeric := 0;
  v_difference numeric := 0;
  v_final_notes text;
  v_clean_notes text;
begin
  if p_store_id is null then
    raise exception 'A loja do caixa é obrigatória.';
  end if;

  if p_user_id is null then
    raise exception 'O usuário responsável pelo fechamento é obrigatório.';
  end if;

  if p_closing_amount is null or p_closing_amount < 0 then
    raise exception 'O valor contado não pode ser negativo.';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('cash_session'),
    hashtext(p_store_id::text)
  );

  select
    cs.id,
    cs.notes,
    cs.opening_amount
  into
    v_session_id,
    v_session_notes,
    v_opening_amount
  from public.cash_sessions cs
  join public.cash_terminals ct on ct.id = cs.cash_terminal_id
  where ct.store_id = p_store_id
    and cs.status = 'OPEN'
  order by cs.opened_at desc
  limit 1
  for update of cs;

  if v_session_id is null then
    raise exception 'Nenhuma sessão aberta foi encontrada para a loja atual.';
  end if;

  select
    coalesce(sum(case when cm.movement_type = 'SALE' then cm.amount else 0 end), 0),
    coalesce(sum(case when cm.movement_type = 'SUPPLY' then cm.amount else 0 end), 0),
    coalesce(sum(case when cm.movement_type = 'WITHDRAWAL' then cm.amount else 0 end), 0),
    coalesce(sum(case when cm.movement_type = 'REFUND' then cm.amount else 0 end), 0)
  into
    v_sales_amount,
    v_supply_amount,
    v_withdrawal_amount,
    v_refund_amount
  from public.cash_movements cm
  where cm.cash_session_id = v_session_id;

  v_expected_amount :=
    coalesce(v_opening_amount, 0)
    + v_sales_amount
    + v_supply_amount
    - v_withdrawal_amount
    - v_refund_amount;

  v_difference := p_closing_amount - v_expected_amount;
  v_clean_notes := nullif(btrim(coalesce(p_notes, '')), '');

  v_final_notes := case
    when nullif(btrim(coalesce(v_session_notes, '')), '') is null then v_clean_notes
    when v_clean_notes is null then v_session_notes
    else v_session_notes || E'\n\nFechamento: ' || v_clean_notes
  end;

  update public.cash_sessions
  set status = 'CLOSED',
      expected_amount = v_expected_amount,
      closing_amount = p_closing_amount,
      difference = v_difference,
      closed_by = p_user_id,
      closed_at = now(),
      notes = v_final_notes
  where id = v_session_id;

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
    v_session_id,
    'CLOSING',
    p_closing_amount,
    'CASH',
    'CASH_SESSION',
    v_session_id,
    'Fechamento da sessão de caixa',
    p_user_id
  );

  return jsonb_build_object(
    'session_id', v_session_id,
    'expected_amount', v_expected_amount,
    'closing_amount', p_closing_amount,
    'difference', v_difference
  );
end;
$$;

commit;

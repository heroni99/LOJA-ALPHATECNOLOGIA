begin;

create or replace function public.ensure_default_product_code()
returns trigger
language plpgsql
as $$
begin
  if new.internal_code is null or btrim(new.internal_code) = '' then
    return new;
  end if;

  insert into public.product_codes (
    product_id,
    code,
    code_type,
    scope,
    is_primary
  )
  values (
    new.id,
    format('ALPHA-%s', new.internal_code),
    'CUSTOM',
    'PRODUCT',
    true
  )
  on conflict (code) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_products_default_code on public.products;
create trigger trg_products_default_code
after insert on public.products
for each row execute function public.ensure_default_product_code();

insert into public.product_codes (
  product_id,
  code,
  code_type,
  scope,
  is_primary
)
select
  p.id,
  format('ALPHA-%s', p.internal_code),
  'CUSTOM',
  'PRODUCT',
  true
from public.products p
where
  p.internal_code is not null
  and btrim(p.internal_code) <> ''
  and not exists (
    select 1
    from public.product_codes pc
    where
      pc.product_id = p.id
      and pc.code = format('ALPHA-%s', p.internal_code)
  )
on conflict (code) do nothing;

commit;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

insert into storage.buckets (id, name, public)
values ('service-order-attachments', 'service-order-attachments', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects
for select
to public
using (bucket_id = 'product-images');

drop policy if exists "Authenticated users can upload product images" on storage.objects;
create policy "Authenticated users can upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
);

drop policy if exists "Public can view service order attachments" on storage.objects;
create policy "Public can view service order attachments"
on storage.objects
for select
to public
using (bucket_id = 'service-order-attachments');

drop policy if exists "Authenticated users can upload service order attachments" on storage.objects;
create policy "Authenticated users can upload service order attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'service-order-attachments'
  and auth.role() = 'authenticated'
);

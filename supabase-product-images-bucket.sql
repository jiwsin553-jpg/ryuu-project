insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  20971520,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Imagens de produtos publicas" on storage.objects;
create policy "Imagens de produtos publicas"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "Admins enviam imagens de produtos" on storage.objects;
create policy "Admins enviam imagens de produtos"
on storage.objects for insert
with check (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'administrador'
  )
);

drop policy if exists "Admins atualizam imagens de produtos" on storage.objects;
create policy "Admins atualizam imagens de produtos"
on storage.objects for update
using (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'administrador'
  )
)
with check (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'administrador'
  )
);

drop policy if exists "Admins removem imagens de produtos" on storage.objects;
create policy "Admins removem imagens de produtos"
on storage.objects for delete
using (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'administrador'
  )
);

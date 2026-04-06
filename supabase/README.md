# Supabase Setup

1. Acesse o dashboard do Supabase e selecione o projeto target.
2. Abra o **SQL Editor** e rode o conteúdo de `supabase/schema.sql` para criar tabelas, funções, índices e políticas RLS.
3. Ainda no SQL Editor, execute `supabase/seed.sql` para popular dados iniciais (lojas, categorias, produtos, usuários etc.).
4. As políticas RLS e as regras de segurança estão declaradas em `supabase/schema.sql`; basta rodar o arquivo para habilitá-las.
5. Para criar os buckets e as policies de storage públicos/privados, execute `supabase/storage.sql` no SQL Editor. Isso garante que os buckets `product-images` e `service-order-attachments` existam com as regras de upload e leitura solicitadas.
6. Ao atualizar o schema/seed em ambientes diferentes, repita os passos acima ou utilize a CLI do Supabase para sincronizar (`supabase db push` ou comandos equivalentes).

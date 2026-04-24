# Supabase Setup

1. Acesse o dashboard do Supabase e selecione o projeto target.
2. Abra o **SQL Editor** e rode o conteúdo de `supabase/schema.sql` para criar tabelas, índices, políticas RLS e funções base.
3. Ainda no SQL Editor, execute os SQLs modulares abaixo, nesta ordem:
   - `supabase/products.sql`
   - `supabase/inventory.sql`
   - `supabase/cash.sql`
   - `supabase/purchase-orders.sql`
   - `supabase/service-orders.sql`
   - `supabase/fiscal.sql`
   - `supabase/sale-returns.sql`
   - `supabase/pdv.sql`
   - `supabase/scanner.sql`
4. Execute `supabase/seed.sql` para popular dados iniciais (lojas, categorias, produtos, usuários etc.).
5. Para criar os buckets e as policies de storage públicos/privados, execute `supabase/storage.sql` no SQL Editor. Isso garante que os buckets `product-images`, `service-order-attachments` e `product-attachments` existam com as regras de upload e leitura solicitadas.
6. O arquivo `supabase/inventory.sql` é obrigatório para o módulo de estoque, incluindo entrada, ajuste, transferência e criação/edição de locais.
7. O arquivo `supabase/cash.sql` é obrigatório para o módulo de caixa, incluindo autoabertura de sessão e fechamento atômico.
8. Ao atualizar o schema em ambientes diferentes, repita a execução de `schema.sql` e dos SQLs modulares aplicáveis, ou utilize a CLI do Supabase para sincronizar (`supabase db push` ou comandos equivalentes).

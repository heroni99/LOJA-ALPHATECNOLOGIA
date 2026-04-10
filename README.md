# Alpha Tecnologia

Aplicação Next.js 14 com Supabase (autenticação, estoque, emissions de vendas, PDV e OS).

## Setup

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha as variáveis listadas abaixo.
3. Execute `npm run dev` e abra `http://localhost:3000`.
4. Defina o schema e o seed no Supabase conforme descrito em `supabase/README.md`.

## Variáveis de ambiente

- `NEXT_PUBLIC_SUPABASE_URL`: URL pública do projeto Supabase (`https://xxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave `anon/public`
- `SUPABASE_SERVICE_ROLE_KEY`: chave `service_role` usada apenas no servidor
- `NEXT_PUBLIC_APP_URL`: URL pública da aplicação (ex: `https://seu-app.vercel.app`)

As mesmas variáveis são necessárias no Vercel para deploy automático (veja checklist abaixo).

## Supabase

Toda a configuração inicial do banco está em `supabase/schema.sql`, nos SQLs modulares de `supabase/` e no seed em `supabase/seed.sql`. Para a ordem correta de execução no Supabase consulte `supabase/README.md`.

## Deploy no Vercel

1. Conecte o repositório no Vercel e configure a project settings.
2. Garanta que as variáveis de ambiente acima estejam definidas no Vercel (use os valores do seu projeto Supabase e a URL pública do deploy).
3. O deploy é disparado automaticamente ao dar push para `main` (o comando de build é `npm run build` e usamos `.next` como saída).
4. Após o deploy, valide: login, área de PDV, scanner e upload de imagem (produto / OS).

## Checklist pós-deploy

1. Definir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `NEXT_PUBLIC_APP_URL` no Vercel.
2. Dar push em `main`.
3. Validar funcionalidades chave: autenticação, PDV, scanner, upload de imagens.

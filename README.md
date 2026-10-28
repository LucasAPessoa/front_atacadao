# Frontend — Ecommerce Atacadão

Vitrine React responsiva para o backend atual. Ela consome catálogo e categorias públicos, usa o carrinho persistente autenticado e consulta frete sem aceitar valor, estoque ou preço do cliente como fonte de verdade.

## Executar

```bash
cd /home/lucas/Projetos/front_atacadao
cp .env.example .env
npm install
npm run dev
```

`npm run dev` serve os dois apps no mesmo servidor (porta 5173): a loja em `/` e o portal administrativo em `/admin/`.

O backend local padrão está em `http://127.0.0.1:8000`. Ajuste `VITE_API_BASE_URL` quando necessário.

## Dois apps: loja e portal (`/admin/`)

| App | Entrada | Código | Estilos |
| --- | --- | --- | --- |
| Loja | `index.html` | `src/` (exceto `src/admin`) | `src/styles.css` |
| Portal | `admin/index.html` | `src/admin/` | `src/admin/styles/` |

O build gera as duas entradas (`manifest: true`). Em dev e preview, `/admin` e `/admin/<rota>` caem em `admin/index.html`; no deploy, o rewrite do `vercel.json` faz o mesmo. O portal só aparece na loja como o link "Painel admin" para usuários com perfil admin.

### Isolamento

`src/admin` importa apenas de `src/admin` e `src/shared`; a loja não pode carregar o portal. Duas travas:

- Regras do Biome (`npm run lint`) proíbem o portal de importar da loja (fora de `src/shared`).
- `npm run check:isolation` (rode depois de `npm run build`) confere no manifest que a loja não carrega nada do portal e que o portal não usa o CSS da loja.

### Tema do portal

Os componentes usam só variáveis `--adm-*` definidas em `src/admin/styles/tokens.css` sob `:root[data-theme="default"]`. Um tema futuro é outro bloco `:root[data-theme="..."]` com os mesmos tokens (ajuste `THEME` em `src/admin/theme.ts`). O acento (`--adm-accent`, `--adm-on-accent`, `--adm-accent-text`) vem de `VITE_STORE_BRAND_COLOR` em runtime, com contraste derivado.

### Sessão própria do portal

O portal tem sessão independente da loja (`src/admin/auth/`): entrar na loja não abre o portal e vice-versa. Só usuários com perfil admin acessam, e uma rejeição do servidor (400/401/403) encerra a sessão do portal e volta ao login. A API é a mesma (`VITE_API_BASE_URL`).

## Identidade da loja (white-label)

Todas as variáveis são públicas (embutidas no bundle; nunca coloque segredos) e opcionais. Sem valor, vale o padrão de `src/config/store.ts`.

| Variável | Uso |
| --- | --- |
| `VITE_STORE_NAME`, `VITE_STORE_SHORT_NAME` | Nome e sigla |
| `VITE_STORE_TAGLINE`, `VITE_STORE_DESCRIPTION` | Frases institucionais |
| `VITE_STORE_ANNOUNCEMENT` | Faixa superior |
| `VITE_STORE_SUPPORT_EMAIL` | E-mail de atendimento |
| `VITE_STORE_BRAND_COLOR` | Cor da marca em hex (padrão `#1D6B57`); texto e contraste derivam dela |
| `VITE_STORE_LEGAL_NAME`, `VITE_STORE_CNPJ`, `VITE_STORE_ADDRESS` | Dados legais no rodapé (só aparecem se definidos) |

## Deploy na Vercel

1. Importe este diretório como um projeto Vite na Vercel. O build é `npm run build` e o diretório publicado é `dist`.
2. Em **Settings → Environment Variables**, crie `VITE_API_BASE_URL` com a URL pública da API, incluindo `/api/v1`, por exemplo `https://api.exemplo.com/api/v1`.
3. Faça o deploy. O `vercel.json` mantém as rotas de cliente `/carrinho` e `/pagamento/retorno` disponíveis mesmo após atualizar ou abrir um link direto.
4. Configure a API para aceitar a origem pública da Vercel em CORS e configure a URL de retorno do pagamento para a URL pública deste site.

`VITE_API_BASE_URL` é uma configuração pública incorporada ao bundle. Nunca use essa variável para tokens, chaves do Mercado Pago ou outros segredos.

Entre em **Minha conta** com credenciais existentes do backend. O access token fica apenas em memória; o refresh token fica no `localStorage` (migração para cookie HttpOnly: front #17). Ao recarregar a página a sessão é restaurada por `/auth/refresh`, e um `401` em requisição autenticada dispara um refresh único e uma repetição da requisição (mesma `Idempotency-Key` no pagamento).

## Limites deliberados

- O cartão apresenta o preço-base apenas como referência. O valor atacadista, desconto, estoque e frete são recalculados pelo preview/checkout do servidor.
- O pagamento é iniciado por Checkout Pro: a tela envia a revisão do carrinho e redireciona para a URL segura retornada pelo Mercado Pago. Ela não coleta cartão, dados bancários ou chama webhooks.
- O backend atual ainda não retorna faixas de preço junto de cada produto. Para exibir regras atacadistas sem baixar todas as faixas, é necessário um endpoint filtrado por produto ou `pricing_tiers` no recurso de produto.

## Verificação

```bash
npm run typecheck && npm test && npm run lint && npm run format:check
npm run build && npm run check:isolation
```

## CI

O GitHub Actions (`.github/workflows/ci.yml`) roda em PRs e em push para `main`.
Checks obrigatórios: `Typecheck e testes` e `Build`; `Report - npm audit` não bloqueia.
Localmente: `npm ci && npm run typecheck && npm test && npm run build`.

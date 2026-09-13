# Frontend — Ecommerce Atacadão

Vitrine React responsiva para o backend atual. Ela consome catálogo e categorias públicos, usa o carrinho persistente autenticado e consulta frete sem aceitar valor, estoque ou preço do cliente como fonte de verdade.

## Executar

```bash
cd /home/lucas/Projetos/front_atacadao
cp .env.example .env
npm install
npm run dev
```

O backend local padrão está em `http://127.0.0.1:8000`. Ajuste `VITE_API_BASE_URL` quando necessário.

## Deploy na Vercel

1. Importe este diretório como um projeto Vite na Vercel. O build é `npm run build` e o diretório publicado é `dist`.
2. Em **Settings → Environment Variables**, crie `VITE_API_BASE_URL` com a URL pública da API, incluindo `/api/v1`, por exemplo `https://api.exemplo.com/api/v1`.
3. Faça o deploy. O `vercel.json` mantém as rotas de cliente `/carrinho` e `/pagamento/retorno` disponíveis mesmo após atualizar ou abrir um link direto.
4. Configure a API para aceitar a origem pública da Vercel em CORS e configure a URL de retorno do pagamento para a URL pública deste site.

`VITE_API_BASE_URL` é uma configuração pública incorporada ao bundle. Nunca use essa variável para tokens, chaves do Mercado Pago ou outros segredos.

Entre em **Minha conta** com credenciais existentes do backend. O access token fica apenas no `localStorage` do navegador; a primeira versão ainda não conecta o refresh token.

## Limites deliberados

- O cartão apresenta o preço-base apenas como referência. O valor atacadista, desconto, estoque e frete são recalculados pelo preview/checkout do servidor.
- O pagamento é iniciado por Checkout Pro: a tela envia a revisão do carrinho e redireciona para a URL segura retornada pelo Mercado Pago. Ela não coleta cartão, dados bancários ou chama webhooks.
- O backend atual ainda não retorna faixas de preço junto de cada produto. Para exibir regras atacadistas sem baixar todas as faixas, é necessário um endpoint filtrado por produto ou `pricing_tiers` no recurso de produto.

## Verificação

```bash
npm run build
```

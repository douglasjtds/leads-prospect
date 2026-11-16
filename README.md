# leads-prospect

Ferramenta pessoal de prospecção do Douglas Tertuliano. Ela organiza o contato com pequenos negócios
encontrados no Google Maps (via Apify) que não têm site próprio, para oferecer landing pages
(plano essencial a partir de R$ 500, https://douglastertuliano.vercel.app/).

A ferramenta **não dispara mensagens sozinha**. Ela prepara a mensagem certa para cada lead,
copia o texto, abre o chat do WhatsApp e registra o que aconteceu. O envio é sempre manual, com um
clique de confirmação, para não ter o número bloqueado.

O banco de dados é a **planilha Google "prospeccao_landing_pages"** (aba `Leads`), lida e escrita
pelo servidor via Google Sheets API com uma conta de serviço. A planilha continua sendo o lugar onde
tudo pode ser conferido e filtrado à mão.

## Stack

- Next.js 16 (App Router) + React + TypeScript (strict)
- Tailwind CSS v4 com tokens do site do Douglas
- Google Sheets API (conta de serviço, só no servidor)
- Vitest para a lógica de domínio
- Deploy na Vercel, acesso protegido por senha

## Documentos (leia antes de mexer no código)

| Arquivo | Para que serve |
|---|---|
| `CLAUDE.md` | Regras para o Claude trabalhar neste repositório |
| `instructions/PRODUCT-SPEC.md` | O que o produto faz: telas, regras de status, mensagens |
| `instructions/ARCHITECTURE.md` | Como é construído: planilha como banco, API, autenticação, pastas |
| `instructions/DESIGN-GUIDELINES.md` | Fonte de verdade visual (segue o site douglastertuliano.vercel.app) |
| `instructions/CONECTAR-PLANILHA.md` | Passo a passo para ligar o projeto à planilha Google |
| `instructions/prompts.md` | Sequência de construção em fases, com o prompt pronto de cada fase |

## Rodar localmente

```bash
cp .env.example .env.local   # preencha seguindo instructions/CONECTAR-PLANILHA.md
npm install
npm run check:sheet          # confere se a conta de serviço lê a planilha
npm run dev                  # http://localhost:3000
npm test                     # testes da lógica de domínio
```

## Deploy

Vercel, com as mesmas variáveis do `.env.local` cadastradas em Project Settings → Environment
Variables. Detalhes em `instructions/CONECTAR-PLANILHA.md`, passo 9.

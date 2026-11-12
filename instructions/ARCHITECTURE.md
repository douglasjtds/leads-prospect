# ARCHITECTURE.md
### leads-prospect: como o sistema é construído

---

## 1. Visão geral

```
Navegador (React)                 Vercel (Next.js, Node runtime)            Google
┌──────────────────┐   fetch     ┌───────────────────────────────┐  JWT   ┌──────────────┐
│ App Router pages │ ──────────▶ │ proxy.ts (sessão)             │        │ Sheets API   │
│ components/      │             │ app/api/* (route handlers)    │ ─────▶ │ planilha     │
│ hooks/use-leads  │ ◀────────── │ lib/domain (regras, puras)    │        │ aba "Leads"  │
└──────────────────┘    JSON     │ lib/sheets/leads-repo.ts      │        └──────────────┘
                                 └───────────────────────────────┘
```

- O cliente **nunca** fala com o Google. Só o servidor tem a credencial.
- A planilha é a única fonte de verdade. Não existe banco paralelo nem cache persistente.
- As regras de negócio (próxima ação, transições, seções do Hoje, mensagens) ficam em
  `lib/domain/`, puras e testadas. O servidor usa essas funções para calcular a transição ao gravar,
  e o cliente usa as mesmas funções para exibir. Mesma lógica, um lugar só.

## 2. Stack e versões

| Item | Escolha | Motivo |
|---|---|---|
| Framework | Next.js 16, App Router, `src/`, Cache Components | API routes e proxy no mesmo deploy da Vercel |
| Linguagem | TypeScript strict | |
| Estilo | Tailwind CSS v4 (`@theme` em `globals.css`) | Mesmo sistema do site do Douglas |
| Fontes | `next/font/google`: Schibsted Grotesk e JetBrains Mono | Iguais ao site |
| Google | `google-auth-library` (JWT) + REST da Sheets API v4 via `fetch` | Mais leve que o pacote `googleapis` inteiro |
| Validação | `zod` nas entradas das rotas | |
| Estado no cliente | `useSyncExternalStore` ou um hook simples com atualização otimista | Uma lista em memória basta; sem Redux, sem Zustand |
| Testes | Vitest | Lógica de domínio e mapeamento da planilha |
| Importação de xlsx | `exceljs` (só no script e na rota de import) | |

## 3. Estrutura de pastas

```
src/
  app/
    layout.tsx               fontes, metadata, <body>
    globals.css              tokens (@theme) e base
    page.tsx                 shell do app (Hoje / Todos / Números)
    login/page.tsx
    styleguide/page.tsx      só em desenvolvimento
    api/
      auth/login/route.ts    POST senha → cookie
      auth/logout/route.ts
      leads/route.ts         GET lista completa + hoje
      leads/[placeId]/route.ts   PATCH ação
      leads/import/route.ts  POST novas linhas (dedupe)
  components/
    header.tsx  search.tsx  tabs.tsx
    lead-list.tsx  lead-list-item.tsx
    lead-detail/ (status-chips, next-action, quick-replies, notes, history)
    stats.tsx  toast.tsx  ui/ (button, chip, pill, segmented)
  hooks/
    use-leads.ts             carrega, aplica ações com otimismo, reverte em erro
    use-shortcuts.ts
  lib/
    domain/
      types.ts               Lead, Status, Situacao, Acao, Patch
      dates.ts               hoje em America/Sao_Paulo, addDias, formatos
      phone.ts               dígitos, celular
      messages.ts            copy exata da PRODUCT-SPEC §6
      next-action.ts         proximaAcao(lead, hoje) e aplicar(acao)
      today.ts               secoesHoje(leads, hoje, meta)
      search.ts              busca sem acento e por dígitos
      stats.ts               funil e A/B
      *.test.ts
    sheets/
      client.ts              token JWT e fetch autenticado
      schema.ts              nomes das colunas, conversões de tipo
      leads-repo.ts          listLeads, updateLead, appendLeads, ensureColumns
    auth/
      session.ts             assinar e verificar cookie (HMAC)
    env.ts                   leitura e validação das variáveis (zod)
  proxy.ts                   exige sessão em tudo menos /login e /api/auth/*
scripts/
  check-sheet.ts             testa a conexão e lista as colunas encontradas
  migrate.ts                 cria colunas novas e preenche Place ID (idempotente)
  import.ts                  importa .xlsx de leads novos com dedupe
```

## 4. A planilha como banco

### 4.1 Mapeamento por cabeçalho
`leads-repo` lê a linha 1 e monta `{ nomeDaColuna: índice }`. Toda leitura e escrita usa esse mapa.
Coluna obrigatória ausente gera erro claro (`Coluna "Place ID" não encontrada. Rode npm run migrate.`).

### 4.2 Leitura
Uma chamada:
`GET /v4/spreadsheets/{id}/values/{aba}!A1:ZZ?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`

- Datas chegam como número serial (dias desde 1899-12-30) e são convertidas para `yyyy-MM-dd`.
- Os hyperlinks das colunas `Link atual` e `Google Maps` **não** vêm em `values`. Eles são lidos
  uma vez pela migração (Fase 2) e gravados como texto em `Place ID`. Para `Link atual`, a migração
  cria a coluna `URL atual` com a URL em texto puro. Depois disso, o app não precisa mais de
  `includeGridData`.
- Linhas sem `Empresa` são ignoradas.

### 4.3 Escrita
1. Ler só a coluna `Place ID` e achar a linha do lead. **Nunca** confiar em número de linha vindo
   do cliente: a planilha pode ter sido reordenada.
2. `POST values:batchUpdate` com `valueInputOption=RAW`, uma célula por campo alterado.
   Datas são gravadas como número serial, e a formatação `dd/MM/yyyy` da coluna cuida da exibição.
3. `Histórico` é lido na hora e concatenado no servidor (`atual · dd/MM evento`), nunca com o
   valor que o cliente tinha.
4. Devolver o lead relido.

### 4.4 Anexar (import)
`values:append` com `insertDataOption=INSERT_ROWS`, na ordem de colunas do cabeçalho atual.
Deduplicação por `Place ID` e por dígitos de telefone contra a planilha inteira, antes de anexar.

### 4.5 Cotas e desempenho
A Sheets API permite 300 leituras por minuto por projeto e 60 por minuto por usuário. O app faz:
1 leitura ao abrir e 2 chamadas por ação (ler a coluna Place ID e gravar). Com uso humano, fica
muito abaixo do limite. Sem cache no servidor. O cliente mantém a lista em memória e só refaz o
GET ao focar a aba de novo depois de 60 segundos (para pegar edições feitas direto na planilha).

### 4.6 Colunas que o app cria (migração idempotente)
`Place ID`, `URL atual`, `Histórico`, `Próx. ação`, `Toques`, `Variante`. Se o Apps Script antigo
já criou `Histórico`, `Próx. ação` e `Toques`, a migração reaproveita essas colunas.
A migração também aplica a validação de dados da coluna `Status` com a lista completa de status.

## 5. API

Todas as rotas exigem sessão (via proxy), exceto `/api/auth/*`. Respostas em JSON. Route handlers e proxy rodam em Node e são dinâmicos por padrão no Next 16 (sem `runtime` nem `dynamic` exportados; nada de `use cache` nas rotas).

| Rota | Entrada | Saída |
|---|---|---|
| `GET /api/leads` | nada | `{ leads: Lead[], hoje: 'yyyy-MM-dd' }` |
| `PATCH /api/leads/:placeId` | `{ acao: Acao }` | `{ lead: Lead }` |
| `POST /api/leads/import` | `{ linhas: NovaLinha[] }` | `{ inseridos, duplicados, ignorados }` |
| `POST /api/auth/login` | `{ senha }` | 204 + cookie |
| `POST /api/auth/logout` | nada | 204 |

`Acao` é uma união discriminada. **O servidor calcula o patch** a partir da ação e do estado atual
lido da planilha, usando `lib/domain/next-action.ts`. O cliente nunca manda "grave Toques = 2".

```ts
type Acao =
  | { tipo: 'enviei'; variante?: 'curta' | 'completa' }
  | { tipo: 'mudarStatus'; status: Status }
  | { tipo: 'revisar'; resultado: 'semResposta' | 'respostaAutomatica' | 'respondeu' | 'semInteresse' }
  | { tipo: 'pular'; motivo: string }
  | { tipo: 'salvarObs'; texto: string };
```

Erros: 401 sem sessão, 404 Place ID não encontrado, 409 quando o estado mudou e a ação não se
aplica mais (por exemplo, "enviei" num lead que já não está em A contatar), 502 quando o Google
falha. O cliente mostra o erro num toast e reverte a atualização otimista.

## 6. Autenticação

Um usuário, uma senha.
- `APP_PASSWORD` e `SESSION_SECRET` em variáveis de ambiente.
- Login compara com `crypto.timingSafeEqual` e espera 500 ms em caso de erro (freio simples contra
  força bruta).
- Cookie `lp_session` = `exp.assinaturaHMAC`, `HttpOnly`, `Secure`, `SameSite=Lax`, 30 dias.
- `src/proxy.ts` (o antigo middleware, que no Next 16 roda em Node) verifica a assinatura (Web Crypto) e redireciona para
  `/login` ou responde 401 nas rotas `/api`.
- Os dados são telefones de terceiros: **o app nunca pode ficar público**, nem em preview deploys.
  Os previews da Vercel usam as mesmas variáveis e passam pelo mesmo proxy.

## 7. Variáveis de ambiente

| Variável | Exemplo | Uso |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `leads-app@projeto.iam.gserviceaccount.com` | conta de serviço |
| `GOOGLE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | chave da conta (com `\n` escapados) |
| `SHEET_ID` | `1AbC...` | ID da planilha (trecho da URL) |
| `SHEET_TAB` | `Leads` | nome da aba |
| `APP_PASSWORD` | | senha de acesso |
| `SESSION_SECRET` | 32+ caracteres aleatórios | assinatura do cookie |
| `APP_TIMEZONE` | `America/Sao_Paulo` | cálculo de "hoje" |

`lib/env.ts` valida tudo com zod na inicialização e troca `\\n` por `\n` na chave.

## 8. WhatsApp no cliente

- **Copiar:** `navigator.clipboard.writeText`, que funciona porque o app roda em HTTPS no topo da
  página (sem iframe). Fallback com `textarea` e `execCommand('copy')`.
- **Abrir:** sem texto na URL (evita o corte de mensagens longas).
  - Web: `https://web.whatsapp.com/send?phone=55...`, numa janela nomeada `whatsapp` para
    reaproveitar a mesma aba.
  - App: `whatsapp://send?phone=55...`.
- A preferência web/app fica em `localStorage`, dentro de `try/catch`.

## 9. Testes

Vitest, cobrindo no mínimo:
- `next-action`: cada linha da tabela da PRODUCT-SPEC §5.2 e da §5.3
- `today`: montagem e ordem das seções, limite pela meta
- `messages`: as três variações da 1ª mensagem, plural do nicho, nota com vírgula, prova com
  menos de 5 avaliações
- `phone`: celular válido e fixo
- `schema`: conversão de serial para data e de volta, histórico concatenado
- `search`: acento, maiúsculas, dígitos do telefone

# prompts.md
### Sequência de construção: leads-prospect

> **Como usar este arquivo.** Cada fase tem um prompt pronto para colar na sessão do Claude.
> Rode **uma fase por vez**, valide o critério de pronto, commite você mesmo e só então avance.
> O Claude **nunca commita**: ao fim de cada fase, ele entrega a mensagem de commit pronta em
> Conventional Commits, sem `Co-Authored-By` e sem link de sessão.
> Não cole duas fases juntas: o resultado piora e o review fica impossível.
>
> **Antes de começar:** `README.md` e `CLAUDE.md` na raiz, os outros docs em `instructions/`. Os passos 0 a 7
> de `CONECTAR-PLANILHA.md` e o `.env.local` preenchido só são necessários a partir da Fase 2.

---

## Fase 0: leitura e scaffold

**Objetivo:** projeto Next.js rodando, com as ferramentas configuradas e nenhuma tela ainda.

```
Leia CLAUDE.md, PRODUCT-SPEC.md, ARCHITECTURE.md e DESIGN-GUIDELINES.md por inteiro antes de
escrever qualquer código. Depois, me devolva em até 10 linhas o que você entendeu do produto e
qualquer ponto ambíguo ou contraditório entre os documentos. Só então siga.

Crie o scaffold:
- Next.js 16 com App Router, TypeScript strict, src/, Tailwind CSS v4, ESLint.
- Dependências: google-auth-library, zod, exceljs. Dev: vitest, @vitest/coverage-v8, tsx.
- Scripts no package.json: dev, build, start, lint, typecheck (tsc --noEmit), test (vitest run),
  check:sheet, migrate, import (os três últimos com tsx apontando para scripts/*.ts, que por enquanto
  só imprimem "não implementado").
- Estrutura de pastas exatamente como ARCHITECTURE.md §3, com arquivos vazios ou stubs tipados
  onde fizer sentido. Não implemente lógica.
- .env.example com as 7 variáveis de ARCHITECTURE.md §7, sem valores reais.
- .gitignore incluindo .env*.local, *service-account*.json e *.xlsx.
- src/lib/env.ts validando as variáveis com zod e convertendo \\n da GOOGLE_PRIVATE_KEY.
  Em desenvolvimento, uma variável faltando gera erro com o nome dela.

Rode lint, typecheck e build e me mostre o resultado. Não crie nenhuma tela além da página padrão.
```

**Pronto quando:** `npm run dev` sobe, `lint`, `typecheck` e `build` passam, e a estrutura de pastas
bate com a arquitetura.

---

## Fase 1: tokens, fontes e /styleguide

```
Implemente o sistema visual seguindo DESIGN-GUIDELINES.md §3, §4, §5 e §6.

1. src/app/globals.css: todos os tokens de cor da §3 (do site e de estado) no @theme do Tailwind
   v4, com nomes de PAPEL exatamente como no documento. Nenhum hex fora deste arquivo.
2. Fontes em app/layout.tsx com next/font/google: Schibsted Grotesk (400, 500, 600, 700) e
   JetBrains Mono (400, 500), subsets latin e latin-ext, display swap, expostas como
   --font-sans e --font-mono.
3. Escala tipográfica da §4 como utilitários (text-display, text-title, text-body, text-small,
   text-label, text-micro). Classe de ênfase com sublinhado accent de 0.09em.
4. Componentes de src/components/ui/: Button (primary, confirm, secondary, ghost), Chip,
   Pill (por status, conforme a tabela "Status → pill"), Segmented, Kbd, Kicker. Todos tipados,
   com foco visível usando o anel accent.
5. Página /styleguide (só renderiza em desenvolvimento) com: paleta e o ratio de contraste de cada
   par da §3 calculado em runtime, a escala tipográfica inteira, todos os botões, chips, pills
   dos 8 status, segmentado e kbd.

Compare o resultado com https://douglastertuliano.vercel.app/ (cores, peso dos títulos, kicker
mono, cantos). Me mostre screenshots do /styleguide em 1280px e 390px.
```

**Pronto quando:** o `/styleguide` parece da mesma família do site e nenhum hex aparece fora de
`globals.css`.

---

## Fase 2: conexão com a planilha, check e migração

> Faça antes os passos 0 a 7 de `CONECTAR-PLANILHA.md`.

```
Implemente o acesso à planilha seguindo ARCHITECTURE.md §4 e PRODUCT-SPEC.md §4.

1. src/lib/sheets/client.ts: token via JWT da google-auth-library (escopo
   https://www.googleapis.com/auth/spreadsheets), com fetch autenticado para a Sheets API v4 e
   erros traduzidos (403, 404, aba inexistente, documento .xlsx) com a mensagem da tabela de
   "Problemas comuns" de CONECTAR-PLANILHA.md.
2. src/lib/sheets/schema.ts: nomes das colunas como constantes, conversão serial ↔ yyyy-MM-dd
   (base 1899-12-30), parse e montagem do Histórico (" · ", "dd/MM evento").
3. src/lib/sheets/leads-repo.ts com:
   - listLeads(): lê A1:ZZ com UNFORMATTED_VALUE e SERIAL_NUMBER, mapeia por cabeçalho,
     ignora linhas sem Empresa, devolve Lead[] tipado (tipos em lib/domain/types.ts).
   - updateLead(placeId, campos): acha a linha relendo só a coluna Place ID, grava com
     values:batchUpdate RAW, concatena o Histórico no servidor e devolve o lead relido.
   - appendLeads(linhas): por enquanto um stub tipado.
   - ensureColumns(): usada pela migração.
4. scripts/check-sheet.ts: imprime exatamente o formato do passo 8 de CONECTAR-PLANILHA.md.
5. scripts/migrate.ts (idempotente): cria as colunas Place ID, URL atual, Histórico, Próx. ação,
   Toques e Variante que faltarem, no fim, copiando a formatação do cabeçalho; reaproveita as que
   o Apps Script já criou. Lê os hyperlinks de "Google Maps" e "Link atual" com
   spreadsheets.get + includeGridData (só essas colunas) e preenche Place ID (extraído de
   place_id:XXXX) e URL atual. Aplica a validação de dados da coluna Status com os 8 status.
   Formata Data contato e Próx. ação como dd/MM/yyyy. Imprime um resumo do que mudou.
6. Testes em schema.test.ts.

Rode npm run check:sheet, me mostre a saída e PARE. Eu rodo o migrate depois de conferir.
```

**Pronto quando:** `check:sheet` lista as colunas certas, `migrate` roda duas vezes seguidas sem
mudar nada na segunda, e `Place ID` está preenchido nas 245 linhas.

---

## Fase 3: lógica de domínio (sem interface)

```
Implemente src/lib/domain/ como funções puras, seguindo PRODUCT-SPEC.md §4.2, §5, §6, §7.3,
§7.4 e §7.7.

- dates.ts: hoje(timezone) devolvendo yyyy-MM-dd em America/Sao_Paulo, addDias, fmt dd/MM.
- phone.ts: digits, celular (13 dígitos, começa com 55, quinto dígito 9).
- messages.ts: TODAS as mensagens da §6 com a copy EXATA (copie do documento, não reescreva),
  plural de nicho, nota com vírgula, as três variações da 1ª mensagem, respostas rápidas.
- next-action.ts: proximaAcao(lead) devolvendo { tipo, titulo, sub, texto? } e
  aplicarAcao(lead, acao, hoje) devolvendo o patch de campos (status, toques, proxAcao,
  dataContato, variante, eventoHistorico). Cobre a tabela §5.2 inteira, a §5.3 (revisar),
  mudança manual de status e pular. Ação que não se aplica ao estado atual lança um erro tipado
  AcaoInvalida (vira 409 na API).
- today.ts: secoesHoje(leads, hoje, meta, enviadosHoje) na ordem e com os filtros da §7.4.
- search.ts: buscar(leads, termo) sem acento, sem diferenciar maiúsculas, e por dígitos do
  telefone a partir de 3 dígitos.
- stats.ts: funil por status e A/B por variante (§7.7).

Testes com Vitest: uma asserção por linha das tabelas §5.2 e §5.3, as seções do Hoje com um
conjunto de leads de exemplo, as mensagens (snapshot de texto para cada situação), busca e
celular. Mostre a cobertura de lib/domain (meta: acima de 90%).
```

**Pronto quando:** `npm test` passa e a cobertura de `lib/domain` fica acima de 90%.

---

## Fase 4: autenticação

```
Implemente a autenticação de usuário único seguindo ARCHITECTURE.md §6.

- lib/auth/session.ts: criar e verificar o cookie lp_session (exp.assinatura) com HMAC-SHA256 via
  Web Crypto (roda no proxy e nas rotas).
- POST /api/auth/login: valida com zod, compara com timingSafeEqual, espera 500ms quando errar,
  grava o cookie HttpOnly, Secure (exceto em localhost), SameSite=Lax, 30 dias.
- POST /api/auth/logout.
- src/proxy.ts: libera /login, /api/auth/*, /_next e arquivos estáticos; nas outras rotas de
  página redireciona para /login?next=...; nas rotas /api responde 401 JSON.
- app/login/page.tsx: campo de senha único, no visual do DESIGN-GUIDELINES (kicker
  "00 / acesso", título com a palavra-ênfase, botão primary), mensagem de erro clara.
- Testes de session.ts (assinatura válida, expirada, adulterada).

Teste manualmente: sem cookie → /login; senha errada → erro; senha certa → /.
```

**Pronto quando:** nenhuma rota além do login responde sem sessão, inclusive `/api/leads`.

---

## Fase 5: API

```
Implemente as rotas de ARCHITECTURE.md §5.

- GET /api/leads → { leads, hoje } (hoje calculado no servidor, no APP_TIMEZONE).
- PATCH /api/leads/[placeId] com body Acao validado por zod (união discriminada). O servidor:
  1) lê o lead atual na planilha, 2) calcula o patch com aplicarAcao, 3) grava com updateLead,
  4) devolve { lead }. AcaoInvalida → 409 com mensagem; placeId inexistente → 404; falha do
  Google → 502 com a mensagem traduzida.
- POST /api/leads/import fica para a Fase 9 (deixe a rota respondendo 501).
- Nenhuma resposta em cache: no Next 16 com Cache Components, as rotas já são dinâmicas e em Node
  por padrão. Não exporte runtime nem dynamic, e não use "use cache".

Escreva um teste de integração para o PATCH com o leads-repo mockado (enviei em A contatar,
enviei em lead que já mudou de status → 409, mudarStatus, revisar, salvarObs).
Depois teste contra a planilha real em UM lead que você escolher comigo, e reverta à mão.
```

**Pronto quando:** testes passam e uma ação real aparece na planilha com Status, Toques,
Próx. ação e Histórico corretos.

---

## Fase 6: shell, lista, aba Hoje e busca

```
Monte a interface principal seguindo PRODUCT-SPEC.md §7.2, §7.3, §7.4, §7.6 e
DESIGN-GUIDELINES.md §5, §6 e §7.

- hooks/use-leads.ts: carrega GET /api/leads com timeout de 20s, guarda a lista em memória e
  expõe aplicar(placeId, acao) com atualização OTIMISTA (usando aplicarAcao do domínio),
  substituindo pelo lead devolvido pela API e revertendo com toast em erro. Recarrega ao focar a
  aba se o último carregamento tiver mais de 60s.
- Header fixo: marca "Douglas Tertuliano / prospecção" (o "/ prospecção" em mono ink-muted),
  busca com atalho "/", contador "hoje X/Y novos" (meta em localStorage, padrão 25).
- Abas Hoje, Todos, Números com contagem em mono e borda inferior accent na ativa.
- Lista: cabeçalhos de seção do Hoje, item da lista conforme §5 do DESIGN-GUIDELINES, filtro por
  status e paginação de 60 em Todos.
- Busca substitui a lista enquanto houver termo; Esc limpa.
- Layout em duas colunas no desktop e uma no mobile (< 860px), com o detalhe ainda como
  placeholder ("Escolha um lead na lista").
- Estados de carregando (skeleton), erro (com "Tentar de novo") e Hoje vazio.

Teste com os dados reais. Me mostre screenshots em 1280px e 390px da aba Hoje e de uma busca
por 4 dígitos de telefone.
```

**Pronto quando:** a aba Hoje mostra as seções certas com os dados reais, e a busca acha um lead
pelo final do telefone.

**⚠️ Faça um passe visual REAL** ao fim desta fase. Se a lista parecer um dashboard genérico
(cards com sombra, muito espaço, ícones), está fora do padrão do site.

---

## Fase 7: detalhe do lead e ações

```
Implemente o detalhe do lead seguindo PRODUCT-SPEC.md §7.5 e §7.8 e ARCHITECTURE.md §8.

- Cabeçalho: kicker mono "linha N / nicho / prioridade x", h1, linha de informações, links
  externos ("Google Maps ↗", "Link atual ↗") em nova aba.
- Chips de status com aria-pressed, chamando aplicar com mudarStatus.
- Bloco "próxima ação" a partir de proximaAcao(lead):
  - texto numa textarea editável; segmentado curta | completa só na 1ª mensagem (lembrado em
    localStorage);
  - "Copiar e abrir WhatsApp" (C): copia o texto ATUAL da textarea e abre o chat sem texto na URL,
    web ou app conforme o segmentado "abrir no" (lembrado em localStorage); toast "Mensagem
    copiada: cole com Ctrl+V";
  - "Enviei" (E): aplica { tipo: 'enviei', variante } e seleciona o próximo item da MESMA fila
    do Hoje (o que estava logo abaixo);
  - "Pular" com motivo (só em A contatar);
  - sem celular: "Copiar mensagem" e abrir a URL atual (DM no Instagram);
  - modo revisar: os 4 botões da §5.3 e "Abrir o chat".
- Respostas rápidas (copiar com um clique) nos status da §6.
- Observações com Salvar; histórico do mais recente para o mais antigo.
- Atalhos J/K, C, E, / e Esc, que não disparam com foco em campos de texto.
- No mobile, "← Lista" volta para a lista mantendo a rolagem.

Teste o fluxo completo num lead real (combine comigo qual): 1ª mensagem → Enviei → conferir a
planilha. Depois faça um passe visual em 1280px e 390px.
```

**Pronto quando:** dá para processar 5 leads seguidos só com o teclado (`C`, colar no WhatsApp,
`E`), e cada envio aparece certo na planilha.

---

## Fase 8: Números

```
Implemente a aba Números seguindo PRODUCT-SPEC.md §7.7, usando lib/domain/stats.ts.

- Kicker "03 / números", funil por status com barra fina em accent proporcional ao maior valor,
  números em mono alinhados à direita.
- Resumo: contatados, conversas reais e %, respostas automáticas.
- Tabela do teste A/B por variante com o aviso sobre amostra mínima.
- Campo da meta diária.
Sem biblioteca de gráficos. Passe visual em 1280px e 390px.
```

**Pronto quando:** os números batem com uma contagem manual feita na planilha (filtro por Status).

---

## Fase 9: importação de novos leads

```
Implemente a entrada de novas levas seguindo PRODUCT-SPEC.md §8 e ARCHITECTURE.md §4.4.

- lib/domain: normalizarLinha (valida com zod as colunas obrigatórias: Empresa, Telefone ou
  URL atual, Place ID, Situação, Nicho, Cidade, UF) e dedupe por Place ID e por dígitos de
  telefone, tanto contra a planilha quanto dentro do próprio lote.
- leads-repo.appendLeads: values:append INSERT_ROWS na ordem do cabeçalho atual, com Status
  "A contatar" e Toques 0.
- POST /api/leads/import com { linhas } → { inseridos, duplicados, ignorados: [{ empresa, motivo }] }.
- scripts/import.ts: lê um .xlsx gerado pela skill prospeccao-google-maps (aba Leads, colunas da
  §4, extraindo o place_id do hyperlink de "Google Maps" se a coluna Place ID não existir) e chama
  o repo diretamente. Flag --dry-run mostra o que entraria sem gravar.
- Testes de dedupe.

Teste com --dry-run num arquivo com 3 leads novos e 2 repetidos.
```

**Pronto quando:** o `--dry-run` reporta 3 inseridos e 2 duplicados, e a importação real anexa só
os 3 no fim da planilha.

---

## Fase 10: deploy na Vercel

```
Prepare o deploy seguindo CONECTAR-PLANILHA.md passo 9.

- Confira que nada de credencial vaza no bundle do cliente (procure por GOOGLE_ e APP_PASSWORD
  no output de .next/static).
- Headers de segurança em next.config: X-Frame-Options DENY, Referrer-Policy
  strict-origin-when-cross-origin, X-Content-Type-Options nosniff, e noindex
  (robots: X-Robots-Tag noindex, nofollow) em todas as rotas.
- app/robots.ts bloqueando tudo.
- Me passe o checklist do que eu preciso cadastrar na Vercel e como testar o deploy.
```

**Pronto quando:** o deploy de produção abre o login, a lista carrega os dados reais e uma ação
grava na planilha.

---

## Fase 11: revisão final

```
Faça uma revisão do projeto inteiro, como um segundo revisor que não escreveu o código:

1. Releia PRODUCT-SPEC.md e liste cada requisito com: atendido, parcial ou faltando.
2. Confira a copy das mensagens contra a §6, palavra por palavra.
3. Procure travessões (—) em qualquer texto da interface e das mensagens.
4. Procure hex fora de globals.css.
5. Confira acessibilidade conforme DESIGN-GUIDELINES.md §9 (teclado, foco, aria).
6. Passe visual em 1280px e 390px de: login, Hoje, detalhe em cada tipo de próxima ação,
   revisar, busca, Todos, Números, erro de carregamento.

Me entregue a lista de problemas por gravidade, sem corrigir ainda.
```

**Pronto quando:** a lista de problemas está zerada ou cada item restante tem uma decisão
registrada.
